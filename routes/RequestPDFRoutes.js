const express = require('express');
const db = require('../database/db');
const nodemailer = require('nodemailer');


const router = express.Router();



// Create a transporter object using Gmail (or another email service)
const sendRejectionEmail = async (email, name, title) => {
  const transporter = nodemailer.createTransport({
      service: 'gmail', // or your email provider
      auth: {
          user: 'ncfresearchnexus@gmail.com', // Your email
          pass: 'apnrnhrzikfjshut', // Your email password or app-specific password
      },
  });

  const mailOptions = {
    from: 'ncfresearchnexus@gmail.com',
    to: email,
    subject: 'PDF Request Rejected',
    html: `
      <p>Dear ${name},</p>
      <p>We regret to inform you that your request for the research titled <b>"${title}"</b> has been rejected.</p>
      <p>If you have further concerns or questions, please feel free to reach out.</p>
      <p>Thank you for your understanding.</p>
      <p>Best regards,<br/>CCS Repository Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};


// POST /request-pdf endpoint
router.post('/request-pdf-files', (req, res) => {
  const { researchId, requesterName, requesterEmail, purpose } = req.body;
  

  // Step 1: Fetch the research title based on researchId
  db.query(
    'SELECT title FROM researches WHERE research_id = ?',
    [researchId],
    (err, results) => {
      if (err) {
        console.error('Error fetching research details:', err);
        return res.status(500).json({ error: 'Error fetching research details' });
      }

      const researchTitle = results[0]?.title;

      if (!researchTitle) {
        return res.status(404).json({ error: 'Research not found' });
      }

      // Step 2: Insert the PDF request into the 'pdf_requests' table
      db.query(
        'INSERT INTO pdf_requests (research_id,research_title, requester_name, requester_email, purpose) VALUES (?, ?, ?, ?,?)',
        [researchId,researchTitle, requesterName, requesterEmail, purpose],
        (err, result) => {
          if (err) {
            console.error('Error inserting request into database:', err);
            return res.status(500).json({ error: 'Error inserting request into database' });
          }

         
            }
          );
        }
      );
    

});



// Reject PDF request (this assumes the request_id is passed in the URL)
router.post('/reject-pdf-request/:request_id', async (req, res) => {
  const requestId = req.params.request_id;

  try {
    // Step 1: Fetch the request details (like research title, requester's name, and email)
    const query = 'SELECT requester_email, requester_name, research_title FROM pdf_requests WHERE request_id = ?';
    db.query(query, [requestId], async (err, results) => {
      if (err) {
        console.error('Error fetching PDF request details:', err);
        return res.status(500).json({ message: 'Error fetching PDF request details' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'PDF request not found' });
      }

      const { requester_email, requester_name, research_title } = results[0];

      // Step 2: Update the request status to 'Rejected'
      const updateQuery = 'UPDATE pdf_requests SET status = "Rejected" WHERE request_id = ?';
      db.query(updateQuery, [requestId], async (err, result) => {
        if (err) {
          console.error('Error updating PDF request status:', err);
          return res.status(500).json({ message: 'Error updating PDF request status' });
        }

        // Step 3: Send rejection email
        try {
          await sendRejectionEmail(requester_email, requester_name, research_title);
          return res.status(200).json({ message: 'PDF request rejected and email sent successfully' });
        } catch (emailError) {
          console.error('Error sending rejection email:', emailError);
          return res.status(500).json({ message: 'PDF request rejected, but failed to send email' });
        }
      });
    });
  } catch (error) {
    console.error('Error rejecting PDF request:', error);
    return res.status(500).json({ message: 'Failed to reject PDF request' });
  }
});

module.exports = router;
