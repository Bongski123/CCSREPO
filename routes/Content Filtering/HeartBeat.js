const express = require('express');

const db = require('./db'); // Import database connection

const router = express.Router();


router.post('/admin/heartbeat', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
  
    try {
      // Update the last_active field
      await db.promise().query(
        `UPDATE users SET last_active = NOW() WHERE user_id = ?`,
        [userId]
      );
      res.status(200).json({ message: 'Heartbeat updated successfully.' });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
      res.status(500).json({ error: 'Failed to update heartbeat.' });
    }
  });
  

  module.exports = router;