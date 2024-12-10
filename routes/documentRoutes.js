const express = require("express");
const db = require("../database/db");
const {
  authenticateToken,
  isAdmin,
  isNCFUser,
  isNotNCFUser,
} = require("../authentication/middleware");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const router = express.Router();


// Google Drive configuration
const KEYFILEPATH = path.resolve(__dirname, "../config/service-account.json"); // Replace with your service account key file path
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});
const drive = google.drive({ version: "v3", auth });

// Configure multer for file uploads
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

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;
    const filePath = path.resolve(__dirname, `./uploads/${req.file.filename}`);
    const fileName = req.file.filename;

    // Validate uploader_id
    if (!uploader_id || isNaN(uploader_id)) {
      return res.status(400).json({ error: "Invalid uploader ID!" });
    }

    // Check the role of the uploader
    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) {
      return res.status(404).json({ error: "Uploader not found!" });
    }

    const role_id = uploader[0].role_id;
    let status = role_id === 1 ? "approved" : "pending";

    // Check if title already exists
    const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument.length > 0) {
      return res.status(409).json({ error: "Document with this title already exists!" });
    }

    // Upload the file to Google Drive
    const fileMetadata = {
      name: fileName,
      parents: ["1z4LekckQJPlZbgduf5FjDQob3zmtAElc"], // Replace with the folder ID from your Google Drive
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

    console.log(`File uploaded to Google Drive: ${driveFileId}`);

    // Insert research metadata into the database
    const [result] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, drive_file_id, status) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [title, abstract, fileName, uploader_id, driveFileId, status]
    );

    const researchId = result.insertId;

    // Insert authors, categories, and keywords
    const insertEntities = async (researchId, entities, table, columnName) => {
      const names = entities.split(",").map(name => name.trim());
      for (const name of names) {
        let [entity] = await db.query(`SELECT ${columnName} FROM ${table} WHERE ${table.slice(0, -1)}_name = ?`, [name]);
        if (entity.length === 0) {
          const [result] = await db.query(`INSERT INTO ${table} (${table.slice(0, -1)}_name) VALUES (?)`, [name]);
          entity = { [columnName]: result.insertId };
        } else {
          entity = entity[0];
        }
        const joinTable = `research_${table}`;
        await db.query(`INSERT INTO ${joinTable} (research_id, ${columnName}) VALUES (?, ?)`, [researchId, entity[columnName]]);
      }
    };

    await insertEntities(researchId, authors, "authors", "author_id");
    await insertEntities(researchId, categories, "category", "category_id");
    await insertEntities(researchId, keywords, "keywords", "keyword_id");

    // Clean up: Delete local file
    fs.unlinkSync(filePath);

    res.status(201).json({ message: "Document Uploaded Successfully", driveFileId });
  } catch (error) {
    console.error("Error Upload Document:", error);
    res.status(500).json({ error: "Failed to upload document!" });
  }
});

module.exports = router;
