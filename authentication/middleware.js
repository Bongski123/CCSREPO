const jwt = require('jsonwebtoken');
require('dotenv').config();



// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from header
    if (!token) {
        return res.status(403).json({ message: 'No token provided.' });
    }

    jwt.verify(token, 'your_secret_key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Failed to authenticate token.' });
        }

        req.user = decoded; // Add user information to request object
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role_id === 1) {
        return next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
};

const isNCFUser = (req, res, next) => {
    if (req.user && req.user.role_id === 2) {
        return next();
    } else {
        res.status(403).json({ error: 'Forbidden: NCF User access required' });
    }
};

const isNotNCFUser = (req, res, next) => {
    if (req.user && req.user.role_id === 3) {
        return next();
    } else {
        res.status(403).json({ error: 'Forbidden: Access restricted to non-NCF Users' });
    }
};

module.exports = { authenticateToken, isAdmin, isNCFUser, isNotNCFUser };
