const express = require('express');
const { google } = require('googleapis');
const db = require('../database/db'); // Adjust the path as necessary

const router = express.Router();

// Google Service Account credentials for Drive API
const googleServiceAccount = {
    type: "service_account",
    project_id: "ccsrepository-444308",
    private_key_id: "ad95bb0e9b7b40f9b43b2dd9dc33cc3eb925bce9",
    private_key: `-----BEGIN PRIVATE KEY-----
  MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVgISVob0EV2BE
  T0NXxB6R/TCLwgZzGG3ivK7uzoIJoGQPKLSkABLu0/3GNdwMx4ZEOOsEr+EMyUhp
  8LMj9iik9mOyb+R4kEDAEQlQZ0+HvK/Yabm67umX/6dGRv7JCC+yNRP28XQ9GuOU
  SmmhEqnmmga2lWp+mPBl6W6nX7gOAIj6xtugYU1IRAIZ0Yxs8eVTp5y4mh7sWqko
  xXUmkSCcLY6Wm1zlR8yHTExSL/QPmnWUNyOqyIg6bvRq3nAwYdGLUZRoTa1TWnQO
  ewqa1GM9aouAI0d+RsCw//UEG2V4v+kxkso21dB9YmmKbSnyRairNr2IIeyNrPWL
  NZShI6UHAgMBAAECggEAEXK2CY2ujYiS5yvV7fn3ogIS/q2/hC/Zzx73ahaTXWdv
  tfNwK9T1UL8fbRyHgr3aaBnn6KBAOdP7TuxRksQYinHrMBdH3ZIaA8UaQalnwC9e
  uZN0wjIQAhC6rwCFuV0pzk90woiO2AcqB4ghsMmxlXulLJryZi0073ppXu4jwKg+ 
  ... (private key continues)
  -----END PRIVATE KEY-----`,
    client_email: "ccsrepo@ccsrepository-444308.iam.gserviceaccount.com",
    client_id: "103197742225204345135",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ccsrepo%40ccsrepository-444308.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
};

// Google Drive API setup using service account
const auth = new google.auth.GoogleAuth({
    credentials: googleServiceAccount, // Using credentials object directly
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
        const [result] = await db.query('SELECT file_id FROM researches WHERE research_id = ?', [researchID]);

        if (result.length === 0) {
            return res.status(404).send('Research not found');
        }

        const fileId = result[0].file_id; // Using 'file_id' directly from the database

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

        // Download the file from Google Drive
        const driveResponse = await drive.files.get({
            fileId: file.id,
            alt: 'media',
        });

        // Set appropriate content type for the PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.send(driveResponse.data);
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
