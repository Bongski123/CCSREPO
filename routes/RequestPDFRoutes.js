const express = require('express');
require('dotenv').config();
const router = express.Router();
const nodemailer = require('nodemailer'); // For sending emails

const db = require('../database/db'); // Import your database connection

// Configure nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
      user: 'ncfresearchnexus@gmail.com', // Your Gmail address
      pass: 'uvebkflhfwuwqcuk', // Your App Password (make sure to remove any spaces)
  },
});

// Define the route for handling PDF requests
router.post('/request-pdf', async (req, res) => {
  const { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose } = req.body;

  if (!researchId || !researchTitle || !authorName || !requesterName || !requesterEmail || !purpose) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Query to fetch all authors' emails based on researchId
  const query = `
      SELECT a.email 
      FROM authors a
      JOIN research_authors ra ON a.author_id = ra.author_id
      WHERE ra.research_id = ?;
  `;

  try {
    const [results] = await db.query(query, [researchId]);

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
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Your request has been sent to the authors.' });

  } catch (error) {
    console.error('Error in /request-pdf route:', error);
    return res.status(500).json({ error: 'Something went wrong while sending the email.' });
  }
});

module.exports = router;
