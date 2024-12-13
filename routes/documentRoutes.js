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
  private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvwIBADAN...\n-----END PRIVATE KEY-----`,
  client_email: "ccsrepo@ccsrepository-444308.iam.gserviceaccount.com",
  client_id: "103197742225204345135",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ccsrepo%40ccsrepository-444308.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

const auth = new google.auth.GoogleAuth({
  credentials: googleServiceAccount,
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

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;

    const fileMetadata = {
      name: req.file.originalname,
      parents: ["1z4LekckQJPlZbgduf5FjDQob3zmtAElc"],
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

    if (!uploader_id || isNaN(uploader_id)) {
      return res.status(400).json({ error: "Invalid uploader ID!" });
    }

    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) {
      return res.status(404).json({ error: "Uploader not found!" });
    }

    const role_id = uploader[0].role_id;
    let status = role_id === 1 ? "approved" : "pending";

    const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument.length > 0) {
      return res.status(409).json({ error: "Document with this title already exists!" });
    }

    const [result] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)", 
      [title, abstract, req.file.originalname, uploader_id, status, fileId]
    );

    const researchId = result.insertId;

    const insertData = async (researchId, data, table, column, joinTable, joinColumn) => {
      const names = data.split(',').map(name => name.trim());
      for (const name of names) {
        let [entry] = await db.query(`SELECT ${column} FROM ${table} WHERE ${column}_name = ?`, [name]);
        if (entry.length === 0) {
          const [result] = await db.query(`INSERT INTO ${table} (${column}_name) VALUES (?)`, [name]);
          entry = { [column]: result.insertId };
        } else {
          entry = entry[0];
        }
        await db.query(`INSERT INTO ${joinTable} (research_id, ${joinColumn}) VALUES (?, ?)`, [researchId, entry[column]]);
      }
    };

    await insertData(researchId, authors, "authors", "author_id", "research_authors", "author_id");
    await insertData(researchId, categories, "category", "category_id", "research_categories", "category_id");
    await insertData(researchId, keywords, "keywords", "keyword_id", "research_keywords", "keyword_id");

    res.status(201).json({ message: "Document Uploaded Successfully", fileId });
  } catch (error) {
    console.error("Error Upload Document:", error);
    res.status(500).json({ error: "Upload Document Endpoint Error!" });
  }
});

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

    await connection.execute('DELETE FROM researches WHERE research_id = ?', [researchId]);

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
