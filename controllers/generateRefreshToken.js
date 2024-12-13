const { google } = require('googleapis');

const CLIENT_ID = '147757958619-pjf1lspe5hejpmojijnb49m6manmbcvf.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://ccs-research-repository.vercel.app/';

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

// After visiting the URL and authorizing, use the provided code to get the refresh token
// Replace 'YOUR_AUTHORIZATION_CODE' with the code from the URL
const getToken = async () => {
  const { tokens } = await oAuth2Client.getToken('YOUR_AUTHORIZATION_CODE');
  console.log('Refresh Token:', tokens.refresh_token);
};

getToken();
