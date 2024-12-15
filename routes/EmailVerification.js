const express = require("express");
const jwt = require('jsonwebtoken');
const db = require('../database/db');  // your database setup
const router = express.Router();
// Email verification endpoint

router.get('/verify-email', (req, res) => {
  const { token } = req.query;  // Get the token from the query string

  if (!token) {
    console.log('Token is missing');
    return res.status(400).json({ message: 'Token is required' });
  }

  console.log('Received token:', token);  // Log the token for debugging

  try {
    // Verify the token
    jwt.verify(token, 'Nhel-secret-key', (err, decoded) => {
      if (err) {
        console.log('Token verification failed:', err);  // Log error if verification fails
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Decode user info from token
      const { userId } = decoded;
      console.log('Decoded user ID:', userId);  // Log decoded user ID for debugging

      // Update the user's verified status to 1 (true)
      const query = 'UPDATE users SET verified = 1 WHERE user_id = ?';
      db.query(query, [userId], (err, result) => {
        if (err) {
          console.log('Error updating user verification:', err);  // Log error if update fails
          return res.status(500).json({ message: 'Error verifying email' });
        }

        console.log('User verified successfully');  // Log success if verification is successful
        // Send success response
        return res.status(200).json({ message: 'Email successfully verified' });
      });
    });
  } catch (error) {
    console.error('Error during email verification:', error);  // Log unexpected errors
    return res.status(500).json({ message: 'Error during email verification' });
  }
});

module.exports = router;