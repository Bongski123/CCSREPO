const express = require('express');
const sendEmail = require('./emailService'); // Adjust the path as needed

const router = express.Router();

router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  try {
    const verificationCode = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit code
    const message = `Your password reset code is: ${verificationCode}`;

    // Save verification code to the database here...

    await sendEmail(email, 'Password Reset Request', message);
    res.status(200).json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
