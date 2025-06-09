const fs = require('fs');
const path = require('path');

const usersDir = path.join(__dirname, '../../data/users');
const uploadsDir = path.join(__dirname, '../../data/uploads');

// Ensure directories exist
if (!fs.existsSync(usersDir)) {
    fs.mkdirSync(usersDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Function to save user profile photo
const saveProfilePhoto = (username, photoBuffer) => {
    const photoPath = path.join(uploadsDir, 'profiles', `${username}.jpg`);
    fs.writeFileSync(photoPath, photoBuffer);
    return photoPath;
};

// Function to save user data
const saveUserData = (username, userData) => {
    const userFilePath = path.join(usersDir, `${username}.json`);
    fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
};

// Function to get user data
const getUserData = (username) => {
    const userFilePath = path.join(usersDir, `${username}.json`);
    if (fs.existsSync(userFilePath)) {
        const data = fs.readFileSync(userFilePath);
        return JSON.parse(data);
    }
    return null;
};

// Function to delete user data
const deleteUserData = (username) => {
    const userFilePath = path.join(usersDir, `${username}.json`);
    if (fs.existsSync(userFilePath)) {
        fs.unlinkSync(userFilePath);
    }
};

// Function to list all users
const listUsers = () => {
    return fs.readdirSync(usersDir).map(file => file.replace('.json', ''));
};

module.exports = {
    saveProfilePhoto,
    saveUserData,
    getUserData,
    deleteUserData,
    listUsers,
};