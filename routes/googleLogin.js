const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../database/db');

const router = express.Router();
const GOOGLE_CLIENT_ID = '968089167315-ch1eu1t6l1g8m2uuhrdc5s75gk9pn03d.apps.googleusercontent.com'; // Hardcoded Google Client ID
const JWT_SECRET = 'Nhel-secret-key'; // Hardcoded JWT Secret Key

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/google-login', async (req, res) => {
  const { id_token } = req.body;

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Determine role based on email domain
    let roleId = 3; // Default role for non-gbox.ncf.edu.ph users

    if (email.endsWith('@gbox.ncf.edu.ph')) {
      roleId = 2; // Assign role 2 for gbox.ncf.edu.ph users
    }

    // Check if the user already exists in the database
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (user) {
      // User exists, generate JWT token
      const accessToken = jwt.sign(
        { userId: user.user_id, email: user.email, roleId: user.role_id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: user.user_id, roleId: user.role_id });
    } else {
      // User does not exist, create new user with the determined role
      const [result] = await db.query(
        'INSERT INTO users (google_id, email, name, role_id) VALUES (?, ?, ?, ?)',
        [googleId, email, name, roleId]
      );
      const newUserId = result.insertId;

      // Generate JWT token for the new user
      const accessToken = jwt.sign(
        { userId: newUserId, email, roleId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: newUserId, roleId });
    }
  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(401).json({ error: 'Invalid Google token or error processing request' });
  }
});

module.exports = router;
