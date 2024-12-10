const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db'); // Adjust the path as necessary
const { google } = require('googleapis');

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

// Folder ID for the Google Drive folder where PDFs are stored
const folderId = "1z4LekckQJPlZbgduf5FjDQob3zmtAElc"; // Replace with your actual folder ID

// API to fetch PDF file by research ID
router.get('/pdf/:research_id', async (req, res) => {
    const researchID = req.params.research_id;

    try {
        // Retrieve file ID from the database based on research ID
        const [result] = await db.query('SELECT filename FROM researches WHERE research_id = ?', [researchID]);

        if (result.length > 0) {
            const fileId = result[0].filename; // Assuming 'filename' holds the Google Drive file ID
            console.log('Retrieved fileId from database:', fileId); // Debugging log

            if (!fileId) {
                return res.status(404).send('File ID is missing in the database');
            }

            // List files in the Google Drive folder to verify the file exists
            const fileListResponse = await drive.files.list({
                q: `'${folderId}' in parents and name = '${fileId}'`,
                fields: 'files(id, name)',
            });

            if (fileListResponse.data.files.length === 0) {
                return res.status(404).send('File not found in the specified folder');
            }

            const file = fileListResponse.data.files[0];
            console.log('File found in folder:', file);

            // Download the file from Google Drive
            const driveResponse = await drive.files.get({
                fileId: file.id,
                alt: 'media',
            });

            // Set appropriate content type for the PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.send(driveResponse.data);
        } else {
            res.status(404).send('Research not found');
        }
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
