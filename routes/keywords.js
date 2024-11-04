const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken } = require('../authentication/middleware');

const router = express.Router();

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


// Create a new keyword
router.post('/keywords/add', async (req, res) => {
    const { keyword_name } = req.body;
    try {
        const createKeywordQuery = 'INSERT INTO keywords (keyword_name) VALUES (?)';
        const [result] = await db.query(createKeywordQuery, [keyword_name]);
        res.status(201).json({ keyword_id: result.insertId, keyword_name });
    } catch (error) {
        console.error('Error creating keyword:', error);
        res.status(500).json({ error: 'Create Keyword Endpoint Error!' });
    }
});

// Update an existing keyword
router.put('/keywords/:id', async (req, res) => {
    const { id } = req.params;
    const { keyword_name } = req.body;
    try {
        const updateKeywordQuery = 'UPDATE keywords SET keyword_name = ? WHERE keyword_id = ?';
        await db.query(updateKeywordQuery, [keyword_name, id]);
        res.status(200).json({ keyword_id: id, keyword_name });
    } catch (error) {
        console.error('Error updating keyword:', error);
        res.status(500).json({ error: 'Update Keyword Endpoint Error!' });
    }
});

// Delete a keyword
router.delete('/keywords/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleteKeywordQuery = 'DELETE FROM keywords WHERE keyword_id = ?';
        await db.query(deleteKeywordQuery, [id]);
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting keyword:', error);
        res.status(500).json({ error: 'Delete Keyword Endpoint Error!' });
    }
});

module.exports = router;
