const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db'); // Adjust the path as necessary
const { google } = require('googleapis');

const router = express.Router();




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
  H9vdUlzNYUUHJVvHWIiv+ITN43Xx0EYRIe6n5e/ZeZ4hAFqtmqzb+rSOXgmgqIMw
  oGBW/OZbvlkJsGWHyGZeZSLL+iJXNDJDk8YFv3arpbInBk3OYQk9UPYY82l3f1au
  DlWtL389kSgyJ/Gfvr30qDhs1WEN5Te2//HZu5l7YQKBgQDrH5WbxHJzk/Hc1jpK
  JQmUlB2t26Cv+/+fOzAz5KHgFX2RLjXIHl5iufib3HM+nbUOe66As7U0r7/Va0Nn
  1qppy05HL4ZzA36bsQ8Fw5prdVQjjU+r4c1wEaY8O13ckzL6qKZIOGNEuBF0vRoq
  zGxN8iYsZ3MW6JX7E3zK/FvpYQKBgQDodXl5CJMw/67n6o/DlmnoxMdUNKXvyoxs
  Udz/daKX682tGBLa06u1ZCCMCJYgahQwqRv15apTscOvy5sBQraz8H/UGc3v0AZ0
  Dz5zyOaLw9pHv9C7MuDRhzd708Q3Z/Gh4YK6+syae6gposLh1wLqIbRUOTuCZGA6
  RSFZ4qYfZwKBgQCczEZgR6Sv0RS1WiQrOAHolNIqFFJXqi0xSi5+HNWa85n2jKOP
  HjmBi1Xw0xYDxvZsfyzDZZTNWvsKX2rnP7ALt2ovbNEzuDvhpjVHecdsLCV9RArC
  rGXte8epWUniBEQ2BuxFM114AWyatlVR/1umq3qrmB2XRGposvlBAQRmYQKBgQCS
  lwIzQSURESvLNC/Ut1WyY+UPROQfgytqY3Vp41TVWO4q6bN6K2Fs0ed0ZzXE2yBA
  T2RCfMIcZU1x3oOxF9D/R/pUVrF3OUfYiIRpn5dDLA7KkDug0UTU3OAwRirGhdXq
  r7sxDldYVAKHvwwGPwCnhPmi4zST1ZiZJl8Rv8vioQKBgQDOiy1z7ezJzgJSNoKz
  ee5zOWdsSRkxHBKRtc1vbBIxEg+z+838+TxXf2EJhkOA11OQptLGZ41iziR41P6A
  qZRp3lzXySc6REVOJI969AZSGovOFYPX6YguCb6X4wSuc/Avn+3AT/0bE6eMTAhX
  FgTYhJbE4mHJCmVUxn1C+iUleg==\n-----END PRIVATE KEY-----`,
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

// Folder ID for the Google Drive folder where PDFs are stored (from .env)
const folderId = "1z4LekckQJPlZbgduf5FjDQob3zmtAElc";

// API to fetch PDF file by research ID
router.get('/pdf/:research_id', async (req, res) => {
    const researchID = req.params.research_id;

    try {
        // Retrieve file ID from the database based on research ID
        const [result] = await db.query('SELECT file_id FROM researches WHERE research_id = ?', [researchID]);

        if (result.length > 0) {
            const fileId = result[0].file_id; // Assuming 'filename' holds the Google Drive file ID
            console.log('Retrieved fileId from database:', fileId); // Debugging log

            if (!fileId) {
                return res.status(404).send('File ID is missing in the database');
            }

            // List files in the Google Drive folder to verify the file exists
            const fileListResponse = await drive.files.list({
                q: `'${folderId}' in parents and name = '${fileId}'`,
                fields: 'files(id, name)', // Use 'id' instead of 'fileId'
            });

            if (fileListResponse.data.files.length === 0) {
                return res.status(404).send('File not found in the specified folder');
            }

            const file = fileListResponse.data.files[0];
            console.log('File found in folder:', file);

            // Download the file from Google Drive
            const driveResponse = await drive.files.get({
                fileId: file.id, // Correct field name
                alt: 'media',
            });

            // Set the appropriate headers to display PDF inline
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + file.name + '"');

            // Send the PDF content to the browser
            res.send(driveResponse.data);
        } else {
            res.status(404).send('Research not found');
        }
    } catch (err) {
        console.error("Error retrieving file:", err.message); // Log the error message
        res.status(500).send('Internal Server Error');
    }
});



module.exports = router;
