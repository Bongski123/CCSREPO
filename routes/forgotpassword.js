// Required modules
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('./db'); // Import your MySQL connection pool

const app = express();
app.use(express.json());

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Use your preferred email service
  auth: {
    user: 'ncfresearchnexus@gmail.com', // Replace with your email
    pass: 'vkpiuxczvziqaqdl', // Replace with your email password or app password
  },
});

// Route to request a password reset
app.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email exists in the database
    const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user.length) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Generate a verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store the code in the database with an expiry time (e.g., 15 minutes)
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await pool.query(
      'UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?',
      [verificationCode, expiryTime, email]
    );

    // Send the verification code via email
    await transporter.sendMail({
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset Verification Code',
      text: `Your verification code is: ${verificationCode}`,
    });

    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Route to verify the code
app.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const [user] = await pool.query('SELECT otp, otp_expiry FROM users WHERE email = ?', [email]);
    if (!user.length) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const { otp, otp_expiry } = user[0];

    // Check if the code is correct and not expired
    if (otp !== code || new Date() > new Date(otp_expiry)) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    res.json({ message: 'Verification code is valid' });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Route to reset the password
app.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const [user] = await pool.query('SELECT otp, otp_expiry FROM users WHERE email = ?', [email]);
    if (!user.length) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const { otp, otp_expiry } = user[0];

    // Check if the code is correct and not expired
    if (otp !== code || new Date() > new Date(otp_expiry)) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await pool.query('UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?', [
      hashedPassword,
      email,
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Start the server
const PORT = process.env.PORT || 10121;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
