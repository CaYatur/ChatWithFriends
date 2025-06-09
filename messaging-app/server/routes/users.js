const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Route to get user profile
router.get('/:username', authenticate, userController.getUserProfile);

// Route to update user profile
router.put('/:username', authenticate, userController.updateUserProfile);

// Route to search users
router.get('/search', authenticate, userController.searchUsers);

// Route to upload profile photo
router.post('/:username/photo', authenticate, userController.uploadProfilePhoto);

// Route to update heartbeat
router.post('/heartbeat', authenticate, userController.updateHeartbeat);

// Route to block user
router.post('/block', authenticate, userController.blockUser);

// Route to unblock user
router.post('/unblock', authenticate, userController.unblockUser);

// Route to get blocked users
router.get('/blocked/list', authenticate, userController.getBlockedUsers);

module.exports = router;