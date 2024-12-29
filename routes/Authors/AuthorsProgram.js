

const express = require('express');

const db = require('../../database/db'); 

const router = express.Router();



router.get('/program/authors/:authorId', async (req, res) => {
  const authorId = req.params.authorId;

  try {

    const [authorRows] = await db.execute('SELECT author_name, email FROM authors WHERE author_id = ?', [authorId]);

    if (authorRows.length === 0) {
      return res.status(404).json({ message: "Author not found" });
    }

    const author = authorRows[0];

    const [userRows] = await db.execute(`
      SELECT u.program_id, p.program_name
      FROM users u
      JOIN program p ON u.program_id = p.program_id
      WHERE u.email = ?`, [author.email]);

    let programName = "Unknown Affiliation";

    if (userRows.length > 0) {
      programName = userRows[0].program_name;
    }

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