const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');
const path = require('path');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// Browse by category
router.get('/category/:category_id', async (req, res) => {
    try {
        const category_id = req.params.category_id;

        if (!category_id) {
            return res.status(400).json({ error: 'Please provide category id' });
        }

        const getCategoryQuery = 'SELECT * FROM category WHERE category_id = ?';
        const [category] = await db.query(getCategoryQuery, [category_id]);

        if (category.length === 0) {
            return res.status(404).json({ error: 'Category not found!' });
        }

        const getCategoryDocumentsQuery = `


SELECT  r.*,  
    GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') AS authors,  
    GROUP_CONCAT(DISTINCT k.keyword_name SEPARATOR ', ') AS keywords,  
    GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ', ') AS category
FROM 
    researches r
LEFT JOIN 
    research_authors ra ON r.research_id = ra.research_id
LEFT JOIN 
    authors a ON ra.author_id = a.author_id
LEFT JOIN 
    research_keywords rk ON r.research_id = rk.research_id  
LEFT JOIN 
    keywords k ON rk.keyword_id = k.keyword_id 
LEFT JOIN 
    research_categories rc ON r.research_id = rc.research_id
LEFT JOIN 
    category c ON rc.category_id = c.category_id 
WHERE 
    rc.category_id = ?
    
    AND r.status = 'approved' 
GROUP BY 
    r.research_id;
    

    
        `;
        const [categoryDocuments] = await db.query(getCategoryDocumentsQuery, [category_id]);

        res.status(200).json({ category: category[0], categoryDocuments });

    } catch (error) {
        console.error('Error getting documents from a category:', error);
        res.status(500).json({ error: 'Categories Endpoint Error!' });
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
        const [keyword] = await db.query(getKeywordQuery, [keyword_id]);

        if (keyword.length === 0) {
            return res.status(404).json({ error: 'Keyword not found!' });
        }

        const getKeywordDocumentsQuery = `
            SELECT r.* 
            FROM researches r
            JOIN research_keywords rk ON r.research_id = rk.research_id
            WHERE rk.keyword_id = ?
        `;
        const [keywordDocuments] = await db.query(getKeywordDocumentsQuery, [keyword_id]);

        res.status(200).json({ keyword: keyword[0], keywordDocuments });

    } catch (error) {
        console.error('Error getting documents from a keyword:', error);
        res.status(500).json({ error: 'Keywords Endpoint Error!' });
    }
});

// Browse by authors
router.get('/authors/:authorId', async (req, res) => {
    try {
        const authorId = req.params.authorId;

        // Validate authorId
        if (!authorId) {
            return res.status(400).json({ error: 'Please provide author ID' });
        }

        // Query to get author ID and author name
        const getAuthorQuery = 'SELECT author_id, author_name FROM authors WHERE author_id = ?';
        const [author] = await db.query(getAuthorQuery, [authorId]);

        // Check if author exists
        if (author.length === 0) {
            return res.status(404).json({ error: 'Author not found!' });
        }

        // Respond with author details
        res.json({
            author: author[0], // Return only author_id and author_name
        });

    } catch (error) {
        console.error('Error fetching author details:', error); // Log the error for debugging
        res.status(500).json({ message: 'Failed to fetch author details', error: error.message });
    }
});

