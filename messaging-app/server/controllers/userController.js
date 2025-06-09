const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');

const usersFilePath = path.join(__dirname, '../../data/users/users.json');
const blockedUsersFilePath = path.join(__dirname, '../../data/users/blocked_users.json');

// Helper function to read JSON files
function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify([]));
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

// Helper function to write JSON files
function writeJsonFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Get user profile
exports.getUserProfile = (req, res) => {
    try {
        const { username } = req.params;
        const users = readJsonFile(usersFilePath);
        
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }
        
        // Return user profile without password
        const { password, ...userProfile } = user;
        res.json(userProfile);
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Update user profile
exports.updateUserProfile = (req, res) => {
    try {
        const { username } = req.params;
        const { email } = req.body;
        const requestingUser = req.user.username;
        
        // Check if user is updating their own profile
        if (username !== requestingUser) {
            return res.status(403).json({ message: 'Sadece kendi profilinizi güncelleyebilirsiniz!' });
        }
        
        const users = readJsonFile(usersFilePath);
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }
        
        // Update user data
        if (email) {
            users[userIndex].email = email;
        }
        users[userIndex].updatedAt = new Date().toISOString();
        
        if (writeJsonFile(usersFilePath, users)) {
            const { password, ...updatedUser } = users[userIndex];
            res.json(updatedUser);
        } else {
            res.status(500).json({ message: 'Profil güncellenirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Search users
exports.searchUsers = (req, res) => {
    try {
        const { q } = req.query;
        const currentUser = req.user.username;
        
        if (!q || q.trim().length === 0) {
            return res.json([]);
        }
        
        const users = readJsonFile(usersFilePath);
        const blockedUsers = readJsonFile(blockedUsersFilePath);
        
        // Get list of users blocked by current user
        const blockedByCurrentUser = blockedUsers
            .filter(block => block.blocker === currentUser)
            .map(block => block.blocked);
        
        // Get list of users who blocked current user
        const blockedCurrentUser = blockedUsers
            .filter(block => block.blocked === currentUser)
            .map(block => block.blocker);
        
        const searchTerm = q.trim().toLowerCase();
        const results = users
            .filter(user => 
                user.username.toLowerCase().includes(searchTerm) && 
                user.username !== currentUser &&
                !blockedByCurrentUser.includes(user.username) &&
                !blockedCurrentUser.includes(user.username)
            )
            .map(user => ({
                username: user.username,
                profilePhoto: user.profilePhoto,
                isOnline: user.isOnline || false
            }))
            .slice(0, 10); // Limit to 10 results
        
        res.json(results);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Block user
exports.blockUser = (req, res) => {
    try {
        const { targetUsername } = req.body;
        const blockerUsername = req.user.username;
        
        if (!targetUsername) {
            return res.status(400).json({ message: 'Hedef kullanıcı adı gerekli!' });
        }
        
        if (targetUsername === blockerUsername) {
            return res.status(400).json({ message: 'Kendinizi engelleyemezsiniz!' });
        }
        
        const users = readJsonFile(usersFilePath);
        const blockedUsers = readJsonFile(blockedUsersFilePath);
        
        // Check if target user exists
        const targetUser = users.find(u => u.username === targetUsername);
        if (!targetUser) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }
        
        // Check if already blocked
        const existingBlock = blockedUsers.find(block => 
            block.blocker === blockerUsername && block.blocked === targetUsername
        );
        
        if (existingBlock) {
            return res.status(400).json({ message: 'Kullanıcı zaten engellenmiş!' });
        }
        
        // Create block record
        const newBlock = {
            blocker: blockerUsername,
            blocked: targetUsername,
            timestamp: new Date().toISOString()
        };
        
        blockedUsers.push(newBlock);
        
        if (writeJsonFile(blockedUsersFilePath, blockedUsers)) {
            res.json({ message: 'Kullanıcı başarıyla engellendi!' });
        } else {
            res.status(500).json({ message: 'Kullanıcı engellenirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Unblock user
exports.unblockUser = (req, res) => {
    try {
        const { targetUsername } = req.body;
        const blockerUsername = req.user.username;
        
        const blockedUsers = readJsonFile(blockedUsersFilePath);
        
        // Find and remove the block
        const blockIndex = blockedUsers.findIndex(block => 
            block.blocker === blockerUsername && block.blocked === targetUsername
        );
        
        if (blockIndex === -1) {
            return res.status(404).json({ message: 'Engellenmiş kullanıcı bulunamadı!' });
        }
        
        blockedUsers.splice(blockIndex, 1);
        
        if (writeJsonFile(blockedUsersFilePath, blockedUsers)) {
            res.json({ message: 'Kullanıcının engeli kaldırıldı!' });
        } else {
            res.status(500).json({ message: 'Engel kaldırılırken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get blocked users list
exports.getBlockedUsers = (req, res) => {
    try {
        const username = req.user.username;
        const blockedUsers = readJsonFile(blockedUsersFilePath);
        const users = readJsonFile(usersFilePath);
        
        // Get users blocked by current user
        const blockedByUser = blockedUsers
            .filter(block => block.blocker === username)
            .map(block => {
                const blockedUser = users.find(u => u.username === block.blocked);
                return {
                    username: block.blocked,
                    profilePhoto: blockedUser ? blockedUser.profilePhoto : null,
                    blockedAt: block.timestamp
                };
            });
        
        res.json(blockedByUser);
    } catch (error) {
        console.error('Error getting blocked users:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Update heartbeat
exports.updateHeartbeat = (req, res) => {
    try {
        const username = req.user.username;
        const { isActive, lastActivity } = req.body;
        
        const users = readJsonFile(usersFilePath);
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex !== -1) {
            users[userIndex].isOnline = isActive;
            users[userIndex].lastSeen = new Date().toISOString();
            users[userIndex].lastActivity = lastActivity;
            
            writeJsonFile(usersFilePath, users);
        }
        
        res.json({ message: 'Heartbeat updated' });
    } catch (error) {
        console.error('Error updating heartbeat:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Profile photo upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../data/uploads/profiles');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.params.username + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
        }
    }
});

// Upload profile photo
exports.uploadProfilePhoto = [
    upload.single('profilePhoto'),
    (req, res) => {
        try {
            const { username } = req.params;
            const requestingUser = req.user.username;
            
            // Check if user is updating their own profile
            if (username !== requestingUser) {
                return res.status(403).json({ message: 'Sadece kendi profil fotoğrafınızı güncelleyebilirsiniz!' });
            }
            
            if (!req.file) {
                return res.status(400).json({ message: 'Profil fotoğrafı yüklenmedi!' });
            }
            
            const users = readJsonFile(usersFilePath);
            const userIndex = users.findIndex(u => u.username === username);
            
            if (userIndex === -1) {
                return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
            }
            
            // Delete old profile photo if exists
            if (users[userIndex].profilePhoto) {
                const oldPhotoPath = path.join(__dirname, '../../data/uploads/profiles', path.basename(users[userIndex].profilePhoto));
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            }
            
            // Update user profile photo
            const photoUrl = `/profiles/${req.file.filename}`;
            users[userIndex].profilePhoto = photoUrl;
            users[userIndex].updatedAt = new Date().toISOString();
            
            if (writeJsonFile(usersFilePath, users)) {
                res.json({ 
                    message: 'Profil fotoğrafı güncellendi!',
                    profilePhoto: photoUrl
                });
            } else {
                res.status(500).json({ message: 'Profil fotoğrafı güncellenirken hata oluştu!' });
            }
        } catch (error) {
            console.error('Error uploading profile photo:', error);
            res.status(500).json({ message: 'Sunucu hatası!' });
        }
    }
];