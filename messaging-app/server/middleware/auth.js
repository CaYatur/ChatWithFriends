const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../../data/users/users.json');

// Helper function to read users from file safely
const readUsersFromFile = () => {
    if (!fs.existsSync(usersFilePath)) {
        // Create the file with an empty array if it doesn't exist
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
};

// Middleware to authenticate users based on JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Alternative name for consistency with routes
const authenticate = authenticateToken;

// Middleware to check if user is founder
const checkFounder = (req, res, next) => {
    const users = readUsersFromFile();
    const user = users.find(u => u.username === req.user.username);
    
    if (user && user.username === 'CaYatur') {
        next();
    } else {
        return res.status(403).json({ message: 'Founder access required' });
    }
};

// Middleware to check if user is admin or founder
const checkAdmin = (req, res, next) => {
    const users = readUsersFromFile();
    const user = users.find(u => u.username === req.user.username);
    
    if (user && (user.username === 'CaYatur' || user.badges.includes('admin'))) {
        next();
    } else {
        return res.status(403).json({ message: 'Admin access required' });
    }
};

module.exports = {
    authenticateToken,
    authenticate,
    checkFounder,
    checkAdmin
};