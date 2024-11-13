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
    const { sub: googleId, email, name, picture } = payload; // Include picture

    // Check if the user already exists in the database
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (user) {
      // User exists, generate JWT token
      const accessToken = jwt.sign(
        { userId: user.user_id, name: user.name, email: user.email, roleId: user.role_id, picture: user.profile_picture || picture }, // Include profile picture
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Return response with the token, user info, and picture
      return res.status(200).json({
        token: accessToken,
        userId: user.user_id,
        roleId: user.role_id,
        userExists: true,
        picture: user.profile_picture || picture, // Return profile picture if available
      });
    } else {
      // User does not exist, do not insert yet. Just return userExists flag and profile picture
      return res.status(200).json({
        userExists: false,
        email,
        name,
        picture, // Include Google profile picture URL for use during signup
      });
    }
  } catch (error) {
    console.error('Error during Google login:', error);
    return res.status(401).json({ error: 'Invalid Google token or error processing request' });
  }
});

module.exports = router;
