
const express = require('express');

const db = require('../../database/db'); // Import database connection
const { google } = require('googleapis');
const router = express.Router();


const googleServiceAccount = {
    type: "service_account",
    project_id: "ccsrepository-444308",
    private_key_id: "ad95bb0e9b7b40f9b43b2dd9dc33cc3eb925bce9",
    private_key: `-----BEGIN PRIVATE KEY-----
  MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVgISVob0EV2BE
  T0NXxB6R/TCLwgZzGG3ivK7uzoIJoGQPKLSkABLu0/3GNdwMx4ZEOOsEr+EMyUhp
  8LMj9iik9mOyb+R4kEDAEQlQZ0+HvK/Yabm67umX/6dGRv7JCC+yNRP28XQ9GuOU
  SmmhEqnmmga2lWp+mPBl6W6nX7gOAIj6xtugYU1IRAIZ0Yxs8eVTp5y4mh7sWqko
  xXUmkSCcLY6Wm1zlR8yHTExSL/QPmnWUNyOqyIg6bvRq3nAwYdGLUZRoTa1TWnQO
  ewqa1GM9aouAI0d+RsCw//UEG2V4v+kxkso21dB9YmmKbSnyRairNr2IIeyNrPWL
  NZShI6UHAgMBAAECggEAEXK2CY2ujYiS5yvV7fn3ogIS/q2/hC/Zzx73ahaTXWdv
  tfNwK9T1UL8fbRyHgr3aaBnn6KBAOdP7TuxRksQYinHrMBdH3ZIaA8UaQalnwC9e
  uZN0wjIQAhC6rwCFuV0pzk90woiO2AcqB4ghsMmxlXulLJryZi0073ppXu4jwKg+
  H9vdUlzNYUUHJVvHWIiv+ITN43Xx0EYRIe6n5e/ZeZ4hAFqtmqzb+rSOXgmgqIMw
  oGBW/OZbvlkJsGWHyGZeZSLL+iJXNDJDk8YFv3arpbInBk3OYQk9UPYY82l3f1au
  DlWtL389kSgyJ/Gfvr30qDhs1WEN5Te2//HZu5l7YQKBgQDrH5WbxHJzk/Hc1jpK
  JQmUlB2t26Cv+/+fOzAz5KHgFX2RLjXIHl5iufib3HM+nbUOe66As7U0r7/Va0Nn
  1qppy05HL4ZzA36bsQ8Fw5prdVQjjU+r4c1wEaY8O13ckzL6qKZIOGNEuBF0vRoq
  zGxN8iYsZ3MW6JX7E3zK/FvpYQKBgQDodXl5CJMw/67n6o/DlmnoxMdUNKXvyoxs
  Udz/daKX682tGBLa06u1ZCCMCJYgahQwqRv15apTscOvy5sBQraz8H/UGc3v0AZ0
  Dz5zyOaLw9pHv9C7MuDRhzd708Q3Z/Gh4YK6+syae6gposLh1wLqIbRUOTuCZGA6
  RSFZ4qYfZwKBgQCczEZgR6Sv0RS1WiQrOAHolNIqFFJXqi0xSi5+HNWa85n2jKOP
  HjmBi1Xw0xYDxvZsfyzDZZTNWvsKX2rnP7ALt2ovbNEzuDvhpjVHecdsLCV9RArC
  rGXte8epWUniBEQ2BuxFM114AWyatlVR/1umq3qrmB2XRGposvlBAQRmYQKBgQCS
  lwIzQSURESvLNC/Ut1WyY+UPROQfgytqY3Vp41TVWO4q6bN6K2Fs0ed0ZzXE2yBA
  T2RCfMIcZU1x3oOxF9D/R/pUVrF3OUfYiIRpn5dDLA7KkDug0UTU3OAwRirGhdXq
  r7sxDldYVAKHvwwGPwCnhPmi4zST1ZiZJl8Rv8vioQKBgQDOiy1z7ezJzgJSNoKz
  ee5zOWdsSRkxHBKRtc1vbBIxEg+z+838+TxXf2EJhkOA11OQptLGZ41iziR41P6A
  qZRp3lzXySc6REVOJI969AZSGovOFYPX6YguCb6X4wSuc/Avn+3AT/0bE6eMTAhX
  FgTYhJbE4mHJCmVUxn1C+iUleg==\n-----END PRIVATE KEY-----`,
    client_email: "ccsrepo@ccsrepository-444308.iam.gserviceaccount.com",
    client_id: "103197742225204345135",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ccsrepo%40ccsrepository-444308.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  };
// Google Drive API setup using service account
const auth = new google.auth.GoogleAuth({
    credentials: googleServiceAccount,
    scopes: ["https://www.googleapis.com/auth/drive"], // Required scope for file access
});
const drive = google.drive({
    version: "v3",
    auth,
});


router.get('/profilepic/authors/:authorId', async (req, res) => {
    const authorId = req.params.authorId;
  
    try {
      // Step 1: Get author details by authorId
      const [authorRows] = await db.execute('SELECT author_name, email FROM authors WHERE author_id = ?', [authorId]);
  
      if (authorRows.length === 0) {
        return res.status(404).json({ message: "Author not found" });
      }
  
      const author = authorRows[0];
      
      const [userRows] = await db.execute(`
        SELECT u.profile_picture, p.program_name
        FROM users u
        JOIN program p ON u.program_id = p.program_id
        WHERE u.email = ?`, [author.email]);
  
      let profilePictureFileId = null;
      let programName = null;
    
      if (userRows.length > 0) {
        profilePictureFileId = userRows[0].profile_picture; // Get the profile picture file_id if found
        programName = userRows[0].program_name; // Get the program_name if found
      }
  
      if (!profilePictureFileId) {
        return res.status(404).json({ message: "Profile picture not found for this user" });
      }
  
      try {
        // Step 3: Fetch file metadata from Google Drive
        const metadataResponse = await drive.files.get({
          fileId: profilePictureFileId,
          fields: 'name, mimeType',
        });
  
        // Step 4: Check if the file is an image
        if (!metadataResponse.data.mimeType.startsWith('image/')) {
          return res.status(400).json({ message: "The file is not an image" });
        }
  
        // Step 5: Fetch the image content from Google Drive
        const driveResponse = await drive.files.get({
          fileId: profilePictureFileId,
          alt: 'media',
        }, { responseType: 'arraybuffer' });
  
        // Step 6: Send the image file to the client
        res.setHeader('Content-Type', metadataResponse.data.mimeType);
        res.setHeader('Content-Disposition', 'inline; filename="' + metadataResponse.data.name + '"');
        res.send(Buffer.from(driveResponse.data));
      } catch (err) {
        console.error('Error fetching the profile picture from Google Drive:', err.message);
        res.status(500).json({ message: "Error fetching the profile picture" });
      }
  
    } catch (err) {
      console.error('Error fetching author details:', err.message);
      res.status(500).json({ message: "Error fetching author details" });
    }
});


  module.exports = router;