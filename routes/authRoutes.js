const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken } = require('../authentication/middleware');
const config = require('../authentication/config');
const secretKey = config.secretKey;

const router = express.Router();

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Fetch user from the database by email
        const getUserQuery = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.query(getUserQuery, [email]);

        // If user not found
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If password doesn't match
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create JWT token with 1 hour expiration
        const token = jwt.sign(
            {
                userId: user.user_id,
                email: user.email,
                name: user.first_name || user.last_name,
                roleId: user.role_id
            },
            secretKey,
            { expiresIn: '1 hour' }
        );

        // Send token and userId as response
        res.status(200).json({ token, userId: user.user_id });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
