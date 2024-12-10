const express = require("express");
const db = require("../database/db");
const { authenticateToken, isAdmin } = require("../authentication/middleware");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const router = express.Router();
require("dotenv").config(); // Load environment variables

// Google Drive Setup
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure proper newlines in private_key
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
  }
});

const drive = google.drive({ version: "v3", auth });

// Multer Setup for File Uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.resolve(__dirname, "./uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type, only PDFs are allowed!"), false);
    }
  },
});

// Sanitize Table Name Helper
const sanitizeTableName = (table) => {
  const validTables = ["authors", "category", "keywords"];
  if (!validTables.includes(table)) {
    console.error(`Invalid table name: ${table}`);
    throw new Error("Invalid table name");
  }
  return table;
};

// File Upload Route
router.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file ? path.resolve(__dirname, `./uploads/${req.file.filename}`) : null;

  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    // Extract form data
    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;
    const fileName = req.file.filename;

    // Validate uploader ID
    if (!uploader_id || isNaN(uploader_id)) throw new Error("Invalid uploader ID!");

    // Fetch uploader info and validate role
    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) throw new Error("Uploader not found!");
    const role_id = uploader[0].role_id;
    const status = role_id === 1 ? "approved" : "pending";

    // Check for duplicate title in database
    const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument.length > 0) throw new Error("Document with this title already exists!");

    // Ensure file exists before uploading to Google Drive
    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
      throw new Error("Invalid file path: File does not exist or is a directory");
    }

    // Google Drive upload metadata
    const fileMetadata = {
      name: fileName,
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID || '1z4LekckQJPlZbgduf5FjDQob3zmtAElc' // Default folder if not set
    };
    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath),
    };

    // Upload file to Google Drive
    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, name",
    });

    const driveFileId = driveResponse.data.id;

    // Insert research metadata into database
    const [result] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, drive_file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [title, abstract, fileName, uploader_id, status, driveFileId] // Store Google Drive file ID in the database
    );
    const researchId = result.insertId;

    // Insert authors, categories, and keywords into respective tables
    const insertEntities = async (entities, table, columnName) => {
      const sanitizedTable = sanitizeTableName(table);
      const names = entities.split(",").map((name) => name.trim());
      for (const name of names) {
        let [entity] = await db.query(`SELECT ${columnName} FROM ${sanitizedTable} WHERE ${sanitizedTable.slice(0, -1)}_name = ?`, [name]);
        if (entity.length === 0) {
          const [result] = await db.query(`INSERT INTO ${sanitizedTable} (${sanitizedTable.slice(0, -1)}_name) VALUES (?)`, [name]);
          entity = { [columnName]: result.insertId };
        } else {
          entity = entity[0];
        }
        const joinTable = `research_${sanitizedTable}`;
        await db.query(`INSERT INTO ${joinTable} (research_id, ${columnName}) VALUES (?, ?)`, [researchId, entity[columnName]]);
      }
    };

    // Insert entities for authors, categories, and keywords
    await insertEntities(authors, "authors", "author_id");
    await insertEntities(categories, "category", "category_id");
    await insertEntities(keywords, "keywords", "keyword_id");

    // Clean up the local uploaded file after successful upload
    fs.unlinkSync(filePath);

    // Respond with success message and Drive file ID
    res.status(201).json({ message: "Document Uploaded Successfully", driveFileId });
  } catch (error) {
    console.error("Error Uploading Document:", error);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Clean up the file in case of error
    }
    res.status(500).json({ error: error.message || "Failed to upload document!" });
  }
});

module.exports = router;
