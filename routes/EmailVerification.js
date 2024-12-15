const express = require("express");
const jwt = require('jsonwebtoken');
const db = require('../database/db');  // your database setup
const router = express.Router();

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;  // Get the token from the query string

  if (!token) {
    console.log('Token is missing');
    return res.status(400).json({ message: 'Token is required' });
  }

  console.log('Received token:', token);  // Log the token for debugging

  // Basic validation to check if the token has 3 parts (header, payload, signature)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return res.status(400).json({ message: 'Invalid token format' });
  }

  try {
    // Verify the token and extract userId and createdAt (timestamp)
    const decoded = jwt.verify(token, 'Nhel-secret-key');
    const { userId, createdAt } = decoded;
    console.log('Decoded user ID:', userId);  // Log decoded user ID for debugging

    // Check if the token has expired (5 minutes)
    const currentTime = Date.now();
    const tokenAge = currentTime - createdAt;
    console.log(`Token age: ${tokenAge}ms`);  // Log token age for debugging

    if (tokenAge > 5 * 60 * 1000) {  // 5 minutes in milliseconds
      console.log('Token expired');
      
      // Delete the user from the database due to expired verification
      const deleteUserQuery = 'DELETE FROM users WHERE user_id = ?';
      const [deleteResult] = await db.query(deleteUserQuery, [userId]);
      console.log('Delete query result:', deleteResult);  // Log delete result

      if (deleteResult.affectedRows === 0) {
        console.log('No user found to delete');
        return res.status(400).json({ message: 'User not found or already deleted' });
      }
      
      return res.status(400).json({ message: 'Token expired. User deleted' });
    }

    // If not expired, proceed with user verification
    const query = 'UPDATE users SET verification = "verified" WHERE user_id = ?';
    const [result] = await db.query(query, [userId]);

    if (result.affectedRows === 0) {
      console.log('User not found or already verified');
      return res.status(400).json({ message: 'User not found or already verified' });
    }

    console.log('User verified successfully');
    return res.status(200).json({ message: 'Email successfully verified' });

  } catch (error) {
    console.error('Error during email verification:', error);  // Log unexpected errors
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
