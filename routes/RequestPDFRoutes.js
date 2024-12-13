const express = require('express');

const router = express.Router();
const nodemailer = require('nodemailer'); // For sending emails
const db = require('../database/db'); // Import your database connection

// Setup nodemailer transporter directly with credentials
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'ncfresearchnexus@gmail.com',
    pass: 'apnrnhrzikfjshut',
  },
  debug: true, // Enable debug logging
});

// Verify SMTP server connection
transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP server connection failed:', error);
  } else {
    console.log('SMTP server is ready:', success);
  }
});

// Define the route for handling PDF requests
router.post('/request-pdf', async (req, res) => {
  const { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose } = req.body;

  // Validate required fields
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

    // Check if any authors were found
    if (results.length === 0) {
      return res.status(404).json({ error: 'No authors found for the given research ID.' });
    }

    // Collect all author emails
    const authorEmails = results.map(result => result.email);
    console.log('Author Emails:', authorEmails); // Debugging: Log collected emails

    // Ensure all emails are valid
    const invalidEmails = authorEmails.filter(email => !/\S+@\S+\.\S+/.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: 'Some author email addresses are invalid.' });
    }

    // Send an individual email to each author
    for (const email of authorEmails) {
      const mailOptions = {
        from: 'ncfresearchnexus@gmail.com',
        to: email, // Send email to one author at a time
        subject: `Request for PDF: ${researchTitle}`,
        text: `Hello ${authorName},\n\n${requesterName} (${requesterEmail}) has requested the PDF for the research titled "${researchTitle}".\n\nPurpose: ${purpose}\nResearch ID: ${researchId}\n\nBest regards,\nResearch Repository`,
      };

      // Use await to wait for each email to send before continuing
      try {
        const info = await transporter.sendMail(mailOptions);  // No callback, directly using the promise
        console.log(`Email sent to ${email}:`, info.response);
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
        return res.status(500).json({ error: `Something went wrong while sending the email to ${email}.` });
      }
    }

    // After all emails have been sent successfully
    return res.status(200).json({ message: 'Your request has been sent to the authors.' });

  } catch (error) {
    console.error('Error in /request-pdf route:', error);
    return res.status(500).json({ error: 'Something went wrong while processing your request.' });
  }
});

module.exports = router;
