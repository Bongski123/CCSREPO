// Import required modules
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

// Mock database (replace with your actual database in production)
const users = {}; // Example: { 'test@example.com': { password: 'hashedPassword', resetCode: '123456' } }

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER, // Environment variable for email
    pass: process.env.EMAIL_PASS, // Environment variable for app-specific password
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Email transporter is ready to send emails.');
  }
});

/**
 * Endpoint to send a password reset code to the user's email
 */
app.post('/send-code', async (req, res) => {
  const { email } = req.body;

  console.log('Password reset request received for email:', email);

  // Check if the user exists
  if (!users[email]) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate a random 6-digit reset code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Send email with the reset code
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code',
      text: `Your verification code is ${code}`,
    });

    // Store the code temporarily in the mock database
    users[email].resetCode = code;

    console.log('Reset code sent successfully to:', email);
    res.status(200).json({ message: 'Verification code sent to your email!' });
  } catch (error) {
    console.error('Error sending email:', error.message);
    res.status(500).json({ error: 'Error sending email' });
  }
});

/**
 * Endpoint to verify the reset code and reset the user's password
 */
app.post('/verify-code', async (req, res) => {
  const { email, code, newPassword } = req.body;

  console.log('Password reset verification received for email:', email);

  // Validate the code and email
  if (!users[email] || users[email].resetCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code or email' });
  }

  // Hash the new password and update the mock database
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[email].password = hashedPassword;
    delete users[email].resetCode; // Remove the reset code

    console.log('Password reset successfully for email:', email);
    res.status(200).json({ message: 'Password has been reset successfully!' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

/**
 * Mock user registration endpoint (for testing purposes only)
 */
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  console.log('Registration request received for email:', email);

  // Check if the user already exists
  if (users[email]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Hash the password and store the user in the mock database
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users[email] = { password: hashedPassword };

    console.log('User registered successfully:', email);
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Start the server
const PORT = process.env.PORT ;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
