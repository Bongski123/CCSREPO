const express = require('express');
const db = require('../database/db'); // Assuming you have a db setup
const nodemailer = require('nodemailer');
const router = express.Router();

// Middleware to validate privacy value
const validatePrivacy = (req, res, next) => {
  const { privacy } = req.body;
  if (!['public', 'private'].includes(privacy)) {
    return res.status(400).json({ message: 'Invalid privacy value. Use "public" or "private".' });
  }
  next();
};

// Update file privacy route
router.put('/research/:researchId/privacy', validatePrivacy, async (req, res) => {
  const { researchId } = req.params; // Extract researchId from params
  const { privacy } = req.body; // Extract privacy value from request body

  if (!researchId) {
    return res.status(400).json({ message: 'Research ID is required.' });
  }

  try {
    // Update file_privacy for the given research ID
    const [result] = await db.query(
      'UPDATE researches SET file_privacy = ? WHERE research_id = ?',
      [privacy, researchId]
    );

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Research not found or already updated.' });
    }

    res.status(202).json({ message: `Privacy updated to "${privacy}" for research ID ${researchId}.` });
  } catch (error) {
    console.error('Error updating privacy:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Set up email transport using Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // or another email service like Outlook, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Function to send email to authors
const sendEmailNotification = (authorEmail, researchTitle, requesterName, requesterEmail, purpose) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: authorEmail, // Recipient address
    subject: 'PDF Request for Your Research Document',
    text: `Hello,

You have received a request for your research titled "${researchTitle}" from ${requesterName} (${requesterEmail}).

Purpose: ${requesterName} has requested the document for the purpose of: ${purpose}.

Please respond to the request accordingly.

Best regards,
Your Research System`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Email sent to author: ' + info.response);
    }
  });
};

// POST /request-pdf endpoint
router.post('/request-pdf', async (req, res) => {
  const { researchId, requesterName, requesterEmail, purpose } = req.body;

  // Step 1: Fetch the research title based on researchId
  try {
    const [results] = await db.query('SELECT title FROM researches WHERE research_id = ?', [researchId]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Research not found' });
    }

    const researchTitle = results[0].title;

    // Step 2: Insert the PDF request into the 'pdf_requests' table
    const [insertResult] = await db.query(
      'INSERT INTO pdf_requests (research_id,research_title, requester_name, requester_email, purpose) VALUES (?, ?, ?, ?,?)',
      [researchTitle, requesterName, requesterEmail, purpose]
    );

    if (!insertResult.affectedRows) {
      return res.status(500).json({ error: 'Failed to insert request into the database' });
    }

    // Step 3: Fetch all authors for this research (excluding uploader)
    const [authorResults] = await db.query(
      'SELECT a.email FROM authors a ' +
      'JOIN research_authors ra ON a.author_id = ra.author_id ' +
      'WHERE ra.research_id = ?',
      [researchId]
    );

    if (authorResults.length === 0) {
      return res.status(404).json({ error: 'No authors found for this research' });
    }

    // Step 4: Send email to each author
    authorResults.forEach(author => {
      sendEmailNotification(
        author.email,
        researchTitle,
        requesterName,
        requesterEmail,
        purpose
      );
    });

    // Step 5: Send success response
    res.status(200).json({ message: 'Request sent successfully to authors!' });

  } catch (err) {
    console.error('Error processing PDF request:', err);
    res.status(500).json({ error: 'Error processing your request' });
  }
});

module.exports = router;
