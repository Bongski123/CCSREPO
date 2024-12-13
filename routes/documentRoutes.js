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
  private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVgISVob0EV2BE...`,
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

    // Insert authors with emails
    const insertAuthors = async (researchId, authors) => {
      // Split authors and emails by commas and trim any extra spaces
      const authorDetails = authors.split(',').map(item => item.trim());
    
      for (const detail of authorDetails) {
        // Split the author and email assuming the format "Author Name <email>"
        const [authorName, authorEmail] = detail.split('<').map(part => part.trim());
    
        // Clean the email by removing the closing '>' character
        const cleanEmail = authorEmail ? authorEmail.replace('>', '').trim() : null;
    
        // Check if the author already exists in the database
        let [author] = await db.query('SELECT author_id FROM authors WHERE author_name = ? AND email = ?', [authorName, cleanEmail]);
    
        if (author.length === 0) {
          // Insert a new author if they don't exist
          const [result] = await db.query('INSERT INTO authors (author_name, email) VALUES (?, ?)', [authorName, cleanEmail]);
          author = { author_id: result.insertId };
        } else {
          author = author[0];
        }
    
        // Insert the relationship between research and author
        await db.query('INSERT INTO research_authors (research_id, author_id) VALUES (?, ?)', [researchId, author.author_id]);
      }
    };
    
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
