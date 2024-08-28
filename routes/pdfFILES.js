const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db'); // Adjust the path as necessary

const router = express.Router();

// API to fetch PDF file by research ID
router.get('/pdf/:research_id', async (req, res) => {
    const researchID = req.params.research_id;

    try {
        // Retrieve file name from the database based on research ID
        const [result] = await db.query('SELECT filename FROM researches WHERE research_id = ?', [researchID]);
        
        if (result.length > 0) {
            const fileName = result[0].filename; // Ensure this matches your database field name
            const filePath = path.resolve(__dirname, '../uploads/pdfs', fileName);

            console.log('File path:', filePath);

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
    } catch (err) {
        console.error('Error retrieving file name:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
