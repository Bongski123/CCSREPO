const express = require('express');
const mysql = require('mysql2/promise');
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
router.put('/research/:userId/privacy', validatePrivacy, async (req, res) => {
  const { userId } = req.params;
  const { privacy } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE researches SET file_privacy = ? WHERE research_id = ?',
      [privacy, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Research not found.' });
    }

    res.status(202).json({ message: `Privacy updated to "${privacy}" for research ID ${id}.` });
  } catch (error) {
    console.error('Error updating privacy:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
