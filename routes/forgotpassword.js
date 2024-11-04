// server.js

const express = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mock database (replace with your actual database)
const users = {};

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint to send verification code
app.post('/send-code', async (req, res) => {
  const { email } = req.body;

  console.log('Received email:', email); // Log the received email

  if (!users[email]) {
    return res.status(404).json({ error: 'User not found' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit code

  // Send email
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code',
      text: `Your verification code is ${code}`,
    });

    // Store the code temporarily
    users[email].resetCode = code;

    res.status(200).json({ message: 'Verification code sent to your email!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Error sending email' });
  }
});

// Endpoint to verify code and reset password
app.post('/verify-code', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!users[email] || users[email].resetCode !== code) {
    return res.status(400).json({ error: 'Invalid code or email' });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  users[email].password = hashedPassword; // Store the new password
  delete users[email].resetCode; // Remove the reset code

  res.status(200).json({ message: 'Password has been reset successfully!' });
});

// Mock user registration for demonstration (you should have a real user registration flow)
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (users[email]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users[email] = { password: hashedPassword };

  res.status(201).json({ message: 'User registered successfully!' });
});

