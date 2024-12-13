const express = require('express');
const db = require('../database/db');

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
        'INSERT INTO pdf_requests (research_id,research_title, requester_name, requester_email, purpose) VALUES (?, ?, ?, ?,?)',
        [researchId,researchTitle, requesterName, requesterEmail, purpose],
        (err, result) => {
          if (err) {
            console.error('Error inserting request into database:', err);
            return res.status(500).json({ error: 'Error inserting request into database' });
          }

         
            }
          );
        }
      );
    

});

module.exports = router;
