
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');

const router = express.Router();



router.get('/categories/all', async(req, res) =>{
    try{
        const getAllUsersQuery = 'SELECT category_id, category_name FROM category';
        const [rows] = await db.query(getAllUsersQuery);

        res.status(200).json({category: rows});
    }catch(error){
        console.error('Error getting roles:', error);
        res.status(500).json({error: 'All Roles Endpoint Error!'});
    }
});


module.exports = router;