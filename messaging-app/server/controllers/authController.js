const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersFilePath = path.join(__dirname, '../../data/users/users.json');
const secretKey = 'your_secret_key'; // Replace with your actual secret key

// Helper function to read users from file
const readUsersFromFile = () => {
    if (!fs.existsSync(usersFilePath)) {
        return [];
    }
    const data = fs.readFileSync(usersFilePath);
    return JSON.parse(data);
};

// Helper function to write users to file
const writeUsersToFile = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Register a new user
exports.register = async (req, res) => {
    const { email, username, password } = req.body;

    const users = readUsersFromFile();
    const existingUser = users.find(user => user.username === username || user.email === email);

    if (existingUser) {
        return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        email,
        username,
        password: hashedPassword,
        profilePhoto: null,
        badges: username === 'CaYatur' ? ['founder', 'admin'] : [],
        friends: [],
        groups: [],
        banned: false
    };

    users.push(newUser);
    writeUsersToFile(users);

    res.status(201).json({ message: 'User registered successfully' });
};

// Login a user
exports.login = async (req, res) => {
    const { username, password } = req.body;

    const users = readUsersFromFile();
    const user = users.find(user => user.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if user is banned
    if (user.banned) {
        return res.status(403).json({ message: 'Your account has been banned' });
    }

    const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
    res.json({ token, user: { username: user.username, email: user.email, badges: user.badges } });
};

// Reset password function (added missing function)
exports.resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }

    const users = readUsersFromFile();
    const userIndex = users.findIndex(user => user.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;
    writeUsersToFile(users);

    res.status(200).json({ message: 'Password reset successfully' });
};

// Middleware to check if user is banned
exports.isBanned = (req, res, next) => {
    const { username } = req.user; // Assuming username is set in req.user by auth middleware
    const users = readUsersFromFile();
    const user = users.find(user => user.username === username);

    if (user && user.banned) {
        return res.status(403).json({ message: 'User is banned' });
    }

    next();
};