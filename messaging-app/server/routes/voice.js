const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { authenticate } = require('../middleware/auth');

// Route to initiate a voice call
router.post('/initiate', authenticate, voiceController.initiateCall);

// Route to accept a voice call
router.post('/accept', authenticate, voiceController.acceptCall);

// Route to reject a voice call
router.post('/reject', authenticate, voiceController.rejectCall);

// Route to end a voice call
router.post('/end', authenticate, voiceController.endCall);

// Route to get call history
router.get('/history', authenticate, voiceController.getCallHistory);

module.exports = router;