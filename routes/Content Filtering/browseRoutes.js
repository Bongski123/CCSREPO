const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../database/db");
const {
  authenticateToken,
  isAdmin,
  isNCFUser,
  isNotNCFUser,
} = require("../../authentication/middleware");
const router = express.Router();

router.get('/category/:category_id', async (req, res) => {
    try {
        const { category_id } = req.params;
  
        if (!category_id) {
            return res.status(400).json({ error: 'Please provide a category ID' });
        }
  
        // Check if the category exists
        const getCategoryQuery = 'SELECT * FROM category WHERE category_id = ?';
        const [category] = await db.query(getCategoryQuery, [category_id]);
  
        if (category.length === 0) {
            return res.status(404).json({ error: 'Category not found!' });
        }
  
        // Retrieve all research documents associated with the category_id
        const getCategoryDocumentsQuery = `
       SELECT r.*, GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors
FROM researches r
JOIN research_categories rc ON r.research_id = rc.research_id
JOIN research_authors ra ON r.research_id = ra.research_id
JOIN authors a ON ra.author_id = a.author_id
WHERE rc.category_id = 8
GROUP BY r.research_id;

        `;
        const [categoryDocuments] = await db.query(getCategoryDocumentsQuery, [category_id]);
  
        // Send only the documents if that's what's needed by the client
        res.status(200).json(categoryDocuments);
  
    } catch (error) {
        console.error('Error retrieving documents for category:', category_id, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// Browse by keywords
router.get('/keywords/:keyword_id', async (req, res) => {
  try {
      const keyword_id = req.params.keyword_id;

      if (!keyword_id) {
          return res.status(400).json({ error: 'Please provide keyword id' });
      }

      const getKeywordQuery = 'SELECT * FROM keywords WHERE keyword_id = ?';
      const [keyword] =  await db.query(getKeywordQuery, [keyword_id]);

      if (keyword.length === 0) {
          return res.status(404).json({ error: 'Keyword not found!' });
      }

      const getKeywordDocumentsQuery = `
          SELECT r.* 
          FROM researches r
          JOIN research_keywords rk ON r.research_id = rk.research_id
          WHERE rk.keyword_id = ?
      `;
      const [keywordDocuments] =  await db.query(getKeywordDocumentsQuery, [keyword_id]);

      res.status(200).json({ keyword: keyword[0], keywordDocuments });

  } catch (error) {
      console.error('Error getting documents from a keyword:', error);
      res.status(500).json({ error: 'Keywords Endpoint Error!' });
  }
});

// Browse by authors
router.get('/authors/:author_id', async (req, res) => {
  try {
      const author_id = req.params.author_id;

      if (!author_id) {
          return res.status(400).json({ error: 'Please provide author id' });
      }

      const getAuthorQuery = 'SELECT * FROM authors WHERE author_id = ?';
      const [author] = await db.query(getAuthorQuery, [author_id]);

      if (author.length === 0) {
          return res.status(404).json({ error: 'Author not found!' });
      }

      const getAuthorDocumentsQuery = `
          SELECT r.* 
          FROM researches r
          JOIN research_authors ra ON r.research_id = ra.research_id
          WHERE ra.author_id = ?
      `;
      const [authorDocuments] = await db.query(getAuthorDocumentsQuery, [author_id]);

      res.status(200).json({ author: author[0], authorDocuments });

  } catch (error) {
      console.error('Error getting documents from an author:', error);
      res.status(500).json({ error: 'Authors Endpoint Error!' });
  }
});

// Endpoint to fetch authors based on query
router.get('/authors', async (req, res) => {
    try {
        // Query the database
        const [rows] = await pool.query('SELECT id, author_name as name FROM authors');

        // Send the response
        res.status(200).json({ authors: rows });
    } catch (error) {
        console.error('Error getting authors:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;