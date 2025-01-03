const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db'); // Adjust the path as necessary
const nodemailer = require('nodemailer');
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
    credentials: googleServiceAccount,
    scopes: ["https://www.googleapis.com/auth/drive"], // Required scope for file access
});
const drive = google.drive({
    version: "v3",
    auth,
});

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email provider
    auth: {
        user: 'ncfresearchnexus@gmail.com', // Your email
        pass: 'apnrnhrzikfjshut', // Your email password or app-specific password
    },
});

// API to send PDF via email
// API to send PDF via email
router.post('/send-pdf/:research_id', async (req, res) => {
  const researchID = req.params.research_id;
  const { requester_email } = req.body; // Assume the request contains the recipient's email

  if (!requester_email) {
    return res.status(400).send('Email is required');
  }

  console.log(`Request to send email for research ID ${researchID} to ${requester_email}`);

  try {
    // Retrieve the file_id, title, and authors' names from the database based on research ID
    const [result] = await db.query(`
      SELECT r.file_id, r.title, GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors
      FROM researches r
      LEFT JOIN research_authors ra ON r.research_id = ra.research_id
      LEFT JOIN authors a ON ra.author_id = a.author_id
      WHERE r.research_id = ?
      GROUP BY r.file_id, r.title
    `, [researchID]);

    if (result.length > 0) {
      const fileId = result[0].file_id;
      const title = result[0].title;
      const authors = result[0].authors;

      if (!fileId) {
        return res.status(404).send('File ID is missing in the database');
      }

      console.log(`File ID found: ${fileId}`);
      console.log(`Title: ${title}`);
      console.log(`Authors: ${authors}`);

      try {
        // Fetch file metadata (e.g., name)
        const metadataResponse = await drive.files.get({
          fileId: fileId,
          fields: 'name',
        });

        const fileName = metadataResponse.data.name || 'document.pdf';
        console.log(`File name: ${fileName}`);

        // Fetch file content
        const driveResponse = await drive.files.get(
          {
            fileId: fileId,
            alt: 'media',
          },
          { responseType: 'arraybuffer' }
        );

        const fileBuffer = Buffer.from(driveResponse.data);

        // Send email with attachment, signed by the author
        await transporter.sendMail({
          from: `${authors} <ncfresearchnexus@gmail.com>`, // Sender as authors' names
          to: requester_email, // Recipient's email
          subject: `Requested Research Paper: "${title}"`, // Subject with research title
          text: `Dear ${requester_email},\n\n` + 
                `We are pleased to provide you with the requested research paper titled "${title}".\n\n` +
            
                `Please find the paper attached for your reference.\n\n` +
                `Best regards,\n${authors || 'The Authors'}`, // Email body
          attachments: [
            {
              filename: fileName,
              content: fileBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        console.log('Email sent successfully');

        // Update the request status to "approved" in pdf_requests table
        await db.query('UPDATE pdf_requests SET status = ? WHERE research_id = ?', ['approved', researchID]);

        res.send('Email sent successfully and request approved');
      } catch (err) {
        console.error('Error retrieving the file from Google Drive:', err.message);
        res.status(500).send('Error retrieving the file from Google Drive');
      }
    } else {
      console.log('Research not found');
      res.status(404).send('Research not found');
    }
  } catch (err) {
    console.error('Error retrieving file:', err.message);
    res.status(500).send('Internal Server Error');
  }
});



  
  module.exports = router;
