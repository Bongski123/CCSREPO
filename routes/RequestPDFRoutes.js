const express = require('express');
const db = require('../database/db');

const router = express.Router();

// POST /request-pdf endpoint
router.post('/request-pdf-files', (req, res) => {
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



// Reject PDF request (this assumes the request_id is passed in the URL)
router.post('/reject-pdf-request/:request_id', async (req, res) => {
  const requestId = req.params.request_id;

  // Update the status to 'Rejected'
  const query = `UPDATE pdf_requests SET status = 'Rejected' WHERE request_id = ?`;

  try {
    const [result] = await db.execute(query, [requestId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'PDF request not found' });
    }

    return res.status(200).json({ message: 'PDF request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting PDF request:', error);
    return res.status(500).json({ message: 'Failed to reject PDF request' });
  }
});

module.exports = router;
