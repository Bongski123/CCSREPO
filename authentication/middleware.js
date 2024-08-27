const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden: Invalid token' });
        }
        req.user = user;
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
