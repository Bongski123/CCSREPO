
const express = require("express");
const jwt = require('jsonwebtoken');
const db = require('../database/db');  // your database setup
const router = express.Router();


router.get('/verify-email', async (req, res) => {
  const { token } = req.query;  // Get the token from the query string

  if (!token) {
    console.log('Token is missing');
    return res.status(400).json({ message: 'Token is required' });
  }

  console.log('Received token:', token);  // Log the token for debugging

  try {
    // Verify the token
    const decoded = jwt.verify(token, 'Nhel-secret-key');  // Verify the token using the secret key
    const { userId } = decoded;
    console.log('Decoded user ID:', userId);  // Log decoded user ID for debugging

    // Update the user's verified status to 1 (true)
    const query = 'UPDATE users SET verified = 1 WHERE user_id = ?';
    const [result] = await db.query(query, [userId]);

    if (result.affectedRows === 0) {
      console.log('User not found or already verified');
      return res.status(400).json({ message: 'User not found or already verified' });
    }

    console.log('User verified successfully');
    return res.status(200).json({ message: 'Email successfully verified' });

  } catch (error) {
    console.error('Error during email verification:', error);  // Log unexpected errors
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});


module.exports = router;