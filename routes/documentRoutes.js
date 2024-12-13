const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require('stream');
const fs = require("fs");
const path = require("path");
const db = require("../database/db");

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

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;

    // Validate required fields
    if (!title || !abstract || !uploader_id || !authors || !categories || !keywords) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    // Upload file to Google Drive
    const fileMetadata = {
      name: req.file.originalname, // Use the original file name
      parents: ["1z4LekckQJPlZbgduf5FjDQob3zmtAElc"], // Replace with your folder ID
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

    // Validate uploader_id
    if (!uploader_id || isNaN(uploader_id)) {
      return res.status(400).json({ error: "Invalid uploader ID!" });
    }

    // Check the roleId of the uploader
    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);

    if (!uploader) {
      return res.status(404).json({ error: "Uploader not found!" });
    }

    // Insert research into the database
    const [researchResult] = await db.query(
      "INSERT INTO researches (title, abstract, filename, status, uploader_id, publish_date) VALUES (?, ?, ?, ?, ?, NOW())",
      [title, abstract, fileId, "pending", uploader_id]
    );
    const research_id = researchResult.insertId;

    // Insert research authors
    for (const author of authors.split(",")) {
      const [authorResult] = await db.query(
        "INSERT INTO authors (author_name) VALUES (?) ON DUPLICATE KEY UPDATE author_name = author_name",
        [author.trim()]
      );
      const author_id = authorResult.insertId;
      await db.query("INSERT INTO research_authors (research_id, author_id) VALUES (?, ?)", [research_id, author_id]);
    }

    // Insert categories
    for (const category of categories.split(",")) {
      const [categoryResult] = await db.query(
        "INSERT INTO category (category_name) VALUES (?) ON DUPLICATE KEY UPDATE category_name = category_name",
        [category.trim()]
      );
      const category_id = categoryResult.insertId;
      await db.query("INSERT INTO research_categories (research_id, category_id) VALUES (?, ?)", [research_id, category_id]);
    }

    // Insert keywords
    for (const keyword of keywords.split(",")) {
      const [keywordResult] = await db.query(
        "INSERT INTO keywords (keyword_name) VALUES (?) ON DUPLICATE KEY UPDATE keyword_name = keyword_name",
        [keyword.trim()]
      );
      const keyword_id = keywordResult.insertId;
      await db.query("INSERT INTO research_keywords (research_id, keyword_id) VALUES (?, ?)", [research_id, keyword_id]);
    }

    res.status(200).json({ message: "Research uploaded successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during the upload process" });
  }
});








// DELETE research and associated records
router.delete('/delete-research/:research_id', async (req, res) => {
  const researchId = req.params.research_id;

  if (!researchId) {
      return res.status(400).json({ message: 'Research ID is required.' });
  }

  // Start a transaction
  const connection = await db.getConnection(); // Assuming you're using a connection pool
  await connection.beginTransaction();

  try {
      // Deleting associated records
      const queries = [
          'DELETE FROM research_categories WHERE research_id = ?',
          'DELETE FROM search_logs WHERE research_id = ?',
          'DELETE FROM collections WHERE research_id = ?',
          'DELETE FROM notifications WHERE notification_id = ?',
          'DELETE FROM research_keywords WHERE research_id = ?',
          'DELETE FROM research_authors WHERE research_id = ?',
          'DELETE FROM researches WHERE research_id = ?'
      ];

      for (const query of queries) {
          await connection.execute(query, [researchId]);
      }

      // Commit the transaction
      await connection.commit();
      res.status(200).json({ message: 'Research and associated records deleted successfully.' });
  } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: 'An error occurred while deleting the research.' });
  } finally {
      // Release the connection
      connection.release();
  }
});

module.exports = router;
