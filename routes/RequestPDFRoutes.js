const express = require('express');
const db = require('../database/db');
const nodemailer = require('nodemailer');


const router = express.Router();



// Create a transporter object using Gmail (or another email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: 'ncfresearchnexus@gmail.com', // Your email
    pass: 'apnrnhrzikfjshut', // Your email password or app-specific password
  },
});


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
    // Step 1: Fetch request details (requester's name, email, and research title)
    const [results] = await db.query(`
      SELECT requester_email, requester_name, research_title 
      FROM pdf_requests 
      WHERE request_id = ?
    `, [requestId]);

    if (results.length === 0) {
      console.log('Request not found');
      return res.status(404).send('PDF request not found');
    }

    const { requester_email, requester_name, research_title } = results[0];

    console.log(`Rejecting request for: ${requester_name}, Email: ${requester_email}, Title: ${research_title}`);

    // Step 2: Update the request status to 'Rejected'
    await db.query('UPDATE pdf_requests SET status = ? WHERE request_id = ?', ['Rejected', requestId]);

    // Step 3: Send rejection email
    try {
      await transporter.sendMail({
        from: 'CCS Repository Team <ncfresearchnexus@gmail.com>',
        to: requester_email,
        subject: 'PDF Request Rejected',
        html: `
          <p>Dear ${requester_name},</p>
          <p>We regret to inform you that your request for the research titled <b>"${research_title}"</b> has been rejected.</p>
          <p>If you have any questions or concerns, please feel free to reach out.</p>
          <p>Thank you for your understanding.</p>
          <p>Best regards,<br/>CCS Repository Team</p>
        `,
      });

      console.log('Rejection email sent successfully');

      // Step 4: Respond with success message
      return res.status(200).send('PDF request rejected and email sent successfully');
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError.message);
      return res.status(500).send('Request rejected, but failed to send rejection email');
    }
  } catch (error) {
    console.error('Error rejecting PDF request:', error.message);
    return res.status(500).send('Internal Server Error');
  }
});
module.exports = router;
