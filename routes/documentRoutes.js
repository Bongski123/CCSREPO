const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../database/db');

// Define the upload path to match the static serving path
const uploadPath = path.join(__dirname, '../public');

// Ensure the directory exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage });

// Endpoint to test file upload
router.post('/upload', upload.single('file'), (req, res) => {
    console.log(req.body);
    console.log(req.file);
    return res.json({ Status: "Success" });
});

// Endpoint to create and insert research data
router.post('/create', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Invalid file type, only PDFs are allowed!' });
        }

        const { title, authors = [], categories = [], keywords = [], abstract } = req.body;
        const filename = req.file.filename;

        // Check if title already exists
        const [existingDocument] = await db.query('SELECT title FROM researches WHERE title = ?', [title]);
        if (existingDocument.length > 0) {
            return res.status(409).json({ error: 'Document with this title already exists!' });
        }

        // Insert research
        const [result] = await db.query('INSERT INTO researches (title, publish_date, abstract, filename) VALUES (?, NOW(), ?, ?)', [title, abstract, filename]);
        const researchId = result.insertId;

        // Helper function to insert data
        const insertData = async (tableName, columnName, values) => {
            // Ensure values is an array
            if (!Array.isArray(values)) {
                values = [];
            }
            const valuePromises = values.map(async (value) => {
                let [result] = await db.query(`SELECT ${columnName}_id FROM ${tableName} WHERE ${columnName}_name = ?`, [value]);
                if (result.length === 0) {
                    [result] = await db.query(`INSERT INTO ${tableName} (${columnName}_name) VALUES (?)`, [value]);
                    return result.insertId;
                } else {
                    return result[0][`${columnName}_id`];
                }
            });
            return Promise.all(valuePromises);
        };

        // Insert authors
        const authorIds = await insertData('authors', 'author', authors);
        await Promise.all(authorIds.map(id => db.query('INSERT INTO research_authors (research_id, author_id) VALUES (?, ?)', [researchId, id])));

        // Insert categories
        const categoryIds = await insertData('category', 'category', categories);
        await Promise.all(categoryIds.map(id => db.query('INSERT INTO research_categories (research_id, category_id) VALUES (?, ?)', [researchId, id])));

        // Insert keywords
        const keywordIds = await insertData('keywords', 'keyword', keywords);
        await Promise.all(keywordIds.map(id => db.query('INSERT INTO research_keywords (research_id, keyword_id) VALUES (?, ?)', [researchId, id])));

        res.status(201).json({ message: 'Document Uploaded Successfully' });
    } catch (error) {
        console.error('Error Upload Document:', error);
        res.status(500).json({ error: `Upload Document Endpoint Error: ${error.message}` });
    }
});

module.exports = router;
