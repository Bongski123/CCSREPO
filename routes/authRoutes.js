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

        // Check if the user is verified
        if (user.verification !== 'verified') {
            return res.status(403).json({ error: 'Account is not verified' });
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If password doesn't match
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create JWT token with 1-hour expiration and include verification status
        const token = jwt.sign(
            {
                userId: user.user_id,
                email: user.email,
                firstName: user.first_name,
                middleName: user.middle_name,
                Suffix: user.Suffix,
                lastName: user.last_name,
                roleId: user.role_id,
                verification: user.verification
            },
            secretKey,
            { expiresIn: '1hour' }
        );

        // Send token and user details as response
        res.status(200).json({
            token,
            userId: user.user_id,
            firstName: user.first_name,
            lastName: user.last_name,
            verification: user.verification
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
