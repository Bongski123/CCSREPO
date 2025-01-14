const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require('stream');
const fs = require("fs");
const path = require("path");
const db = require("../database/db");
const axios = require("axios"); // Axios for making HTTP requests


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


const auth = new google.auth.GoogleAuth({
  credentials: googleServiceAccount,
  scopes: ["https://www.googleapis.com/auth/drive"],
});


const drive = google.drive({
  version: "v3",
  auth,
});




const upload = multer({ storage: multer.memoryStorage() });


const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};


router.post("/upload", upload.single("file"), async (req, res) => {
  const connection = await db.getConnection();
  try {
    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;

    if (!authors) return res.status(400).json({ error: "Authors are required!" });
    if (!categories) return res.status(400).json({ error: "Categories are required!" });
    if (!keywords) return res.status(400).json({ error: "Keywords are required!" });

    const authorList = authors.split(",").map((author) => {
      const match = author.match(/^(.+?)\s?\(([^)]+)\)$/);
      if (!match) return null;
      const [, author_name, email] = match;
      return { author_name: author_name.trim(), email: email.trim() };
    }).filter((author) => author !== null);

    const categoryList = categories.split(",").map((name) => name.trim());
    const keywordList = keywords.split(",").map((name) => name.trim());

    const fileMetadata = {
      name: req.file.originalname,
      parents: [process.env.DRIVE_FOLDER_ID],
    };
    const media = { mimeType: req.file.mimetype, body: bufferToStream(req.file.buffer) };
    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id",
    });

    const fileId = driveResponse.data.id;

    if (!uploader_id || isNaN(uploader_id)) {
      return res.status(400).json({ error: "Invalid uploader ID!" });
    }

    const [[uploader]] = await connection.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (!uploader) return res.status(404).json({ error: "Uploader not found!" });

    const status = uploader.role_id === 1 ? "approved" : "pending";

    const [[existingDocument]] = await connection.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument) return res.status(409).json({ error: "Document with this title already exists!" });

    await connection.beginTransaction();

    const [result] = await connection.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [title, abstract, req.file.originalname, uploader_id, status, fileId]
    );
    const researchId = result.insertId;

    if (authorList.length > 0) {
      const authorInserts = authorList.map(({ author_name, email }) => [author_name, email]);
      await connection.query(
        `INSERT INTO authors (author_name, email) VALUES ? 
         ON DUPLICATE KEY UPDATE author_id=LAST_INSERT_ID(author_id)`,
        [authorInserts]
      );
      const [authorRecords] = await connection.query("SELECT author_id FROM authors WHERE email IN (?)", [
        authorList.map(({ email }) => email),
      ]);
      const authorRelations = authorRecords.map(({ author_id }) => [researchId, author_id]);
      await connection.query("INSERT INTO research_authors (research_id, author_id) VALUES ?", [authorRelations]);
    }

    if (categoryList.length > 0) {
      const categoryInserts = categoryList.map((name) => [name]);
      await connection.query(
        `INSERT INTO category (category_name) VALUES ? 
         ON DUPLICATE KEY UPDATE category_id=LAST_INSERT_ID(category_id)`,
        [categoryInserts]
      );
      const [categoryRecords] = await connection.query("SELECT category_id FROM category WHERE category_name IN (?)", [
        categoryList,
      ]);
      const categoryRelations = categoryRecords.map(({ category_id }) => [researchId, category_id]);
      await connection.query("INSERT INTO research_categories (research_id, category_id) VALUES ?", [categoryRelations]);
    }

    if (keywordList.length > 0) {
      const keywordInserts = keywordList.map((name) => [name]);
      await connection.query(
        `INSERT INTO keywords (keyword_name) VALUES ? 
         ON DUPLICATE KEY UPDATE keyword_id=LAST_INSERT_ID(keyword_id)`,
        [keywordInserts]
      );
      const [keywordRecords] = await connection.query("SELECT keyword_id FROM keywords WHERE keyword_name IN (?)", [
        keywordList,
      ]);
      const keywordRelations = keywordRecords.map(({ keyword_id }) => [researchId, keyword_id]);
      await connection.query("INSERT INTO research_keywords (research_id, keyword_id) VALUES ?", [keywordRelations]);
    }

    // Commit the MySQL transaction
    await connection.commit();

    // Prepare data for restDB
    const restDBData = {
      title,
      abstract,
      authors: authorList,
      categories: categoryList,
      keywords: keywordList,
      fileId,
      status,
      uploader_id,
      publish_date: new Date().toISOString(),
    };

    // Post data to restDB
    const restDBResponse = await axios.post("/https/www-ccsnexus-3c3f.restdb.io/restdb-research", restDBData, {
      headers: {
        "Content-Type": "application/json",
        "x-apikey": "10de4bbb0fbd2a5ddd74f21ff76bae188fc02", // API key from environment variables
      },
    });

    if (restDBResponse.status === 201) {
      res.status(201).json({ message: "Research uploaded successfully to MySQL and restDB!" });
    } else {
      throw new Error("Failed to post data to restDB.");
    }
  } catch (err) {
    await connection.rollback();
    console.error("Error uploading research:", err);
    res.status(500).json({ error: "An error occurred while uploading the research" });
  } finally {
    connection.release();
  }
});


router.delete('/delete-research/:research_id', async (req, res) => {
  const research_id = req.params.research_id;


  if (!research_id) {
      return res.status(400).json({ message: 'Research ID is required.' });
  }


  try {
      // Delete research entry, cascading to related tables
      const [result] = await db.query("DELETE FROM researches WHERE research_id = ?", [research_id]);


      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Research not found.' });
      }


      res.status(200).json({ message: 'Research and associated records deleted successfully!' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while deleting the research.' });
  }
});




module.exports = router;

