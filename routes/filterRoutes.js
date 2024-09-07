const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');

const router = express.Router();

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
            SELECT r.* 
            FROM researches r
            JOIN research_categories rc ON r.research_id = rc.research_id
            WHERE rc.category_id = ?
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
        const { query } = req.query;
        const [authors] = await db.query('SELECT author_name FROM authors WHERE author_name LIKE ?', [`%${query}%`]);
        res.json(authors.map(author => author.author_name));
    } catch (error) {
        console.error('Error fetching authors:', error);
        res.status(500).json({ error: 'Failed to fetch authors' });
    }
});

// Endpoint to fetch keywords based on query
router.get('/keywords', async(req, res) =>{
    try{
        const getAllKeywordquery = ' SELECT * FROM keywords';
        const [rows] = await db.query(getAllKeywordquery);

        res.status(200).json({keywords: rows});
    }catch(error){
        console.error('Error getting roles:', error);
        res.status(500).json({error: 'All keywords Endpoint Error!'});
    }
});



// Assuming you have a separate route for authors
router.get('/authors/:research_id', async (req, res) => {
    try {
      const researchId = req.params.research_id;
      
      const getAuthorsQuery = `
        SELECT authors.name 
        FROM authors 
        JOIN research_authors ON authors.author_id = research_authors.author_id 
        WHERE research_authors.research_id = ?
      `;
      const [rows] = await db.promise().execute(getAuthorsQuery, [researchId]);
  
      res.status(200).json(rows.map(row => row.name));
    } catch (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  
  

module.exports = router;
