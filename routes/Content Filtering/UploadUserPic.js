const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require('stream');
const fs = require("fs");
const path = require("path");
const db = require("../../database/db");

const router = express.Router();

// Google Drive API setup using service account credentials from environment variable or direct object
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

const auth = new google.auth.GoogleAuth({
  credentials: googleServiceAccount, // Using credentials object directly
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });


// Helper to create a readable stream from a buffer
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// Route to upload profile picture
router.post("/upload-profile-pic", upload.single("profile_pic"), async (req, res) => {
    try {
      if (!req.file || !["image/jpeg", "image/png"].includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type, only JPG and PNG are allowed!" });
      }
  
      const { userId } = req.body;
  
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID!" });
      }
  
      // Upload file to Google Drive
      const fileMetadata = {
        name: req.file.originalname,
        parents: ["1USofwFzlABog7FfsEGtqpjBA2v4Fhyt9"], // Replace with your folder ID
      };
      const media = {
        mimeType: req.file.mimetype,
        body: bufferToStream(req.file.buffer),
      };
  
      const driveResponse = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id",
      });
  
      const fileId = driveResponse.data.id;
  
      // Update user profile with the file ID in the database
      const [existingUser] = await db.query("SELECT user_id FROM users WHERE user_id = ?", [userId]);
      if (existingUser.length === 0) {
        return res.status(404).json({ error: "User not found!" });
      }
  
      await db.query("UPDATE users SET profile_picture = ? WHERE user_id = ?", [fileId, userId]);
  
      res.status(200).json({ message: "Profile picture uploaded successfully!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "An error occurred while uploading the profile picture" });
    }
  });
  
module.exports = router;
