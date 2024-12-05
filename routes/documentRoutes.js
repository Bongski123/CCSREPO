const express = require("express");
const db = require("../database/db");
const multer = require("multer");
const FTPClient = require("basic-ftp");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// FTPS Configuration
const ftpsConfig = {
    host: "c011ftp.cloudclusters.net", // Replace with your FTPS host
    user: "admin",       // Replace with your FTPS username
    password: "hCmGOATIy6NL",   // Replace with your FTPS password
    secure: true,                // Enable secure connection
};

// Configure multer for temporary local file storage
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

// Function to upload files to FTPS
async function uploadToFTPS(localPath, remotePath) {
    const client = new FTPClient.Client();
    try {
        await client.access(ftpsConfig);
        console.log(`Connected to FTPS: ${ftpsConfig.host}`);
        await client.uploadFrom(localPath, remotePath);
        console.log(`File uploaded to FTPS: ${remotePath}`);
    } catch (err) {
        console.error("FTPS Upload Error:", err);
        throw err;
    } finally {
        client.close();
    }
}

// Utility functions for inserting metadata
const insertAuthors = async (researchId, authors) => {
    const authorNames = authors.split(",").map((name) => name.trim());
    for (const name of authorNames) {
        let [author] = await db.query("SELECT author_id FROM authors WHERE author_name = ?", [name]);
        if (author.length === 0) {
            const [result] = await db.query("INSERT INTO authors (author_name) VALUES (?)", [name]);
            author = { author_id: result.insertId };
        } else {
            author = author[0];
        }
        await db.query("INSERT INTO research_authors (research_id, author_id) VALUES (?, ?)", [researchId, author.author_id]);
    }
};

const insertCategories = async (researchId, categories) => {
    const categoryNames = categories.split(",").map((name) => name.trim());
    for (const name of categoryNames) {
        let [category] = await db.query("SELECT category_id FROM category WHERE category_name = ?", [name]);
        if (category.length === 0) {
            const [result] = await db.query("INSERT INTO category (category_name) VALUES (?)", [name]);
            category = { category_id: result.insertId };
        } else {
            category = category[0];
        }
        await db.query("INSERT INTO research_categories (research_id, category_id) VALUES (?, ?)", [researchId, category.category_id]);
    }
};

const insertKeywords = async (researchId, keywords) => {
    const keywordNames = keywords.split(",").map((name) => name.trim());
    for (const name of keywordNames) {
        let [keyword] = await db.query("SELECT keyword_id FROM keywords WHERE keyword_name = ?", [name]);
        if (keyword.length === 0) {
            const [result] = await db.query("INSERT INTO keywords (keyword_name) VALUES (?)", [name]);
            keyword = { keyword_id: result.insertId };
        } else {
            keyword = keyword[0];
        }
        await db.query("INSERT INTO research_keywords (research_id, keyword_id) VALUES (?, ?)", [researchId, keyword.keyword_id]);
    }
};

// Endpoint for uploading files
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
        }

        const { title, authors, categories, keywords, abstract, uploader_id } = req.body;
        const localFilePath = req.file.path;
        const remoteFilePath = `/uploads/documents/${req.file.filename}`;

        // Upload file to FTPS
        await uploadToFTPS(localFilePath, remoteFilePath);

        // Clean up temporary local file
        fs.unlinkSync(localFilePath);

        // Set default status based on role
        const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
        if (uploader.length === 0) {
            return res.status(404).json({ error: "Uploader not found!" });
        }

        const role_id = uploader[0].role_id;
        const status = role_id === 1 ? "approved" : "pending";

        // Check if title exists
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
        await insertAuthors(researchId, authors);
        await insertCategories(researchId, categories);
        await insertKeywords(researchId, keywords);

        res.status(201).json({ message: "Document uploaded successfully!" });
    } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ error: "Upload failed!" });
    }
});

module.exports = router;
