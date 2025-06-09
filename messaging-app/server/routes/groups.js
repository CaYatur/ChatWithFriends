const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');

// Route to create a group
router.post('/', authenticate, groupController.createGroup);

// Route to get all groups for a user
router.get('/', authenticate, groupController.getUserGroups);

// Route to get group details
router.get('/:groupId', authenticate, groupController.getGroupDetails);

// Route to update group
router.put('/:groupId', authenticate, groupController.updateGroup);

// Route to delete group
router.delete('/:groupId', authenticate, groupController.deleteGroup);

// Route to add member to group
router.post('/:groupId/members', authenticate, groupController.addMember);

// Route to remove member from group
router.delete('/:groupId/members/:username', authenticate, groupController.removeMember);

// Route to get group messages
router.get('/:groupId/messages', authenticate, groupController.getGroupMessages);

// Route to send message to group
router.post('/:groupId/messages', authenticate, groupController.sendGroupMessage);

// Route to leave group
router.post('/:groupId/leave', authenticate, groupController.leaveGroup);

module.exports = router;