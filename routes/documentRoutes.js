const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const db = require("../database/db");

const router = express.Router();

// Google Drive API setup using service account
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "../config/service-account-key.json"), // Path to your service account key
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

        // Upload file to Google Drive
        const fileMetadata = {
            name: `${Date.now()}-${req.file.originalname}`,
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

        // Check the roleId of the uploader
        const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
        if (uploader.length === 0) {
            return res.status(404).json({ error: "Uploader not found!" });
        }

        const role_id = uploader[0].role_id;

        // Set the default status
        let status = role_id === 1 ? "approved" : "pending";

        // Check if title already exists
        const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
        if (existingDocument.length > 0) {
            return res.status(409).json({ error: "Document with this title already exists!" });
        }

        // Insert research with the file ID from Google Drive
        const [result] = await db.query(
            "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status) VALUES (?, NOW(), ?, ?, ?, ?)",
            [title, abstract, fileId, uploader_id, status]
        );

        const researchId = result.insertId;

        // Insert authors, categories, and keywords (use your existing logic)

        res.status(201).json({ message: "Document Uploaded Successfully", fileId });
    } catch (error) {
        console.error("Error Upload Document:", error);
        res.status(500).json({ error: "Upload Document Endpoint Error!" });
    }
});

module.exports = router;
