module.exports = {
    PORT: process.env.PORT || 3000,
    DB_PATH: './data',
    USER_DATA_FILE: './data/users/users.json',
    GROUP_DATA_FILE: './data/groups/groups.json',
    MESSAGE_DATA_FILE: './data/messages/messages.json',
    UPLOADS_PATH: './data/uploads',
    LOGS_PATH: './data/logs',
    FOUNDER_USERNAME: 'CaYatur',
    BADGE_NAMES: {
        FOUNDER: 'Founder',
        ADMIN: 'Admin',
        MEMBER: 'Member',
        MODERATOR: 'Moderator'
    },
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'],
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
    EMAIL_SERVICE: {
        SERVICE: 'gmail',
        USER: process.env.EMAIL_USER,
        PASS: process.env.EMAIL_PASS
    }
};