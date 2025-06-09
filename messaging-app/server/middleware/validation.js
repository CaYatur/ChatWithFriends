const { body, validationResult } = require('express-validator');

const validateRegistration = [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
];

const validateLogin = [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('password').exists().withMessage('Password is required.'),
];

const validateFriendRequest = [
    body('friendId').exists().withMessage('Friend ID is required.'),
];

const validateGroupCreation = [
    body('groupName').isLength({ min: 1 }).withMessage('Group name is required.'),
];

const validateMessage = [
    body('message').exists().withMessage('Message content is required.'),
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateFriendRequest,
    validateGroupCreation,
    validateMessage,
    validate,
};