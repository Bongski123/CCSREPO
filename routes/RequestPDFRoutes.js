const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // Optional: For sending email notifications
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
// Mock function to simulate storing the request in the database
const requestPdf = async ({ researchId, researchTitle, authorName, requesterName, requesterEmail, purpose }) => {
  // Replace with your actual database logic
  console.log('PDF Request Data:', { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose });
};

router.post('/request-pdf', async (req, res) => {
  const { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose } = req.body;

  // Validate input data
  if (!researchId || !researchTitle || !authorName || !requesterName || !requesterEmail || !purpose) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Step 1: Store the request in the database
    await requestPdf({ researchId, researchTitle, authorName, requesterName, requesterEmail, purpose });

    // Step 2: Send confirmation email to the requester
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER, // Ensure SMTP_USER is set in the environment variables
        pass: process.env.SMTP_PASS, // Ensure SMTP_PASS is set in the environment variables
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER, // Use the same email as SMTP_USER
      to: requesterEmail,
      subject: 'PDF Request Confirmation',
      text: `Dear ${requesterName},\n\nYour request for the PDF of the research titled "${researchTitle}" has been received. We will process your request shortly.\n\nBest regards,\nResearch Team`,
    };

    await transporter.sendMail(mailOptions);

    // Step 3: Send response to the client
    res.status(200).json({ message: 'Your PDF request has been successfully submitted and a confirmation email has been sent.' });
  } catch (error) {
    console.error('Error processing PDF request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request. Please try again later.' });
  }
});

module.exports = router;
