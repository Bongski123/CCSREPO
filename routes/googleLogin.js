const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

// Replace with the correct Google OAuth Client ID
const client = new OAuth2Client('1036498422383-tqe5q6d4sousal4ffj6vv79hqpm5qta1.apps.googleusercontent.com');

router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '1036498422383-tqe5q6d4sousal4ffj6vv79hqpm5qta1.apps.googleusercontent.com', // This should match the client ID
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
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: newUserId, roleId: 3 });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

module.exports = router;
