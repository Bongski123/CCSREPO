const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get PDF requests and associated author details for a specific user
router.get('/user/pdf-requests/:userId', async (req, res) => {
  const { userId } = req.params;

  // Query to fetch PDF requests made for researches uploaded by the user
  const queryPdfRequests = `
    SELECT 
      pr.request_id, 
      pr.research_id, 
      pr.research_title, 
      pr.requester_name, 
      pr.requester_email, 
      pr.purpose, 
      pr.status, 
      pr.created_at
    FROM 
      pdf_requests pr
    JOIN 
      researches r ON pr.research_id = r.research_id
    WHERE 
      r.uploader_id = ?;
  `;

  // Query to fetch authors associated with a research
  const queryAuthor = `
    SELECT 
      a.author_name, 
      a.email
    FROM 
      authors a
    JOIN 
      research_authors ra ON a.author_id = ra.author_id
    WHERE 
      ra.research_id = ?;
  `;

  try {
    // Fetch all PDF requests for the user
    const [pdfRequests] = await db.query(queryPdfRequests, [userId]);

    // Add associated authors for each research
    for (const request of pdfRequests) {
      const [authors] = await db.query(queryAuthor, [request.research_id]);
      request.authors = authors; // Add authors array to each request
    }

    res.status(200).json(pdfRequests);
  } catch (error) {
    console.error('Error fetching PDF requests:', error);
    res.status(500).json({ error: 'Failed to fetch PDF requests' });
  }
});

module.exports = router;
