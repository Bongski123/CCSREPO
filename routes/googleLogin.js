const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { OAuth2Client } = require('google-auth-library');

const db = require('../database/db');
const { authenticateToken } = require('../authentication/middleware');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Use environment variable for client ID

router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    // Check user in the database
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (user) {
      // User exists, generate JWT token
      const accessToken = jwt.sign(
        { userId: user.user_id, email: user.email, roleId: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: user.user_id, roleId: user.role_id });
    } else {
      // User does not exist, create new user
      const [result] = await db.query(
        'INSERT INTO users (google_id, email, role_id) VALUES (?, ?, ?)',
        [googleId, email, 3] // Default role_id for new users
      );
      const newUserId = result.insertId;

      // Generate JWT token for new user
      const accessToken = jwt.sign(
        { userId: newUserId, email, roleId: 3 },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: newUserId, roleId: 3 });
    }
  } catch (error) {
    console.error('Error during Google login:', error); // Log the error for debugging
    res.status(401).json({ error: 'Invalid Google token or error processing request' });
  }
});

module.exports = router;
