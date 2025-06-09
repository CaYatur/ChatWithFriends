const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../../data/users/users.json');
const founderUsername = 'CaYatur';

// Helper function to read users from file
const readUsersFromFile = () => {
    if (!fs.existsSync(usersFilePath)) {
        const dir = path.dirname(usersFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
};

// Helper function to write users to file
const writeUsersToFile = (users) => {
    const dir = path.dirname(usersFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Function to promote a user
exports.promoteUser = (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    
    const users = readUsersFromFile();
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    // Add admin badge if not already present
    if (!users[userIndex].badges) users[userIndex].badges = [];
    if (!users[userIndex].badges.includes('admin')) {
        users[userIndex].badges.push('admin');
    }
    
    writeUsersToFile(users);
    
    const { password, ...safeUser } = users[userIndex];
    res.status(200).json({ 
        message: `${username} has been promoted to admin.`,
        user: safeUser
    });
};

// Function to demote a user
exports.demoteUser = (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    
    const users = readUsersFromFile();
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove admin badge
    if (users[userIndex].badges) {
        users[userIndex].badges = users[userIndex].badges.filter(badge => badge !== 'admin');
    }
    
    writeUsersToFile(users);
    
    const { password, ...safeUser } = users[userIndex];
    res.status(200).json({ 
        message: `${username} has been demoted to user.`,
        user: safeUser
    });
};

// Function to ban a user
exports.banUser = (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    
    const users = readUsersFromFile();
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    // Cannot ban the founder
    if (username === founderUsername) {
        return res.status(403).json({ message: 'Cannot ban the founder' });
    }
    
    users[userIndex].banned = true;
    writeUsersToFile(users);
    
    res.status(200).json({ message: `${username} has been banned.` });
};

// Function to unban a user
exports.unbanUser = (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    
    const users = readUsersFromFile();
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    users[userIndex].banned = false;
    writeUsersToFile(users);
    
    res.status(200).json({ message: `${username} has been unbanned.` });
};

// Function to get all users (for admin purposes)
exports.getAllUsers = (req, res) => {
    const users = readUsersFromFile();
    
    // Remove passwords from response
    const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
    });
    
    res.status(200).json(safeUsers);
};