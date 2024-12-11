const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // For sending emails
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('../database/db'); // Import your database connection


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mock function to simulate storing the request in the database
const requestPdf = async ({ researchId, researchTitle, authorName, requesterName, requesterEmail, purpose }) => {
  // Replace with your actual database logic
  console.log('PDF Request Data:', { researchId, researchTitle, authorName, requesterName, requesterEmail, purpose });
};

// Function to fetch authors' emails for a given research_id
const getAuthorsEmails = (researchId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT a.email FROM authors a ' +
      'JOIN research_authors ra ON a.author_id = ra.author_id ' +
      'WHERE ra.research_id = ?',
      [researchId],
      (err, results) => {
        if (err) {
          reject('Error fetching authors emails: ' + err);
        } else {
          resolve(results.map(result => result.email));
        }
      }
    );
  });
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

    // Step 2: Fetch authors' emails for the given researchId
    const authorEmails = await getAuthorsEmails(researchId);

    if (authorEmails.length === 0) {
      return res.status(404).json({ error: 'No authors found for this research' });
    }

    // Step 3: Send email to each author
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 465,
      auth: {
        user: process.env.SMTP_USER || 'ncfresearchnexus@gmail.com', // Ensure SMTP_USER is set in the environment variables
        pass: process.env.SMTP_PASS || 'iirehsogzzsadbwk', // Ensure SMTP_PASS is set in the environment variables
      },
    });

    // Loop through each author and send the email
    for (const authorEmail of authorEmails) {
      const mailOptions = {
        from: process.env.SMTP_USER || 'ncfresearchnexus@gmail.com',
        to: authorEmail, // Send to the author's email
        subject: 'PDF Request for Your Research Document',
        text: `Hello,

You have received a request for your research titled "${researchTitle}" from ${requesterName} (${requesterEmail}).

Purpose: ${requesterName} has requested the document for the purpose of: ${purpose}.

Please respond to the request accordingly.

Best regards,
Your Research System`,
      };

      await transporter.sendMail(mailOptions);
    }

    // Step 4: Send response to the client
    res.status(200).json({
      message: 'Your PDF request has been successfully submitted. Authors have been notified.',
    });
  } catch (error) {
    console.error('Error processing PDF request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request. Please try again later.' });
  }
});

module.exports = router;
