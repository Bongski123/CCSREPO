const express = require("express");
const db = require("../database/db");
const multer = require("multer");
const FTPClient = require("basic-ftp");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// FTPS Configuration
const ftpsConfig = {
    host: "c011ftp.cloudclusters.net",  // Replace with your FTPS host
    user: "admin",                     // Replace with your FTPS username
    password: "hCmGOATIy6NL",          // Replace with your FTPS password
    secure: true,                      // Enable secure connection
};

// Multer Configuration for Temporary Local Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.resolve(__dirname, "./temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type, only PDFs are allowed!"), false);
    }
};

const upload = multer({ storage, fileFilter });

// Function to Upload Files to FTPS
async function uploadToFTPS(localPath, remotePath) {
    const client = new FTPClient.Client();
    client.ftp.timeout = 60000;  // Set timeout to 60 seconds
    client.ftp.usePassiveMode = true;  // Enable passive mode
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`Connecting to FTPS (Attempt ${attempt}): ${ftpsConfig.host}`);
            await client.access(ftpsConfig);
            console.log("Connected to FTPS successfully.");

            // Upload file to remote path
            await client.uploadFrom(localPath, remotePath);
            console.log(`File uploaded to FTPS: ${remotePath}`);
            return; // Exit on successful upload
        } catch (err) {
            console.error(`FTPS Upload Attempt ${attempt} Failed:`, err);
            if (attempt === 3) {
                console.error("All upload attempts failed. Throwing error.");
                throw err;
            }
        } finally {
            client.close();
        }
    }
}

// Helper Functions for Metadata Insertion
const insertMetadata = async (tableName, idField, nameField, mappingTable, researchId, values) => {
    const items = values.split(",").map((item) => item.trim());
    for (const item of items) {
        let [record] = await db.query(`SELECT ${idField} FROM ${tableName} WHERE ${nameField} = ?`, [item]);
        if (record.length === 0) {
            const [result] = await db.query(`INSERT INTO ${tableName} (${nameField}) VALUES (?)`, [item]);
            record = { [idField]: result.insertId };
        } else {
            record = record[0];
        }
        await db.query(`INSERT INTO ${mappingTable} (research_id, ${idField}) VALUES (?, ?)`, [researchId, record[idField]]);
    }
};

// File Upload Endpoint
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
        }

        const { title, authors, categories, keywords, abstract, uploader_id } = req.body;
        const localFilePath = req.file.path;
        const remoteFilePath = `/uploads/documents/${req.file.filename}`;

        // Upload file to FTPS
        try {
            await uploadToFTPS(localFilePath, remoteFilePath);
        } catch (err) {
            // If upload fails after 3 attempts, return error
            return res.status(500).json({ error: "Failed to upload file to FTPS after 3 attempts." });
        }

        // Clean up temporary local file
        fs.unlinkSync(localFilePath);

        // Set default status based on role
        const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
        if (uploader.length === 0) {
            return res.status(404).json({ error: "Uploader not found!" });
        }

        const status = uploader[0].role_id === 1 ? "approved" : "pending";

        // Check for existing title
        const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
        if (existingDocument.length > 0) {
            return res.status(409).json({ error: "Document with this title already exists!" });
        }

        // Insert research data
        const [result] = await db.query(
            "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status) VALUES (?, NOW(), ?, ?, ?, ?)",
            [title, abstract, req.file.filename, uploader_id, status]
        );
        const researchId = result.insertId;

        // Insert authors, categories, and keywords
        await insertMetadata("authors", "author_id", "author_name", "research_authors", researchId, authors);
        await insertMetadata("category", "category_id", "category_name", "research_categories", researchId, categories);
        await insertMetadata("keywords", "keyword_id", "keyword_name", "research_keywords", researchId, keywords);

        res.status(201).json({ message: "Document uploaded successfully!" });
    } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ error: "Upload failed!" });
    }
});

module.exports = router;
