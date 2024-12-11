const nodemailer = require('nodemailer');
const db = require('../database/db'); // Import database connection
require('dotenv').config(); // Load environment variables

// Set up email transport using Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'ncfresearchnexus@gmail.com',
    pass: process.env.SMTP_PASS || 'iirehsogzzsadbwk', // Use app password if needed
  },
});

/**
 * Fetches authors' emails for a given research ID from the database.
 * @param {number} researchId - The ID of the research document.
 * @returns {Promise<string[]>} - A promise resolving to an array of author email addresses.
 */
const getAuthorsEmails = async (researchId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT a.email 
      FROM authors a
      JOIN research_authors ra ON a.author_id = ra.author_id
      WHERE ra.research_id = ?`;

    db.query(query, [researchId], (err, results) => {
      if (err) {
        return reject(new Error(`Error fetching authors' emails: ${err.message}`));
      }
      const emails = results.map(result => result.email);
      resolve(emails);
    });
  });
};

/**
 * Sends email notifications to authors regarding a PDF request.
 * @param {number} researchId - The ID of the research document.
 * @param {string} researchTitle - The title of the research document.
 * @param {string} requesterName - Name of the person requesting the PDF.
 * @param {string} requesterEmail - Email of the person requesting the PDF.
 * @param {string} purpose - Purpose of the request.
 */
const sendEmailNotification = async (researchId, researchTitle, requesterName, requesterEmail, purpose) => {
  try {
    // Step 1: Fetch all authors' emails for the research ID
    const authorEmails = await getAuthorsEmails(researchId);

    if (!authorEmails.length) {
      console.log('No authors found for this research.');
      return;
    }

    // Step 2: Prepare email options
    const emailPromises = authorEmails.map((authorEmail) => {
      const mailOptions = {
        from: process.env.SMTP_USER || 'ncfresearchnexus@gmail.com',
        to: authorEmail,
        subject: `PDF Request for Your Research Document`,
        text: `
          Hello,

          You have received a request for your research titled "${researchTitle}" 
          from ${requesterName} (${requesterEmail}).

          Purpose: ${purpose}.

          Please respond to the request accordingly.

          Best regards,
          Research Team
        `,
      };

      // Step 3: Send email
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises); // Send all emails concurrently
    console.log('Emails sent successfully.');
  } catch (error) {
    console.error('Error in sending email notifications:', error.message);
  }
};

module.exports = sendEmailNotification;
