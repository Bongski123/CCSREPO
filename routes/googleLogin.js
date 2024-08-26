
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');

const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('1036498422383-tqe5q6d4sousal4ffj6vv79hqpm5qta1.apps.googleusercontent.com');

router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '1036498422383-tqe5q6d4sousal4ffj6vv79hqpm5qta1.apps.googleusercontent.com'
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    res.status(200).json({ token, userId: user.user_id });
  } catch (error) {
    res.status(401).json({ error: 'Invalid Google token' });
  }
});


module.exports = router;