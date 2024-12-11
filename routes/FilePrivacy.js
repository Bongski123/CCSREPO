const express = require('express');
const db = require('../database/db');
const router = express.Router();
const nodemailer = require('nodemailer');
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




// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
  }
});

// Endpoint to handle the PDF request
router.post('/request-pdf', (req, res) => {
  const { researchId, requesterName, requesterEmail, purpose } = req.body;

  // Fetch the title and uploader_id from the 'researches' table based on researchId
  connection.query(
    'SELECT uploader_id, title FROM researches WHERE research_id = ?',
    [researchId],
    (err, results) => {
      if (err) {
        return res.status(500).send('Error fetching research details');
      }

      const uploaderId = results[0]?.uploader_id;
      const researchTitle = results[0]?.title;

      if (!uploaderId) {
        return res.status(404).send('Research not found');
      }

      // Insert the PDF request into the 'pdf_requests' table
      connection.query(
        'INSERT INTO pdf_requests (research_title, requester_name, requester_email, purpose, uploader_id) VALUES (?, ?, ?, ?, ?)',
        [researchTitle, requesterName, requesterEmail, purpose, uploaderId],
        (err, result) => {
          if (err) {
            return res.status(500).send('Error inserting request');
          }

          // Fetch all authors for this research (including the uploader)
          connection.query(
            'SELECT a.email FROM authors a JOIN research_authors ra ON a.author_id = ra.author_id WHERE ra.research_id = ?',
            [researchId],
            (err, authorResults) => {
              if (err) {
                return res.status(500).send('Error fetching authors');
              }

              // Loop through the authors and send an email to each
              authorResults.forEach(author => {
                sendEmailNotification(author.email, researchTitle, requesterName, requesterEmail, purpose);
              });

              // Send success response
              res.status(200).send('Request sent successfully to authors!');
            }
          );
        }
      );
    }
  );
});

// Example function to send an email (using Nodemailer)
const sendEmailNotification = (authorEmail, researchTitle, requesterName, requesterEmail, purpose) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: authorEmail,
    subject: 'PDF Request for Your Research Document',
    text: `Hello, You have received a request for your research titled "${researchTitle}" from ${requesterName} (${requesterEmail}).\n\nPurpose: ${requesterName} has requested the document for the purpose of: ${purpose}.\n\nPlease respond to the request accordingly.`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log('Error sending email:', err);
    } else {
      console.log('Email sent to author: ' + info.response);
    }
  });
};


module.exports = router;
