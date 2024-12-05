const express = require('express');
const jwt = require('jsonwebtoken');

const db = require('../database/db');

const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const fs = require('fs');
const router = require('./documentRoutes');
require('dotenv').config();



// Configure Multer
const uploadDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Replace/Update File Endpoint
router.post('/research/:researchId/upload', upload.single('file'), async (req, res) => {
  const { researchId } = req.params;

  // Validate JWT and extract userId
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. No token provided.' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId; // Assume the token payload includes `userId`
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const [existingResearch] = await db.query(
      'SELECT filename FROM researches WHERE research_id = ? AND uploader_id = ?',
      [researchId, userId]
    );

    if (!existingResearch.length) {
      return res.status(404).json({ message: 'Research not found or unauthorized.' });
    }

    // Delete the old file
    const oldFile = existingResearch[0].filename;
    const oldFilePath = path.join(uploadDirectory, oldFile);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    } 

    // Update the database with the new file
    await db.query('UPDATE researches SET filename = ? WHERE research_id = ? AND uploader_id = ?', [
      req.file.filename,
      researchId,
      userId,
    ]);

    res.status(200).json({ message: 'File updated successfully.', filename: req.file.filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating the file.' });
  }
});


module.exports = router;