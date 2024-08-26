const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const client = new OAuth2Client('1036498422383-tqe5q6d4sousal4ffj6vv79hqpm5qta1.apps.googleusercontent.com');

router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '1036498422383-tqe5q6d4sousal4ffj6vv79hqpm5qta1.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    // Check if the user exists in the database
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
      // Generate JWT token
      const accessToken = jwt.sign(
        { userId: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: user.user_id });
    } else {
      // If user does not exist, create a new user
      const result = await db.query(
        'INSERT INTO users (google_id, email) VALUES (?, ?)',
        [googleId, email]
      );
      const newUserId = result.insertId;

      // Generate JWT token
      const accessToken = jwt.sign(
        { userId: newUserId, email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: accessToken, userId: newUserId });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

module.exports = router;
