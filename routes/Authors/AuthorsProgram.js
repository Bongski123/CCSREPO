// Backend route to fetch author details along with program_name

const express = require('express');

const db = require('../../database/db'); // Import database connection

const router = express.Router();



router.get('/program/authors/:authorId', async (req, res) => {
  const authorId = req.params.authorId;

  try {
    // Step 1: Get author details by/progra authorId
    const [authorRows] = await db.execute('SELECT author_name, email FROM authors WHERE author_id = ?', [authorId]);

    if (authorRows.length === 0) {
      return res.status(404).json({ message: "Author not found" });
    }

    const author = authorRows[0];

    // Step 2: Get the user's program_name from the users table by joining with the program table
    const [userRows] = await db.execute(`
      SELECT u.program_id, p.program_name
      FROM users u
      JOIN program p ON u.program_id = p.program_id
      WHERE u.email = ?`, [author.email]);

    let programName = "Unknown Affiliation";

    if (userRows.length > 0) {
      programName = userRows[0].program_name; // Get the program_name if found
    }

    // Return the author details with program_name
    res.json({
      author: {
        author_name: author.author_name,
        program_name: programName,
      }
    });
  } catch (err) {
    console.error('Error fetching author details:', err.message);
    res.status(500).json({ message: "Error fetching author details" });
  }
});


module.exports = router;