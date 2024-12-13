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
    if (uploader.length === 0) {
      return res.status(404).json({ error: "Uploader not found!" });
    }

    const role_id = uploader[0].role_id;

    // Set the default status
    let status = role_id === 1 ? "approved" : "pending";

    // Check if title already exists
    const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument.length > 0) {
      return res.status(409).json({ error: "Document with this title already exists!" });
    }

    // Insert research with the file ID from Google Drive
    const [insertResult] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)", 
      [title, abstract, req.file.originalname, uploader_id, status, fileId]  // Use req.file.originalname for filename
    );
    const researchId = insertResult.insertId;  // Capture the researchId here

    // Insert research with the file ID from Google Drive
    const [result] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)", 
      [title, abstract, req.file.originalname, uploader_id, status, fileId]  // Use req.file.originalname for filename
    );
    const insertAuthors = async (researchId, authors) => {
      for (const { name, email } of authors) {
          if (!name || !email) {
              console.error('Author name or email is missing:', { name, email });
              continue; // Skip invalid entries
          }
  
          // Check if the author already exists in the authors table based on name and email
          let [author] = await db.query('SELECT author_id FROM authors WHERE author_name = ? AND email = ?', [name, email]);
  
          if (author.length === 0) {
              // Insert the new author with name and email
              const [result] = await db.query('INSERT INTO authors (author_name, email) VALUES (?, ?)', [name, email]);
              author = { author_id: result.insertId };
          } else {
              author = author[0];
          }
  
          // Insert the association between research and author into the research_authors table
          await db.query('INSERT INTO research_authors (research_id, author_id) VALUES (?, ?)', [researchId, author.author_id]);
      }
  };
  
  // Example usage
  await insertAuthors(researchId, authors);
  
  

  // Insert categories
  const insertCategories = async (researchId, categories) => {
      const categoryNames = categories.split(',').map(name => name.trim());
      for (const name of categoryNames) {
          let [category] = await db.query('SELECT category_id FROM category WHERE category_name = ?', [name]);
          if (category.length === 0) {
              const [result] = await db.query('INSERT INTO category (category_name) VALUES (?)', [name]);
              category = { category_id: result.insertId };
          } else {
              category = category[0];
          }
          await db.query('INSERT INTO research_categories (research_id, category_id) VALUES (?, ?)', [researchId, category.category_id]);
      }
  };

  await insertCategories(researchId, categories);

  // Insert keywords
  const insertKeywords = async (researchId, keywords) => {
      const keywordNames = keywords.split(',').map(name => name.trim());
      for (const name of keywordNames) {
          let [keyword] = await db.query('SELECT keyword_id FROM keywords WHERE keyword_name = ?', [name]);
          if (keyword.length === 0) {
              const [result] = await db.query('INSERT INTO keywords (keyword_name) VALUES (?)', [name]);
              keyword = { keyword_id: result.insertId };
          } else {
              keyword = keyword[0];
          }
          await db.query('INSERT INTO research_keywords (research_id, keyword_id) VALUES (?, ?)', [researchId, keyword.keyword_id]);
      }
  };

  await insertKeywords(researchId, keywords);

    res.status(201).json({ message: "Document Uploaded Successfully", fileId });
  } catch (error) {
    console.error("Error Upload Document:", error);
    res.status(500).json({ error: "Upload Document Endpoint Error!" });
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
