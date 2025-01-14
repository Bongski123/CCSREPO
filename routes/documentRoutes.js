const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require("stream");
const db = require("../database/db");
const axios = require("axios");

const router = express.Router();

// Google Drive service account configuration (loaded from environment variables)
const googleServiceAccount = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
};

const auth = new google.auth.GoogleAuth({
  credentials: googleServiceAccount,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// Multer setup for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to convert a buffer to a stream
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// Endpoint to upload a research document
router.post("/upload", upload.single("file"), async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Validate file type
    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;

    // Validate required fields
    if (!authors || !categories || !keywords) {
      return res.status(400).json({ error: "Authors, categories, and keywords are required!" });
    }

    // Process authors, categories, and keywords
    const authorList = authors.split(",").map((author) => {
      const match = author.match(/^(.+?)\s?\(([^)]+)\)$/);
      if (!match) return null;
      const [, author_name, email] = match;
      return { author_name: author_name.trim(), email: email.trim() };
    }).filter((author) => author !== null);

    const categoryList = categories.split(",").map((name) => name.trim());
    const keywordList = keywords.split(",").map((name) => name.trim());

    // Upload file to Google Drive
    const fileMetadata = { name: req.file.originalname, parents: [process.env.DRIVE_FOLDER_ID] };
    const media = { mimeType: req.file.mimetype, body: bufferToStream(req.file.buffer) };
    const driveResponse = await drive.files.create({ resource: fileMetadata, media, fields: "id" });
    const fileId = driveResponse.data.id;

    // Validate uploader ID
    if (!uploader_id || isNaN(uploader_id)) {
      return res.status(400).json({ error: "Invalid uploader ID!" });
    }

    // Check uploader role
    const [[uploader]] = await connection.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (!uploader) return res.status(404).json({ error: "Uploader not found!" });

    const status = uploader.role_id === 1 ? "approved" : "pending";

    // Check for duplicate title
    const [[existingDocument]] = await connection.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument) return res.status(409).json({ error: "Document with this title already exists!" });

    // Begin MySQL transaction
    await connection.beginTransaction();

    // Insert research record
    const [result] = await connection.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [title, abstract, req.file.originalname, uploader_id, status, fileId]
    );
    const researchId = result.insertId;

    // Handle authors, categories, and keywords
    if (authorList.length > 0) {
      const authorInserts = authorList.map(({ author_name, email }) => [author_name, email]);
      await connection.query(
        `INSERT INTO authors (author_name, email) VALUES ? 
         ON DUPLICATE KEY UPDATE author_id=LAST_INSERT_ID(author_id)`,
        [authorInserts]
      );
      const [authorRecords] = await connection.query("SELECT author_id FROM authors WHERE email IN (?)", [
        authorList.map(({ email }) => email),
      ]);
      const authorRelations = authorRecords.map(({ author_id }) => [researchId, author_id]);
      await connection.query("INSERT INTO research_authors (research_id, author_id) VALUES ?", [authorRelations]);
    }

    if (categoryList.length > 0) {
      const categoryInserts = categoryList.map((name) => [name]);
      await connection.query(
        `INSERT INTO category (category_name) VALUES ? 
         ON DUPLICATE KEY UPDATE category_id=LAST_INSERT_ID(category_id)`,
        [categoryInserts]
      );
      const [categoryRecords] = await connection.query("SELECT category_id FROM category WHERE category_name IN (?)", [
        categoryList,
      ]);
      const categoryRelations = categoryRecords.map(({ category_id }) => [researchId, category_id]);
      await connection.query("INSERT INTO research_categories (research_id, category_id) VALUES ?", [categoryRelations]);
    }

    if (keywordList.length > 0) {
      const keywordInserts = keywordList.map((name) => [name]);
      await connection.query(
        `INSERT INTO keywords (keyword_name) VALUES ? 
         ON DUPLICATE KEY UPDATE keyword_id=LAST_INSERT_ID(keyword_id)`,
        [keywordInserts]
      );
      const [keywordRecords] = await connection.query("SELECT keyword_id FROM keywords WHERE keyword_name IN (?)", [
        keywordList,
      ]);
      const keywordRelations = keywordRecords.map(({ keyword_id }) => [researchId, keyword_id]);
      await connection.query("INSERT INTO research_keywords (research_id, keyword_id) VALUES ?", [keywordRelations]);
    }

    // Commit transaction
    await connection.commit();

    // Prepare data for restDB
    const restDBData = {
      title,
      abstract,
      authors: authorList,
      categories: categoryList,
      keywords: keywordList,
      fileId,
      status,
      uploader_id,
      publish_date: new Date().toISOString(),
    };

    // Post data to restDB
    const restDBResponse = await axios.post("https://www-ccsnexus-3c3f.restdb.io/restdb-research", restDBData, {
      headers: {
        "Content-Type": "application/json",
        "x-apikey": '10de4bbb0fbd2a5ddd74f21ff76bae188fc02', // API key from environment variables
      },
    });

    if (restDBResponse.status === 201) {
      res.status(201).json({ message: "Research uploaded successfully to MySQL and restDB!" });
    } else {
      throw new Error("Failed to post data to restDB.");
    }
  } catch (err) {
    await connection.rollback();
    console.error("Error uploading research:", err);
    res.status(500).json({ error: "An error occurred while uploading the research" });
  } finally {
    connection.release();
  }
});

// Endpoint to delete a research document
router.delete("/delete-research/:research_id", async (req, res) => {
  const { research_id } = req.params;

  if (!research_id) {
    return res.status(400).json({ message: "Research ID is required." });
  }

  try {
    const [result] = await db.query("DELETE FROM researches WHERE research_id = ?", [research_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Research not found." });
    }

    res.status(200).json({ message: "Research and associated records deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while deleting the research." });
  }
});

module.exports = router;
