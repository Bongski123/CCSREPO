const jwt = require('jsonwebtoken');
require('dotenv').config();



// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(403).json({ error: 'No token provided' });
    }
  
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Unauthorized or token expired' });
      }
  
      req.userId = decoded.userId;
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
