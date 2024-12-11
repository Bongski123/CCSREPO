const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');  // Optional: For sending email notifications


router.post('/request-pdf', async (req, res) => {
  const { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose } = req.body;

  // Validate input data
  if (!researchId || !researchTitle || !authorName || !requesterName || !requesterEmail || !purpose) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Optionally, store the request in the database
  try {
    await requestPdf({
      researchId,
      researchTitle,
      authorName,
      requesterName,
      requesterEmail,
      purpose,
    });

    // Send confirmation email (optional)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: requesterEmail,
      subject: 'PDF Request Confirmation',
      text: `Dear ${requesterName},\n\nYour request for the PDF of the research titled "${researchTitle}" has been received. We will process your request shortly.\n\nBest regards,\nResearch Team`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Your PDF request has been successfully submitted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

module.exports = router;
