const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../database/db');

// Ensure the directory exists or create it
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Directory where files will be uploaded
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        // Log the directory path to ensure it's correct
        console.log('Uploading to directory:', uploadDir);
        callback(null, uploadDir);
    },
    filename: function (req, file, callback) {
        // Add a unique suffix to avoid name conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + file.originalname;
        console.log('Generated filename:', filename);
        callback(null, filename);
    }
});

// Set saved storage options, including file filter for PDFs
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            console.log('Invalid file type:', file.mimetype);
            cb(new Error('Invalid file type, only PDFs are allowed!'), false);
        }
    }
});

// Endpoint to handle file upload and research data insertion
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // If file is missing
        if (!req.file) {
            return res.status(400).json({ error: 'Invalid file type, only PDFs are allowed!' });
        }

        // Log file information
        console.log('File uploaded:', req.file);

        const { title, authors = [], categories = [], keywords = [], abstract } = req.body;
        const filename = req.file.filename;

        // Check if title already exists
        const [existingDocument] = await db.query('SELECT title FROM researches WHERE title = ?', [title]);
        if (existingDocument.length > 0) {
            return res.status(409).json({ error: 'Document with this title already exists!' });
        }

        // Insert research data into the database
        const [result] = await db.query('INSERT INTO researches (title, publish_date, abstract, filename) VALUES (?, NOW(), ?, ?)', [title, abstract, filename]);
        const researchId = result.insertId;

        // Helper function to insert authors, categories, and keywords
        const insertData = async (tableName, columnName, values) => {
            if (!Array.isArray(values)) values = [];
            const valuePromises = values.map(async (value) => {
                const [existingValue] = await db.query(`SELECT ${columnName}_id FROM ${tableName} WHERE ${columnName}_name = ?`, [value]);
                if (existingValue.length === 0) {
                    const [inserted] = await db.query(`INSERT INTO ${tableName} (${columnName}_name) VALUES (?)`, [value]);
                    return inserted.insertId;
                } else {
                    return existingValue[0][`${columnName}_id`];
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
        console.error('Error Uploading Document:', error);
        res.status(500).json({ error: `Upload Document Endpoint Error: ${error.message}` });
    }
});

module.exports = router;
