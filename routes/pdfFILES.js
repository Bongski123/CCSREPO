const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const router = express.Router();

// Serve static files from the public directory
router.use(express.static(path.join(__dirname, './public')));

// API to fetch PDF file by research ID
router.get('/pdf/:research_id', (req, res) => {
    const researchID = req.params.research_id;

    // Retrieve file name from the database based on research ID
    db.query('SELECT filename FROM researches WHERE research_id = ?', [researchID], (err, result) => {
        if (err) {
            console.error('Error retrieving file name:', err);
            return res.status(500).send('Internal Server Error');
        }
        
        if (result.length > 0) {
            const fileName = result[0].file_name;
            const filePath = path.join(__dirname, '../public/pdfs', fileName);
            
            // Check if the file exists
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('Error accessing file:', err);
                    return res.status(404).send('File not found');
                }
                
                // Serve the PDF file
                res.sendFile(filePath);
            });
        } else {
            res.status(404).send('File not found');
        }
    });
});

module.exports = router;
