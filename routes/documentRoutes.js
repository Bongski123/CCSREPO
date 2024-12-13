const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require('stream');
const db = require("../database/db");

const router = express.Router();

// Google Drive API setup using service account credentials
const googleServiceAccount = {
  type: "service_account",
  project_id: "ccsrepository-444308",
  private_key_id: "ad95bb0e9b7b40f9b43b2dd9dc33cc3eb925bce9",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVgISVob0EV2BE
T0NXxB6R/TCLwgZzGG3ivK7uzoIJoGQPKLSkABLu0/3GNdwMx4ZEOOsEr+EMyUhp
... (private key truncated for security)
`,
  client_email: "ccsrepo@ccsrepository-444308.iam.gserviceaccount.com",
  client_id: "103197742225204345135",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ccsrepo%40ccsrepository-444308.iam.gserviceaccount.com",
};

const auth = new google.auth.GoogleAuth({
  credentials: googleServiceAccount, // Using credentials object directly
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper to create a readable stream from a buffer
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// Upload route for research files
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;

    // Validate input fields
    if (!authors) return res.status(400).json({ error: "Authors are required!" });
    if (!categories) return res.status(400).json({ error: "Categories are required!" });
    if (!keywords) return res.status(400).json({ error: "Keywords are required!" });

    const authorList = authors ? authors.split(',').map(name => name.trim()) : [];
    const categoryList = categories ? categories.split(',').map(name => name.trim()) : [];
    const keywordList = keywords ? keywords.split(',').map(name => name.trim()) : [];

    // Upload file to Google Drive
    const fileMetadata = {
      name: req.file.originalname, // Use the original file name
      parents: ["1z4LekckQJPlZbgduf5FjDQob3zmtAElc"], // Replace with your folder ID
    };
    const media = {
      mimeType: req.file.mimetype,
      body: bufferToStream(req.file.buffer),
    };

    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id",
    });

    const fileId = driveResponse.data.id;

    // Validate uploader_id
    if (!uploader_id || isNaN(uploader_id)) {
      return res.status(400).json({ error: "Invalid uploader ID!" });
    }

    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) {
      return res.status(404).json({ error: "Uploader not found!" });
    }

    const role_id = uploader[0].role_id;

    // Insert the new research record into the database
    const [result] = await db.query(
      "INSERT INTO researches (title, abstract, filename, uploader_id, status) VALUES (?, ?, ?, ?, ?)",
      [title, abstract, fileId, uploader_id, 'pending'] // Assuming 'pending' as the initial status
    );

    const research_id = result.insertId;

    // Add categories, keywords, and authors
    if (categoryList.length > 0) {
      const categoryValues = categoryList.map(category => [research_id, categories]);
      await db.query("INSERT INTO research_categories (research_id, category_id) VALUES ?", [categoryValues]);
    }

    if (keywordList.length > 0) {
      const keywordValues = keywordList.map(keyword => [research_id, keywords]);
      await db.query("INSERT INTO research_keywords (research_id, keyword_id) VALUES ?", [keywordValues]);
    }

    if (authorList.length > 0) {
      const authorValues = authorList.map(author => {
        const [author_name, email] = author.split(';').map(str => str.trim());
        return [author_name, email];
      });
      await db.query("INSERT INTO authors (author_name, email) VALUES ?", [authorValues]);

      // Link authors to research
      const [authorsRows] = await db.query(
        "SELECT author_id FROM authors WHERE email IN (?)",
        [authorList.map(author => author.split(';')[1].trim())]
      );
      const authorResearchValues = authorsRows.map(row => [research_id, row.author_id]);
      await db.query("INSERT INTO research_authors (research_id, author_id) VALUES ?", [authorResearchValues]);
    }

    res.status(200).json({ message: "Research uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload research file!" });
  }
});

// DELETE research and associated records
router.delete('/delete-research/:research_id', async (req, res) => {
  const researchId = req.params.research_id;

  if (!researchId) {
    return res.status(400).json({ message: 'Research ID is required.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const queries = [
      'DELETE FROM research_categories WHERE research_id = ?',
      'DELETE FROM search_logs WHERE research_id = ?',
      'DELETE FROM collections WHERE research_id = ?',
      'DELETE FROM notifications WHERE research_id = ?',
      'DELETE FROM research_keywords WHERE research_id = ?',
      'DELETE FROM research_authors WHERE research_id = ?'
    ];

    for (const query of queries) {
      await connection.execute(query, [researchId]);
    }

    const deleteResearchQuery = 'DELETE FROM researches WHERE research_id = ?';
    await connection.execute(deleteResearchQuery, [researchId]);

    await connection.commit();
    res.status(200).json({ message: 'Research and associated records deleted successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the research.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
