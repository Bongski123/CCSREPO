const express = require("express");
const jwt = require('jsonwebtoken');
const db = require('../database/db');  // your database setup
const router = express.Router();
// Email verification endpoint

// Change the POST route to GET for the /verify-email endpoint
router.get('/verify-email', (req, res) => {
  const { token } = req.query;  // Get the token from the query string

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    // Verify the token
    jwt.verify(token, 'Nhel-secret-key', (err, decoded) => {
      if (err) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Decode user info from token
      const { userId } = decoded;

      // Update the user's verified status to 1 (true)
      const query = 'UPDATE users SET verified = 1 WHERE user_id = ?';
      db.query(query, [userId], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Error verifying email' });
        }

        // Send success response
        return res.status(200).json({ message: 'Email successfully verified' });
      });
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error during email verification' });
  }
});


module.exports = router;