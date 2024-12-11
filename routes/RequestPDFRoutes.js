const express = require('express');
const db = require('../database/db'); // Database connection
const sendEmailNotification = require('../controllers/EmailService'); // Email service
const router = express.Router();

// POST /request-pdf endpoint to send email to author
router.post('/request-pdf', (req, res) => {
  const { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose } = req.body;

  // Step 1: Fetch the author's email based on the researchId
  db.query(
    `SELECT a.email
FROM authors a
JOIN research_authors ra ON a.author_id = ra.author_id
WHERE ra.research_id = 64;
`,
    [researchId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching author details' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'No authors found for this research' });
      }

      const authorEmail = results[0].email; // Get the author's email from the query result

      // Step 2: Prepare the email content
      const subject = `Request for PDF of ${researchTitle}`;
      const message = `
        Hello ${authorName},
        
        You have received a request for the PDF of your research titled "${researchTitle}" from:
        
        Name: ${requesterName}
        Email: ${requesterEmail}
        Purpose: ${purpose}
        
        Please respond accordingly.
      `;

      // Step 3: Send email to the author
      sendEmailNotification(authorEmail, subject, message)
        .then(() => {
          res.status(200).json({ message: 'Request sent successfully to the author!' });
        })
        .catch((err) => {
          console.error('Error sending email:', err);
          res.status(500).json({ error: 'Failed to send email' });
        });
    }
  );
});

module.exports = router;
