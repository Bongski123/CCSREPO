
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use true for port 465
    auth: {
      user: 'almarioelopre2@gmail.com',
      pass: 'almario123'
    }
  });
  


router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
  
    try {
      const [users] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
  
      if (users.length === 0) {
        return res.status(404).json({ error: 'No user found with this email' });
      }
  
      const userId = users[0].user_id;
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // Token expires in 1 hour
  
      await db.query('INSERT INTO password_resets (user_id, token, expires) VALUES (?, ?, ?)', [userId, token, expires]);
  
      const resetUrl = `http://localhost:3000/reset-password/${token}`; // Adjust URL to your frontend route
  
      await transporter.sendMail({
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`
      });
  
      res.status(200).json({ message: 'Password reset link sent to your email' });
  
    } catch (error) {
      console.error('Error in /reset-password route:', error); // Log the error
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  


  router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
  
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
  
    try {
      const [rows] = await db.query('SELECT user_id FROM password_resets WHERE token = ? AND expires > ?', [token, new Date()]);
  
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }
  
      const userId = rows[0].user_id;
  
      // Hash the new password before saving it
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, userId]);
      await db.query('DELETE FROM password_resets WHERE token = ?', [token]);
  
      res.status(200).json({ message: 'Password successfully reset' });
  
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

  module.exports = router;