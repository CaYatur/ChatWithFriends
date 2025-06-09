const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, checkFounder, checkAdmin } = require('../middleware/auth'); // authMiddleware yerine authenticate

// Route to promote a user
router.post('/promote', authenticate, checkFounder, adminController.promoteUser);

// Route to demote a user
router.post('/demote', authenticate, checkFounder, adminController.demoteUser);

// Route to ban a user
router.post('/ban', authenticate, checkAdmin, adminController.banUser);

// Route to unban a user
router.post('/unban', authenticate, checkAdmin, adminController.unbanUser);

// Route to get all users (for admin purposes)
router.get('/users', authenticate, checkAdmin, adminController.getAllUsers);

module.exports = router;