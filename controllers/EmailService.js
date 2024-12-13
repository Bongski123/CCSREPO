const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// Your Gmail API credentials
const CLIENT_ID = '147757958619-pjf1lspe5hejpmojijnb49m6manmbcvf.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://ccs-research-repository.vercel.app/';
const REFRESH_TOKEN = 'YOUR_REFRESH_TOKEN'; // You will generate this token

// Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Set the refresh token
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Function to send email
async function sendEmail(to, subject, text) {
  try {
    // Generate access token
    const accessToken = await oAuth2Client.getAccessToken();

    // Create a Nodemailer transporter using Gmail API
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'your-email@gmail.com', // Replace with your Gmail address
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // Email options
    const mailOptions = {
      from: 'your-email@gmail.com', // Replace with your Gmail address
      to: to,
      subject: subject,
      text: text,
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = sendEmail;
