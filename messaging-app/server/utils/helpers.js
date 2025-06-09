const fs = require('fs');
const path = require('path');

// Helper function to read a JSON file
const readJsonFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
};

// Helper function to write to a JSON file
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
    }
};

// Helper function to generate a unique username
const generateUniqueUsername = (username, users) => {
    let uniqueUsername = username;
    let counter = 1;

    while (users.some(user => user.username === uniqueUsername)) {
        uniqueUsername = `${username}${counter}`;
        counter++;
    }

    return uniqueUsername;
};

// Helper function to validate email format
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Helper function to check if a user is banned
const isUserBanned = (username, bannedUsers) => {
    return bannedUsers.includes(username);
};

module.exports = {
    readJsonFile,
    writeJsonFile,
    generateUniqueUsername,
    isValidEmail,
    isUserBanned,
};