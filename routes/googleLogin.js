const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');
const { OAuth2Client } = require('google-auth-library');
const config = require('../authentication/config');
const secretKey = config.secretKey;
const router = express.Router();

// Replace with the correct Google OAuth Client ID
const client = new OAuth2Client('968089167315-ch1eu1t6l1g8m2uuhrdc5s75gk9pn03d.apps.googleusercontent.com');

router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '968089167315-ch1eu1t6l1g8m2uuhrdc5s75gk9pn03d.apps.googleusercontent.com', // This should match the client ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
      const accessToken = jwt.sign(
        { userId: user.user_id, email: user.email, roleId: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: user.user_id, roleId: user.role_id });
    } else {
      const result = await db.query(
        'INSERT INTO users (google_id, email, role_id) VALUES (?, ?, ?)',
        [googleId, email, 3] // Assuming a default role_id of 3 for new Google users
      );
      const newUserId = result.insertId;

      const accessToken = jwt.sign(
        { userId: newUserId, email, roleId: 3 }, // Assuming a default role_id of 3 for new Google users
        secretKey,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: newUserId, roleId: 3 });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

module.exports = router;
