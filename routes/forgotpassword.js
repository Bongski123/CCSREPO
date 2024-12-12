// Import required modules
const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mock database for testing (Replace with a real database in production)
const users = {}; // Example structure: { 'email@example.com': { password: 'hashedPassword', resetCode: '123456' } }

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Email transporter is ready to send emails.');
  }
});

// Endpoint to send a password reset code
app.post('/send-code', async (req, res) => {
  const { email } = req.body;

  console.log('Password reset request received for email:', email);

  if (!users[email]) {
    return res.status(404).json({ error: 'User not found' });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code',
      text: `Your verification code is ${resetCode}`,
    });

    users[email].resetCode = resetCode;

    console.log(`Reset code sent successfully to ${email}:`, resetCode);
    res.status(200).json({ message: 'Verification code sent to your email!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Error sending email' });
  }
});

// Endpoint to verify the reset code and reset password
app.post('/verify-code', async (req, res) => {
  const { email, code, newPassword } = req.body;

  console.log('Verification request received for email:', email);

  if (!users[email] || users[email].resetCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code or email' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[email].password = hashedPassword;
    delete users[email].resetCode;

    console.log(`Password reset successfully for ${email}`);
    res.status(200).json({ message: 'Password has been reset successfully!' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

// Mock user registration for testing purposes
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  console.log('Registration request received for email:', email);

  if (users[email]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users[email] = { password: hashedPassword };

    console.log(`User registered successfully: ${email}`);
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
