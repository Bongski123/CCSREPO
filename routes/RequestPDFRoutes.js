const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // For sending emails
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('../database/db'); // Import your database connection


dotenv.config();


const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use another email provider
  auth: {
    user: 'ncfresearchnexus@gmail.com', // Replace with your email
    pass: 'iirehsogzzsadbwk',  // Replace with your email password or app password
  },
});

// Define the route for handling PDF requests
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
      from: 'ncfresearchnexus@gmail.com', // The sender's email address
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
