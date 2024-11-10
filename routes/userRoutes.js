const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, isAdmin, isNCFUser, isNotNCFUser } = require('../authentication/middleware');

const router = express.Router();
router.post('/register', async (req, res) => {
    try {
        console.log('Received request body:', req.body);  // Log the incoming request body for debugging

        const { name, email, password, role_id, program_id, institution_id, new_institution_name, new_program_name } = req.body;

        // Check for missing required fields, allowing password to be optional
        if (!name || !email || !role_id || (!institution_id && !new_institution_name)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if a user with the same email already exists
        const checkUserByEmailQuery = 'SELECT * FROM users WHERE email = ?';
        const [existingUserByEmailRows] = await db.query(checkUserByEmailQuery, [email]);

        if (existingUserByEmailRows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Handle new institution if provided
        let finalInstitutionId = institution_id;
        if (new_institution_name) {
            const insertInstitutionQuery = 'INSERT INTO institution (institution_name) VALUES (?)';
            const [insertedInstitutionResult] = await db.query(insertInstitutionQuery, [new_institution_name]);
            finalInstitutionId = insertedInstitutionResult.insertId;
        }

        // Handle new program if provided
        let finalProgramId = program_id;
        if (new_program_name) {
            const insertProgramQuery = 'INSERT INTO program (program_name) VALUES (?)';
            const [insertedProgramResult] = await db.query(insertProgramQuery, [new_program_name]);
            finalProgramId = insertedProgramResult.insertId;
        }
        if (program_id === '' || program_id === null) {
            finalProgramId = null;
        }

        // Conditionally hash password if provided
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Insert new user into the users table
        const insertUserQuery = `
            INSERT INTO users (name, email, password, role_id, program_id, institution_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.query(insertUserQuery, [name, email, hashedPassword, role_id, finalProgramId, finalInstitutionId]);

        res.status(201).json({ message: 'User Registered Successfully' });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'User Registration Endpoint Error!' });
    }
});
router.get('/users/all', async (req, res) => {
    try {
        const getAllUsersQuery = `SELECT 
    u.user_id, 
    u.name, 
    u.email, 
    i.institution_name AS institution,  
    u.role_id, 
    r.role_name, 
    p.program_name, 
    u.institution_id  
FROM 
    users u
JOIN 
    roles r ON u.role_id = r.role_id
LEFT JOIN 
    program p ON u.program_id = p.program_id
LEFT JOIN 
    institution i ON u.institution_id = i.institution_id;  
`;
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
