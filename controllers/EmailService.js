// emailService.js
const nodemailer = require('nodemailer');

// Set up email transport using Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // or another email service like Outlook, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Function to send email to authors
const sendEmailNotification = (authorEmail, researchTitle, requesterName, requesterEmail, purpose) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: authorEmail, // Recipient address
    subject: 'PDF Request for Your Research Document',
    text: `Hello,

You have received a request for your research titled "${researchTitle}" from ${requesterName} (${requesterEmail}).

Purpose: ${requesterName} has requested the document for the purpose of: ${purpose}.

Please respond to the request accordingly.

Best regards,
Your Research System`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Email sent to author: ' + info.response);
    }
  });
};

module.exports = sendEmailNotification;
