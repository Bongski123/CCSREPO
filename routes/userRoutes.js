const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        console.log('Received request body:', req.body);  // Log the incoming request body

        const { name, email, password, role_id, program_id, institution_id, new_institution_name } = req.body;

        // Check for missing required fields
        if (!name || !email || !password || !role_id || !program_id || (!institution_id && !new_institution_name)) {  
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Password must be 8-15 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' });
        }

        // Check if user with the same email already exists
        const checkUserByEmailQuery = 'SELECT * FROM users WHERE email = ?';
        const [existingUserByEmailRows] = await db.query(checkUserByEmailQuery, [email]);

        if (existingUserByEmailRows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // If a new institution is provided, insert it into the database and get its ID
        let finalInstitutionId = institution_id;  // Default to the given institution_id
        if (new_institution_name) {
            // Insert the new institution into the institutions table
            const insertInstitutionQuery = 'INSERT INTO institutions (institution_name) VALUES (?)';
            const [insertedInstitutionResult] = await db.query(insertInstitutionQuery, [new_institution_name]);

            // Use the inserted institution's ID
            finalInstitutionId = insertedInstitutionResult.insertId;
        }

        // Hash the password before saving it to the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        const insertUserQuery = `
            INSERT INTO users (name, email, password, role_id, program_id, institution_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.query(insertUserQuery, [name, email, hashedPassword, role_id, program_id, finalInstitutionId]);

        res.status(201).json({ message: 'User Registered Successfully' });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'User Registration Endpoint Error!' });
    }
});

router.get('/users/all', async (req, res) => {
    try {
        const getAllUsersQuery = 'SELECT u.user_id, u.name, u.email,u.institution, u.role_id, r.role_name, p.program_name, u.institution FROM users u JOIN roles r ON u.role_id = r.role_id LEFT JOIN program p ON u.program_id = p.program_id;';
        const [rows] = await db.query(getAllUsersQuery);

        res.status(200).json({ users: rows });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/users/:user_id', async (req, res) => {
    try {
        const userId = req.params.user_id;

        if (!userId) {
            return res.status(400).json({ error: 'Please provide user id' });
        }

        const getUserQuery = 'SELECT u.user_id, u.name, u.email, u.role_id, r.role_name, p.program_name FROM users u JOIN roles r ON u.role_id = r.role_id LEFT JOIN program p ON u.program_id = p.program_id WHERE u.user_id = ?';
        const [rows] = await db.query(getUserQuery, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user: rows[0] });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/:user_id', async (req, res) => {
    try {
        const userId = req.params.user_id;
        const { name, email, password } = req.body;

        const getUserQuery = 'SELECT u.user_id, u.email, u.name, u.role_id, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?';
        const [userRows] = await db.query(getUserQuery, [userId]);

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRows[0];
        const hashedPassword = await bcrypt.hash(password, 10);
        const updateUserQuery = 'UPDATE users SET name = ?, email = ?, password = ? WHERE user_id = ?';
        await db.query(updateUserQuery, [name, email, hashedPassword, userId]);

        const updatedUser = { ...user, name, role_name: user.role_name };
        res.status(200).json({ message: 'User updated successfully', user: updatedUser });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'User Update Endpoint Error!' });
    }
});

router.get('/programs/all', async (req, res) => {
    try {
        const getAllProgramsQuery = 'SELECT * FROM program;';
        const [rows] = await db.query(getAllProgramsQuery);

        res.status(200).json({ programs: rows });
    } catch (error) {
        console.error('Error getting programs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
