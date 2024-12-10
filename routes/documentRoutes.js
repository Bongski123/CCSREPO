const express = require("express");
const db = require("../database/db");
const { authenticateToken, isAdmin } = require("../authentication/middleware");
const multer = require("multer");
const { google } = require("googleapis");
const router = express.Router();
const streamifier = require("streamifier"); // Import streamifier
require("dotenv").config(); // Load environment variables

// Google Drive Setup
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVgISVob0EV2BE\nT0NXxB6R/TCLwgZzGG3ivK7uzoIJoGQPKLSkABLu0/3GNdwMx4ZEOOsEr+EMyUhp\n8LMj9iik9mOyb+R4kEDAEQlQZ0+HvK/Yabm67umX/6dGRv7JCC+yNRP28XQ9GuOU\nSmmhEqnmmga2lWp+mPBl6W6nX7gOAIj6xtugYU1IRAIZ0Yxs8eVTp5y4mh7sWqko\nxXUmkSCcLY6Wm1zlR8yHTExSL/QPmnWUNyOqyIg6bvRq3nAwYdGLUZRoTa1TWnQO\newqa1GM9aouAI0d+RsCw//UEG2V4v+kxkso21dB9YmmKbSnyRairNr2IIeyNrPWL\nNZShI6UHAgMBAAECggEAEXK2CY2ujYiS5yvV7fn3ogIS/q2/hC/Zzx73ahaTXWdv\ntfNwK9T1UL8fbRyHgr3aaBnn6KBAOdP7TuxRksQYinHrMBdH3ZIaA8UaQalnwC9e\nuZN0wjIQAhC6rwCFuV0pzk90woiO2AcqB4ghsMmxlXulLJryZi0073ppXu4jwKg+\nH9vdUlzNYUUHJVvHWIiv+ITN43Xx0EYRIe6n5e/ZeZ4hAFqtmqzb+rSOXgmgqIMw\noGBW/OZbvlkJsGWHyGZeZSLL+iJXNDJDk8YFv3arpbInBk3OYQk9UPYY82l3f1au\nDlWtL389kSgyJ/Gfvr30qDhs1WEN5Te2//HZu5l7YQKBgQDrH5WbxHJzk/Hc1jpK\nJQmUlB2t26Cv+/+fOzAz5KHgFX2RLjXIHl5iufib3HM+nbUOe66As7U0r7/Va0Nn\n1qppy05HL4ZzA36bsQ8Fw5prdVQjjU+r4c1wEaY8O13ckzL6qKZIOGNEuBF0vRoq\nzGxN8iYsZ3MW6JX7E3zK/FvpYQKBgQDodXl5CJMw/67n6o/DlmnoxMdUNKXvyoxs\nUdz/daKX682tGBLa06u1ZCCMCJYgahQwqRv15apTscOvy5sBQraz8H/UGc3v0AZ0\nDz5zyOaLw9pHv9C7MuDRhzd708Q3Z/Gh4YK6+syae6gposLh1wLqIbRUOTuCZGA6\nRSFZ4qYfZwKBgQCczEZgR6Sv0RS1WiQrOAHolNIqFFJXqi0xSi5+HNWa85n2jKOP\nHjmBi1Xw0xYDxvZsfyzDZZTNWvsKX2rnP7ALt2ovbNEzuDvhpjVHecdsLCV9RArC\nrGXte8epWUniBEQ2BuxFM114AWyatlVR/1umq3qrmB2XRGposvlBAQRmYQKBgQCS\nlwIzQSURESvLNC/Ut1WyY+UPROQfgytqY3Vp41TVWO4q6bN6K2Fs0ed0ZzXE2yBA\nT2RCfMIcZU1x3oOxF9D/R/pUVrF3OUfYiIRpn5dDLA7KkDug0UTU3OAwRirGhdXq\nr7sxDldYVAKHvwwGPwCnhPmi4zST1ZiZJl8Rv8vioQKBgQDOiy1z7ezJzgJSNoKz\nee5zOWdsSRkxHBKRtc1vbBIxEg+z+838+TxXf2EJhkOA11OQptLGZ41iziR41P6A\nqZRp3lzXySc6REVOJI969AZSGovOFYPX6YguCb6X4wSuc/Avn+3AT/0bE6eMTAhX\nFgTYhJbE4mHJCmVUxn1C+iUleg==\n-----END PRIVATE KEY-----\n",
    client_email: process.env.GOOGLE_CLIENT_EMAIL || 'ccsrepo@ccsrepository-444308.iam.gserviceaccount.com',
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
  }
});

