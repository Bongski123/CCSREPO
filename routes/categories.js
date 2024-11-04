
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');

const router = express.Router();


// Get all categories
router.get('/categories/all', async (req, res) => {
    try {
        const getAllCategoriesQuery = 'SELECT category_id, category_name FROM category';
        const [rows] = await db.query(getAllCategoriesQuery);
        
        // Check if rows are empty
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No categories found' });
        }

        // Make sure to return the data as expected by your frontend
        res.status(200).json({ category: rows }); // This should match the expected structure in Upload.js
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ error: 'Internal Server Error - Unable to retrieve categories' });
    }
});

// Create a new category
router.post('/categories/add', async (req, res) => {
    const { category_name } = req.body;
    try {
        const createCategoryQuery = 'INSERT INTO category (category_name) VALUES (?)';
        const [result] = await db.query(createCategoryQuery, [category_name]);
        res.status(201).json({ category_id: result.insertId, category_name });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Create Category Endpoint Error!' });
    }
});

// Update an existing category
router.put('/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { category_name } = req.body;
    try {
        const updateCategoryQuery = 'UPDATE category SET category_name = ? WHERE category_id = ?';
        await db.query(updateCategoryQuery, [category_name, id]);
        res.status(200).json({ category_id: id, category_name });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Update Category Endpoint Error!' });
    }
});

// Delete a category
router.delete('/categories/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleteCategoryQuery = 'DELETE FROM category WHERE category_id = ?';
        await db.query(deleteCategoryQuery, [id]);
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Delete Category Endpoint Error!' });
    }
});

module.exports = router;
