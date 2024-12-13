const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require('stream');
const db = require("../database/db");

const router = express.Router();

// Google Drive API setup using service account credentials
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
FgTYhJbE4mHJCmVUxn1C+iUleg==
-----END PRIVATE KEY-----\n`,
  client_email: "ccsrepo@ccsrepository-444308.iam.gserviceaccount.com",
  client_id: "103197742225204345135",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ccsrepo%40ccsrepository-444308.iam.gserviceaccount.com",
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

// Upload route for research files
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;

    // Validate input fields
    if (!authors) return res.status(400).json({ error: "Authors are required!" });
    if (!categories) return res.status(400).json({ error: "Categories are required!" });
    if (!keywords) return res.status(400).json({ error: "Keywords are required!" });

    const authorList = authors ? authors.split(',').map(author_name => author_name.trim()) : [];
    const categoryList = categories ? categories.split(',').map(author_name => author_name.trim()) : [];
    const keywordList = keywords ? keywords.split(',').map(author_name => author_name.trim()) : [];

    // Upload file to Google Drive
    const fileMetadata = {
      name: req.file.originalname,
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

    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) {
      return res.status(404).json({ error: "Uploader not found!" });
    }

    const role_id = uploader[0].role_id;

    // Insert the new research record into the database
    const [result] = await db.query(
      "INSERT INTO researches (title, abstract, filename, uploader_id, status, publish_date) VALUES (?, ?, ?, ?, ?, ?)",
      [title, abstract, fileId, uploader_id, 'pending', new Date()] // `new Date()` will provide the current date and time
    );
    

    const research_id = result.insertId;

    // Add categories to research
    if (categoryList.length > 0) {
      const categoryIds = await Promise.all(categoryList.map(async (category) => {
        const [categoryResult] = await db.query("SELECT category_id FROM categories WHERE category_name = ?", [category]);
        return categoryResult.length > 0 ? categoryResult[0].category_id : null;
      }));

      const validCategoryIds = categoryIds.filter(id => id !== null);
      if (validCategoryIds.length > 0) {
        const categoryValues = validCategoryIds.map(category_id => [research_id, category_id]);
        await db.query("INSERT INTO research_categories (research_id, category_id) VALUES ?", [categoryValues]);
      }
    }

    // Add keywords to research
    if (keywordList.length > 0) {
      const keywordIds = await Promise.all(keywordList.map(async (keyword) => {
        const [keywordResult] = await db.query("SELECT keyword_id FROM keywords WHERE keyword_name = ?", [keyword]);
        return keywordResult.length > 0 ? keywordResult[0].keyword_id : null;
      }));

      const validKeywordIds = keywordIds.filter(id => id !== null);
      if (validKeywordIds.length > 0) {
        const keywordValues = validKeywordIds.map(keyword_id => [research_id, keyword_id]);
        await db.query("INSERT INTO research_keywords (research_id, keyword_id) VALUES ?", [keywordValues]);
      }
    }

    // Add authors to research
    if (authorList.length > 0) {
      const authorValues = authorList.map(author => {
        const [author_name, email] = author.split(';').map(str => str.trim());
        return [author_name, email];
      });

      // Check if author already exists
      for (let author of authorValues) {
        const [existingAuthor] = await db.query("SELECT author_id FROM authors WHERE email = ?", [author[1]]);
        if (existingAuthor.length === 0) {
          await db.query("INSERT INTO authors (author_name, email) VALUES ?", [[author]]);
        }
      }

      const [authorsRows] = await db.query(
        "SELECT author_id FROM authors WHERE email IN (?)",
        [authorList.map(author => author.split(';')[1].trim())]
      );

      const authorResearchValues = authorsRows.map(row => [research_id, row.author_id]);
      await db.query("INSERT INTO research_authors (research_id, author_id) VALUES ?", [authorResearchValues]);
    }

    res.status(200).json({ message: "Research uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload research file!" });
  }
});

// DELETE research and associated records
router.delete('/delete-research/:research_id', async (req, res) => {
  const researchId = req.params.research_id;

  if (!researchId) {
    return res.status(400).json({ message: 'Research ID is required.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const queries = [
      'DELETE FROM research_categories WHERE research_id = ?',
      'DELETE FROM search_logs WHERE research_id = ?',
      'DELETE FROM collections WHERE research_id = ?',
      'DELETE FROM notifications WHERE research_id = ?',
      'DELETE FROM research_keywords WHERE research_id = ?',
      'DELETE FROM research_authors WHERE research_id = ?'
    ];

    for (const query of queries) {
      await connection.execute(query, [researchId]);
    }

    const deleteResearchQuery = 'DELETE FROM researches WHERE research_id = ?';
    await connection.execute(deleteResearchQuery, [researchId]);

    await connection.commit();
    res.status(200).json({ message: 'Research and associated records deleted successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the research.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
