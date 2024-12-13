const express = require('express');
require('dotenv').config();

const router = express.Router();
const db = require('../database/db'); // Import your database connection

// Define the route for handling PDF requests
router.post('/request-pdf', async (req, res) => {
  const { researchId, researchTitle, requesterName, requesterEmail, purpose } = req.body;

  // Validate required fields
  if (!researchId || !researchTitle || !requesterName || !requesterEmail || !purpose) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if the researchId exists in the researches table
  const checkQuery = 'SELECT * FROM researches WHERE research_id = ?';
  try {
    const [research] = await db.query(checkQuery, [researchId]);
    
    // If researchId doesn't exist, send an error response
    if (!research || research.length === 0) {
      return res.status(404).json({ error: 'No research found with the given ID' });
    }

    // Insert the request into the pdf_requests table
    const insertQuery = `
      INSERT INTO pdf_requests (research_id, research_title, requester_name, requester_email, purpose, status)
      VALUES (?, ?, ?, ?, ?, 'pending');
    `;

    // Use the researchId from the request body
    await db.query(insertQuery, [researchId, researchTitle, requesterName, requesterEmail, purpose]);

    // Return success response
    return res.status(200).json({ message: 'PDF request submitted successfully.' });

  } catch (error) {
    console.error('Error inserting PDF request:', error);
    return res.status(500).json({ error: 'Error processing PDF request' });
  }
});

module.exports = router;
