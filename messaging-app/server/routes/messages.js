const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../data/uploads/files'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Route to send a message
router.post('/send', authenticate, messageController.sendMessage);

// Route to upload and send file
router.post('/upload', authenticate, upload.single('file'), messageController.uploadFile);

// Route to get messages for a specific chat
router.get('/chat/:chatId', authenticate, messageController.getMessages);

// Route to delete a message
router.delete('/delete/:messageId', authenticate, messageController.deleteMessage);

// Route to get all chats for a user
router.get('/chats', authenticate, messageController.getUserChats);

module.exports = router;