const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../database/db');
const router = express.Router();

// Setup nodemailer transporter directly with credentials
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
      user: 'ncfresearchnexus@gmail.com ', // Your Gmail address
      pass: 'vkpiuxczvziqaqdlo', // Your App Password (make sure to remove any spaces)
  },
});


// Endpoint to initiate password reset
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ error: 'Email is required' });
  }

  try {
      const [users] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);

      if (users.length === 0) {
          return res.status(404).json({ error: 'No user found with this email' });
      }

      // Generate a verification code
      const code = crypto.randomInt(100000, 999999).toString(); // Random 6-digit code
      const expires = new Date(Date.now() + 300000); // Code expires in 5 minutes

      // Store the code in the database (you may want to create a separate table for this)
      await db.query('INSERT INTO password_resets (user_id, code, expires) VALUES (?, ?, ?)', [users[0].user_id, code, expires]);

      // Send the verification code via email
      await transporter.sendMail({
          to: email,
          subject: 'Password Reset Code',
          text: `Your password reset code is: ${code}. It will expire in 5 minutes.`,
      });

      res.status(200).json({ message: 'Verification code sent to your email' });

  } catch (error) {
      console.error('Error in /request-password-reset route:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});
// Endpoint to reset password using the token
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
      const [rows] = await db.query('SELECT user_id FROM password_resets WHERE code = ? AND expires > ?', [code, new Date()]);

      if (rows.length === 0) {
          return res.status(400).json({ error: 'Invalid or expired code' });
      }

      const userId = rows[0].user_id;

      // Hash the new password before saving it
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, userId]);
      // Optionally delete the code from the database
      await db.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);

      res.status(200).json({ message: 'Password successfully reset' });

  } catch (error) {
      console.error('Error in /reset-password route:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { code } = req.body; // Only need the code here

  if (!code) {
      return res.status(400).json({ error: 'Code is required' });
  }

  try {
      const [rows] = await db.query('SELECT * FROM password_resets WHERE code = ? AND expires > ?', [code, new Date()]);

      if (rows.length === 0) {
          return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      res.status(200).json({ message: 'Code verified successfully', userId: rows[0].user_id }); // Send userId if needed
  } catch (error) {
      console.error('Error verifying code:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
