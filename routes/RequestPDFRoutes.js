const express = require('express');

require('dotenv').config();
const router = express.Router();
const nodemailer = require('nodemailer'); // For sending emails

const db = require('../database/db'); // Import your database connectionre


// Configure nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  secure: false,
  host: 'smtp.gmail.com',  // Set the SMTP host explicitly for Gmail
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,  // Your Gmail email address from .env file
    pass: process.env.EMAIL_PASS,  // Your Gmail app password or password from .env file
  },
});

// Define the route for handling PDF requests
router.post('/request-pdf', (req, res) => {
  const { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose } = req.body;

  // Query to fetch all authors' emails based on researchId
  const query = `
    SELECT a.email 
    FROM authors a
    JOIN research_authors ra ON a.author_id = ra.author_id
    WHERE ra.research_id = ?;
  `;

  db.execute(query, [researchId], (err, results) => {
    if (err) {
      console.error('Database query error: ', err);
      return res.status(500).json({ error: 'Database error occurred.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No authors found for the given research ID.' });
    }

    // Collect all author emails from the query results
    const authorEmails = results.map(result => result.email);

    // Construct the email message
    const mailOptions = {
      from: process.env.EMAIL_USER, // The sender's email address from .env
      to: authorEmails.join(','), // Send the email to all authors
      subject: `Request for PDF: ${researchTitle}`,
      text: `Hello ${authorName},\n\n${requesterName} (${requesterEmail}) has requested the PDF for the research titled "${researchTitle}".\n\nPurpose: ${purpose}\nResearch ID: ${researchId}\n\nBest regards,\nResearch Repository`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
        console.log(emailErr);
        return res.status(500).json({ error: 'Something went wrong while sending the email.' });
      }

      return res.status(200).json({ message: 'Your request has been sent to the authors.' });
    });
  });
});

module.exports = router;
