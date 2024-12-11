const nodemailer = require('nodemailer');
const db = require('../database/db'); // Import your database connection
const dotenv = require('dotenv');
dotenv.config();
// Set up email transport using Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'ncfresearchnexus@gmail.com', // Ensure SMTP_USER is set in the environment variables
    pass: process.env.SMTP_PASS || 'frdjxzlyivcdoqha', // Ensure SMTP_PASS is set in the environment variables
  },
});


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

// Function to send email notification to all authors
const sendEmailNotification = async (researchId, researchTitle, requesterName, requesterEmail, purpose) => {
  try {
    // Step 1: Get all authors' emails for the given researchId
    const authorEmails = await getAuthorsEmails(researchId);

    if (authorEmails.length === 0) {
      console.log('No authors found for this research');
      return;
    }

    // Step 2: Loop through authors' emails and send emails
    authorEmails.forEach((authorEmail) => {
      const mailOptions = {
        from: process.env.SMTP_USER || 'ncfresearchnexus@gmail.com', // Sender address
        to: authorEmail, // Recipient address
        subject: 'PDF Request for Your Research Document',
        text: `Hello,

You have received a request for your research titled "${researchTitle}" from ${requesterName} (${requesterEmail}).

Purpose: ${requesterName} has requested the document for the purpose of: ${purpose}.

Please respond to the request accordingly.

Best regards,
Your Research System`,
      };

      // Step 3: Send the email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error sending email:', err);
        } else {
          console.log('Email sent to author: ' + info.response);
        }
      });
    });
  } catch (err) {
    console.error('Error in sending email notification:', err);
  }
};

module.exports = sendEmailNotification;
