const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../../data/users/users.json');
const friendRequestsFilePath = path.join(__dirname, '../../data/friends/friend_requests.json');
const friendsFilePath = path.join(__dirname, '../../data/friends/friends.json');

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

// Send friend request
exports.sendFriendRequest = (req, res) => {
    try {
        const { targetUsername } = req.body;
        const requesterUsername = req.user.username;

        if (!targetUsername) {
            return res.status(400).json({ message: 'Hedef kullanıcı adı gerekli!' });
        }

        if (targetUsername === requesterUsername) {
            return res.status(400).json({ message: 'Kendinize arkadaşlık isteği gönderemezsiniz!' });
        }

        const users = readJsonFile(usersFilePath);
        const friendRequests = readJsonFile(friendRequestsFilePath);
        const friends = readJsonFile(friendsFilePath);

        // Check if target user exists
        const targetUser = users.find(u => u.username === targetUsername);
        if (!targetUser) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }

        // Check if already friends
        const existingFriendship = friends.find(f => 
            (f.user1 === requesterUsername && f.user2 === targetUsername) ||
            (f.user1 === targetUsername && f.user2 === requesterUsername)
        );
        if (existingFriendship) {
            return res.status(400).json({ message: 'Zaten arkadaşsınız!' });
        }

        // Check if request already exists
        const existingRequest = friendRequests.find(fr => 
            (fr.requester === requesterUsername && fr.target === targetUsername) ||
            (fr.requester === targetUsername && fr.target === requesterUsername)
        );

        if (existingRequest) {
            return res.status(400).json({ message: 'Zaten arkadaşlık isteği gönderilmiş!' });
        }

        // Create new friend request
        const newRequest = {
            requester: requesterUsername,
            target: targetUsername,
            timestamp: new Date().toISOString()
        };

        friendRequests.push(newRequest);

        if (writeJsonFile(friendRequestsFilePath, friendRequests)) {
            res.status(201).json({ message: 'Arkadaşlık isteği gönderildi!' });
        } else {
            res.status(500).json({ message: 'Arkadaşlık isteği gönderilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Accept friend request
exports.acceptFriendRequest = (req, res) => {
    try {
        const { requesterUsername } = req.body;
        const targetUsername = req.user.username;

        const friendRequests = readJsonFile(friendRequestsFilePath);
        const friends = readJsonFile(friendsFilePath);

        // Find the request
        const requestIndex = friendRequests.findIndex(fr => 
            fr.requester === requesterUsername && fr.target === targetUsername
        );

        if (requestIndex === -1) {
            return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı!' });
        }

        // Remove the request
        friendRequests.splice(requestIndex, 1);

        // Add friendship
        const newFriendship = {
            user1: requesterUsername,
            user2: targetUsername,
            timestamp: new Date().toISOString()
        };

        friends.push(newFriendship);

        if (writeJsonFile(friendRequestsFilePath, friendRequests) && 
            writeJsonFile(friendsFilePath, friends)) {
            res.json({ message: 'Arkadaşlık isteği kabul edildi!' });
        } else {
            res.status(500).json({ message: 'Arkadaşlık isteği kabul edilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Reject friend request
exports.rejectFriendRequest = (req, res) => {
    try {
        const { requesterUsername } = req.body;
        const targetUsername = req.user.username;

        const friendRequests = readJsonFile(friendRequestsFilePath);

        // Find and remove the request
        const requestIndex = friendRequests.findIndex(fr => 
            fr.requester === requesterUsername && fr.target === targetUsername
        );

        if (requestIndex === -1) {
            return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı!' });
        }

        friendRequests.splice(requestIndex, 1);

        if (writeJsonFile(friendRequestsFilePath, friendRequests)) {
            res.json({ message: 'Arkadaşlık isteği reddedildi!' });
        } else {
            res.status(500).json({ message: 'Arkadaşlık isteği reddedilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Cancel sent friend request
exports.cancelFriendRequest = (req, res) => {
    try {
        const { targetUsername } = req.body;
        const requesterUsername = req.user.username;

        console.log(`Canceling friend request from ${requesterUsername} to ${targetUsername}`); // Debug log

        const friendRequests = readJsonFile(friendRequestsFilePath);

        // Find and remove the request
        const requestIndex = friendRequests.findIndex(fr => 
            fr.requester === requesterUsername && fr.target === targetUsername
        );

        console.log(`Found request at index: ${requestIndex}`); // Debug log
        console.log(`Total requests: ${friendRequests.length}`); // Debug log

        if (requestIndex === -1) {
            return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı!' });
        }

        // Remove the request
        friendRequests.splice(requestIndex, 1);

        if (writeJsonFile(friendRequestsFilePath, friendRequests)) {
            console.log('Friend request canceled successfully'); // Debug log
            res.json({ message: 'Arkadaşlık isteği iptal edildi!' });
        } else {
            res.status(500).json({ message: 'Arkadaşlık isteği iptal edilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error canceling friend request:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Remove friend
exports.removeFriend = (req, res) => {
    try {
        const { friendUsername } = req.body;
        const username = req.user.username;

        const friends = readJsonFile(friendsFilePath);

        // Find friendship
        const friendshipIndex = friends.findIndex(f => 
            (f.user1 === username && f.user2 === friendUsername) ||
            (f.user1 === friendUsername && f.user2 === username)
        );

        if (friendshipIndex === -1) {
            return res.status(404).json({ message: 'Arkadaşlık bulunamadı!' });
        }

        // Remove friendship
        friends.splice(friendshipIndex, 1);

        if (writeJsonFile(friendsFilePath, friends)) {
            res.json({ message: 'Arkadaş başarıyla silindi!' });
        } else {
            res.status(500).json({ message: 'Arkadaş silinirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get friends list
exports.getFriendsList = (req, res) => {
    try {
        const username = req.user.username;
        const friends = readJsonFile(friendsFilePath);
        const users = readJsonFile(usersFilePath);

        // Get user's friends
        const userFriends = friends.filter(f => 
            f.user1 === username || f.user2 === username
        );

        // Get friend details
        const friendsList = userFriends.map(friendship => {
            const friendUsername = friendship.user1 === username ? 
                friendship.user2 : friendship.user1;
            
            const friendUser = users.find(u => u.username === friendUsername);
            
            return {
                username: friendUsername,
                profilePhoto: friendUser ? friendUser.profilePhoto : null,
                isOnline: friendUser ? friendUser.isOnline : false,
                friendshipDate: friendship.timestamp
            };
        });

        res.json({ friends: friendsList });
    } catch (error) {
        console.error('Error getting friends list:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get pending friend requests
exports.getPendingRequests = (req, res) => {
    try {
        const username = req.user.username;
        const friendRequests = readJsonFile(friendRequestsFilePath);
        const users = readJsonFile(usersFilePath);

        // Get received requests (where user is target) - bunları kabul/reddet edebilir
        const receivedRequests = friendRequests
            .filter(fr => fr.target === username)
            .map(fr => {
                const requesterUser = users.find(u => u.username === fr.requester);
                return {
                    username: fr.requester,
                    requester: fr.requester,
                    timestamp: fr.timestamp,
                    profilePhoto: requesterUser ? requesterUser.profilePhoto : null,
                    type: 'received'
                };
            });

        // Get sent requests (where user is requester) - bunları iptal edebilir
        const sentRequests = friendRequests
            .filter(fr => fr.requester === username)
            .map(fr => {
                const targetUser = users.find(u => u.username === fr.target);
                return {
                    username: fr.target,
                    target: fr.target,
                    timestamp: fr.timestamp,
                    profilePhoto: targetUser ? targetUser.profilePhoto : null,
                    type: 'sent'
                };
            });

        res.json({ 
            receivedRequests, 
            sentRequests,
            totalReceived: receivedRequests.length,
            totalSent: sentRequests.length
        });
    } catch (error) {
        console.error('Error getting pending requests:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get online status of friends
exports.getOnlineStatus = (req, res) => {
    try {
        const username = req.user.username;
        const friends = readJsonFile(friendsFilePath);
        const users = readJsonFile(usersFilePath);

        // Get user's friends
        const userFriends = friends.filter(f => 
            f.user1 === username || f.user2 === username
        );

        // Get online status for each friend
        const onlineStatuses = {};
        
        userFriends.forEach(friendship => {
            const friendUsername = friendship.user1 === username ? 
                friendship.user2 : friendship.user1;
            
            const friendUser = users.find(u => u.username === friendUsername);
            
            if (friendUser) {
                onlineStatuses[friendUsername] = {
                    isOnline: friendUser.isOnline || false,
                    lastSeen: friendUser.lastSeen || null
                };
            }
        });

        res.json(onlineStatuses);
    } catch (error) {
        console.error('Error getting online status:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};