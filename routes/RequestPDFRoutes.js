const express = require('express');
const db = require('../database/db');
const sendEmailNotification = require('../controllers/EmailService'); // Import the email service
const router = express.Router();

// POST /request-pdf endpoint
router.post('/request-pdf', (req, res) => {
  const { researchId, requesterName, requesterEmail, purpose } = req.body;

  // Step 1: Fetch the research title based on researchId
  db.query(
    'SELECT title FROM researches WHERE research_id = ?',
    [researchId],
    (err, results) => {
      if (err) {
        console.error('Error fetching research details:', err);
        return res.status(500).json({ error: 'Error fetching research details' });
      }

      const researchTitle = results[0]?.title;

      if (!researchTitle) {
        return res.status(404).json({ error: 'Research not found' });
      }

      // Step 2: Insert the PDF request into the 'pdf_requests' table
      db.query(
        'INSERT INTO pdf_requests (research_title, requester_name, requester_email, purpose) VALUES (?, ?, ?, ?)',
        [researchTitle, requesterName, requesterEmail, purpose],
        (err, result) => {
          if (err) {
            console.error('Error inserting request into database:', err);
            return res.status(500).json({ error: 'Error inserting request into database' });
          }

          // Step 3: Fetch all authors for this research (excluding uploader)
          db.query(
            'SELECT a.email FROM authors a ' +
            'JOIN research_authors ra ON a.author_id = ra.author_id ' +
            'WHERE ra.research_id = ?',
            [researchId],
            (err, authorResults) => {
              if (err) {
                console.error('Error fetching authors:', err);
                return res.status(500).json({ error: 'Error fetching authors' });
              }

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
                ).catch(err => {
                  console.error(`Error sending email to ${author.email}:`, err);
                });
              });

              // Step 5: Send success response
              res.status(200).json({ message: 'Request sent successfully to authors!' });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
