
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const {authenticateToken} = require('../authentication/middleware');

const router = express.Router();



router.get('/keywords', async(req, res) =>{
    try{
        const getAllRolesQuery = ' SELECT keyword_name FROM keywords';
        const [rows] = await db.query(getAllRolesQuery);

        res.status(200).json({keywords: rows});
    }catch(error){
        console.error('Error getting roles:', error);
        res.status(500).json({error: 'All Roles Endpoint Error!'});
    }
});


module.exports = router;