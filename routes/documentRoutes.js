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
// Google Drive Setup
const KEYFILEPATH = path.resolve(__dirname, "../service-account.json"); // Adjusted path for JSON file
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEYFILEPATH;

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});
const drive = google.drive({ version: "v3", auth });


// Configure Multer for File Uploads
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
    if (!req.file) {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;
    const fileName = req.file.filename;

    if (!uploader_id || isNaN(uploader_id)) throw new Error("Invalid uploader ID!");

    // Validate uploader role
    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) throw new Error("Uploader not found!");
    const role_id = uploader[0].role_id;
    const status = role_id === 1 ? "approved" : "pending";

    // Check for duplicate title
    const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument.length > 0) throw new Error("Document with this title already exists!");

    // Upload to Google Drive
    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
      throw new Error("Invalid file path: File does not exist or is a directory");
    }

    const fileMetadata = {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || '1z4LekckQJPlZbgduf5FjDQob3zmtAElc'],
    };
    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath),
    };

    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, name",
    });

    const driveFileId = driveResponse.data.id;

    // Insert Metadata into Database
    const [result] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, drive_file_id, status) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [title, abstract, fileName, uploader_id, driveFileId, status]
    );

    const researchId = result.insertId;

    // Insert Authors, Categories, and Keywords
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

    await insertEntities(authors, "authors", "author_id");
    await insertEntities(categories, "category", "category_id");
    await insertEntities(keywords, "keywords", "keyword_id");

    // Clean up local file
    fs.unlinkSync(filePath);

    res.status(201).json({ message: "Document Uploaded Successfully", driveFileId });
  } catch (error) {
    console.error("Error Uploading Document:", error);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Cleanup local file
    }
    res.status(500).json({ error: error.message || "Failed to upload document!" });
  }
});

module.exports = router;
