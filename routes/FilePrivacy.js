const express = require('express');
const db = require('../database/db');
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

module.exports = router;
