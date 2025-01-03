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
    // Step 1: Fetch request details, including research authors
    const [results] = await db.query(`
      SELECT 
        pr.requester_email, 
        pr.requester_name, 
        r.title AS research_title, 
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors
      FROM pdf_requests pr
      JOIN researches r ON pr.research_id = r.research_id
      LEFT JOIN research_authors ra ON r.research_id = ra.research_id
      LEFT JOIN authors a ON ra.author_id = a.author_id
      WHERE pr.request_id = ?
      GROUP BY pr.requester_email, pr.requester_name, r.title
    `, [requestId]);

    if (results.length === 0) {
      console.log('Request not found');
      return res.status(404).send('PDF request not found');
    }

    const { requester_email, requester_name, research_title, authors } = results[0];

    console.log(`Rejecting request for: ${requester_name}, Email: ${requester_email}, Title: ${research_title}, Authors: ${authors}`);

    // Step 2: Update status to "Rejected"
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
          <p>Author(s): ${authors || 'Unknown'}</p>
          <p>If you have any questions or concerns, please feel free to reach out.</p>
          <p>Thank you for your understanding.</p>
          <p>Best regards,<br/>${authors || 'The Authors'}</p>
        `,
      });

      console.log('Rejection email sent successfully');

      // Step 4: Delete the request from the database
      await db.query('DELETE FROM pdf_requests WHERE request_id = ?', [requestId]);
      console.log('Request deleted successfully');

      // Step 5: Respond with success message
      return res.status(200).send('PDF request rejected, email sent, and request deleted successfully');
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
