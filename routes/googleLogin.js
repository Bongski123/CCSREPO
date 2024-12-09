const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../database/db');
const dotenv = require('dotenv');

const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ;
const JWT_SECRET = process.env.JWT_SECRET; 
dotenv.config()
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/google-login', async (req, res) => {
  const { id_token } = req.body;

  if (!id_token) {
    return res.status(400).json({ error: 'ID token is required' });
  }

  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if the user already exists in the database
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (user) {
      // User exists, generate JWT token and include user_id
      const accessToken = jwt.sign(
        { 
          userId: user.user_id, // Include user_id in the token
          firstName: user.first_name, 
          lastName: user.last_name,
          email: user.email, 
          roleId: user.role_id, 
          picture: user.profile_picture || picture 
        },
        JWT_SECRET,
        { expiresIn: '1h' } // Token expiration set to 1 hour
      );

      return res.status(200).json({
        token: accessToken, // Send the generated JWT token
        userId: user.user_id, // Include userId in the response
        roleId: user.role_id,
        userExists: true,
        name: user.name,
        picture: user.profile_picture || picture, // Profile picture from database or Google
      });
    } else {
      // User does not exist, return necessary info for signup
      return res.status(200).json({
        userExists: false,
        email,
        name,
        picture, // Profile picture URL from Google
      });
    }
  } catch (error) {
    console.error('Error during Google login:', error);
    return res.status(401).json({ error: 'Invalid Google token or error processing request' });
  }
});

module.exports = router;
