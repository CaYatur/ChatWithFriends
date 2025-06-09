const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticate } = require('../middleware/auth');

// Route to send friend request
router.post('/send-request', authenticate, friendController.sendFriendRequest);

// Route to accept friend request
router.post('/accept-request', authenticate, friendController.acceptFriendRequest);

// Route to reject friend request
router.post('/reject-request', authenticate, friendController.rejectFriendRequest);

// Route to cancel sent friend request
router.post('/cancel-request', authenticate, friendController.cancelFriendRequest);

// Route to get pending friend requests
router.get('/requests', authenticate, friendController.getPendingRequests);

// Route to get friends list
router.get('/list', authenticate, friendController.getFriendsList);

// Route to remove friend
router.delete('/remove', authenticate, friendController.removeFriend);

// Route to get online status of friends
router.get('/online-status', authenticate, friendController.getOnlineStatus);

module.exports = router;