// Endpoint to fetch authors based on query
router.get('/authors', async (req, res) => {
    try {
        // SQL query to fetch authors with the count of researches they have published
        const query = `
    SELECT 
    a.author_id,

    TRIM(BOTH '.' FROM a.author_name) AS authors_name,
    COUNT(ra.research_id) AS documentCount,
        a.email
FROM 
    authors a
LEFT JOIN 
    research_authors ra ON a.author_id = ra.author_id
LEFT JOIN 
    researches r ON ra.research_id = r.research_id
WHERE 
    r.status = 'approved'  -- Only count researches with status 'approved'
GROUP BY 
    a.author_id, authors_name
ORDER BY 
    authors_name ASC;

        `;

        // Execute the query
        const [rows] = await db.query(query);

        // Send the result as JSON
        res.json({
            authors: rows
        });

    } catch (err) {
        console.error('Error fetching authors:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});




// Assuming you have a separate route for authors
router.get('/authors/:research_id', async (req, res) => {
    try {
        const research_id = req.params.research_id;

        if (!research_id) {
            return res.status(400).json({ error: 'Please provide a valid research ID' });
        }

        // First query to get the authors associated with the given research_id
        const getAuthorsQuery = `
            SELECT a.author_id, a.author_name, a.email
            FROM authors a
            JOIN research_authors ra ON a.author_id = ra.author_id
            WHERE ra.research_id = ?
        `;
        
        // Execute the query to get authors linked to the research paper
        const [authors] = await db.query(getAuthorsQuery, [research_id]);

        // If no authors are found, return a 404
        if (authors.length === 0) {
            return res.status(404).json({ error: 'No authors found for this research' });
        }

        // Return the authors data in the response
        res.status(200).json(authors);

    } catch (error) {
        console.error('Error fetching authors:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

  
  router.get('/authors/:author_id', async (req, res) => {
    try {
      const authorId = req.params.author_id;
    
      // Query to fetch the author name and email by author_id
      const getAuthorQuery = `
        SELECT author_name, email
        FROM authors
        WHERE author_id = ?
      `;
    
      // Using db.promise() for async/await
      const [rows] = await db.promise().execute(getAuthorQuery, [authorId]);
    
      // Check if rows is empty
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Author not found.' });
      }
    
      // Log the fetched author data for debugging
      console.log('Author fetched:', rows);
    
      // Respond with the author details
      res.status(200).json(rows[0]);  // Return only the first row since author_id is unique
    } catch (error) {
      // More specific logging for debugging purposes
      console.error('Error fetching author:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  


// Serve static files (for PDFs)
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint to fetch an author and their researches
router.get('/authors/:authorId/researches', async (req, res) => {
    const { authorId } = req.params;
    
    try {
        // SQL query to get author details
        const [authorRows] = await db.query('SELECT * FROM authors WHERE author_id = ?', [authorId]);
        
        if (authorRows.length === 0) {
            return res.status(404).json({ message: 'Author not found' });
        }

        const author = authorRows[0];

        // SQL query to get the researches by the author
        const [researchRows] = await db.query(`
            SELECT r.research_id, r.title, r.abstract, r.filename
            FROM researches r
            JOIN research_authors ra ON r.research_id = ra.research_id
            WHERE ra.author_id = ?
        `, [authorId]);

        res.json({
            author: author,
            researches: researchRows
        });

    } catch (err) {
        console.error('Error fetching author or researches:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



router.get('/authors/:authorId/papers', async (req, res) => {
    const { authorId } = req.params;
  
    try {
      const [rows] = await db.query(`
        SELECT 
            r.*,  
            GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') AS authors,  
            GROUP_CONCAT(DISTINCT k.keyword_name SEPARATOR ', ') AS keywords,  
            GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ', ') AS category
        FROM 
            researches r
        LEFT JOIN 
            research_authors ra ON r.research_id = ra.research_id
        LEFT JOIN 
            authors a ON ra.author_id = a.author_id
        LEFT JOIN 
            research_keywords rk ON r.research_id = rk.research_id  
        LEFT JOIN 
            keywords k ON rk.keyword_id = k.keyword_id 
        LEFT JOIN 
            research_categories rc ON r.research_id = rc.research_id
        LEFT JOIN 
            category c ON rc.category_id = c.category_id 
        WHERE 
            ra.author_id = ?  -- Filter by author_id
            AND r.status = 'approved' 
        GROUP BY 
            r.research_id;
      `, [authorId]);
  
      // If no papers are found, you might want to return an empty array
      res.json({ papers: rows.length ? rows : [] });
    } catch (error) {
      console.error('Error fetching papers:', error); // Log the error for debugging
      res.status(500).json({ message: 'Failed to fetch papers', error: error.message });
    }
  });
  


  router.get(
    '/user/researches/:userId',
    [
      // Validate userId to ensure it's numeric (assuming userId is a number)
      param('userId').isNumeric().withMessage('Invalid user ID format. It should be a number.'),
    ],
    async (req, res) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { userId } = req.params;
  
      const query = 'SELECT * FROM researches WHERE uploader_id = ?';
  
      try {
        const [results] = await db.query(query, [userId]);
  
        if (results.length === 0) {
          return res.status(404).json({ message: 'No research papers found for this user.' });
        }
  
        res.status(200).json({ message: 'Research papers retrieved successfully.', data: results });
      } catch (err) {
        res.status(500).json({ message: 'Error fetching research papers', error: err.message });
      }
    }
  );  





  
  

module.exports = router;