const drive = google.drive({ version: "v3", auth });

// Multer Setup for File Uploads
const upload = multer({
  storage: multer.memoryStorage(),  // Use memoryStorage to store file in memory, not local disk
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type, only PDFs are allowed!"), false);
    }
  },
});

// Sanitize Table Name Helper
const sanitizeTableName = (table) => {
  const validTables = ["authors", "category", "keywords"];
  if (!validTables.includes(table)) {
    console.error(`Invalid table name: ${table}`);
    throw new Error("Invalid table name");
  }
  return table;
};

// File Upload Route
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Invalid file type, only PDFs are allowed!" });
    }

    // Extract form data
    const { title, authors, categories, keywords, abstract, uploader_id } = req.body;
    const fileName = req.file.originalname;

    // Validate uploader ID
    if (!uploader_id || isNaN(uploader_id)) throw new Error("Invalid uploader ID!");

    // Fetch uploader info and validate role
    const [uploader] = await db.query("SELECT role_id FROM users WHERE user_id = ?", [uploader_id]);
    if (uploader.length === 0) throw new Error("Uploader not found!");
    const role_id = uploader[0].role_id;
    const status = role_id === 1 ? "approved" : "pending";

    // Check for duplicate title in database
    const [existingDocument] = await db.query("SELECT title FROM researches WHERE title = ?", [title]);
    if (existingDocument.length > 0) throw new Error("Document with this title already exists!");

    // Google Drive upload metadata
    const fileMetadata = {
      name: fileName,
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID || '1z4LekckQJPlZbgduf5FjDQob3zmtAElc' // Default folder if not set
    };

    // Convert Buffer to Readable Stream
    const media = {
      mimeType: "application/pdf",
      body: streamifier.createReadStream(req.file.buffer),  // Convert the buffer to a stream
    };

    // Upload file to Google Drive
    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, name",
    });

    const driveFileId = driveResponse.data.id;

    // Insert research metadata into database
    const [result] = await db.query(
      "INSERT INTO researches (title, publish_date, abstract, filename, uploader_id, status, drive_file_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [title, abstract, fileName, uploader_id, status, driveFileId] // Store Google Drive file ID in the database
    );
    const researchId = result.insertId;

    // Insert authors, categories, and keywords into respective tables
    const insertEntities = async (entities, table, columnName) => {
      const sanitizedTable = sanitizeTableName(table);
      const names = entities.split(",").map((name) => name.trim());
      for (const name of names) {
        let [entity] = await db.query(`SELECT ${columnName} FROM ${sanitizedTable} WHERE ${sanitizedTable.slice(0, -1)}_name = ?`, [name]);
        if (entity.length === 0) {
          const [result] = await db.query(`INSERT INTO ${sanitizedTable} (${sanitizedTable.slice(0, -1)}_name) VALUES (?)`, [name]);
          entity = { [columnName]: result.insertId };
        } else {
          entity = entity[0];
        }
        const joinTable = `research_${sanitizedTable}`;
        await db.query(`INSERT INTO ${joinTable} (research_id, ${columnName}) VALUES (?, ?)`, [researchId, entity[columnName]]);
      }
    };

    // Insert entities for authors, categories, and keywords
    await insertEntities(authors, "authors", "author_id");
    await insertEntities(categories, "category", "category_id");
    await insertEntities(keywords, "keywords", "keyword_id");

    // Respond with success message and Drive file ID
    res.status(201).json({ message: "Document Uploaded Successfully", driveFileId });
  } catch (error) {
    console.error("Error Uploading Document:", error);
    res.status(500).json({ error: error.message || "Failed to upload document!" });
  }
});

module.exports = router;
