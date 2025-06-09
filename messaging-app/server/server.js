const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');

// Initialize the Express application
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));
app.use('/profiles', express.static(path.join(__dirname, '../data/uploads/profiles')));

// Create data directories if they don't exist
const dataDirs = [
    'users', 
    'groups', 
    'messages', 
    'messages/group_messages',
    'friends', 
    'calls',
    'uploads/profiles', 
    'uploads/files', 
    'logs'
];

dataDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '../data', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const groupRoutes = require('./routes/groups');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const voiceRoutes = require('./routes/voice');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice', voiceRoutes);

// Serve the login page as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Handle all other routes by serving appropriate HTML pages
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/register.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/chat.html'));
});

// Redirect any other routes to login
app.get('*', (req, res) => {
    res.redirect('/');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join user to their personal room
    socket.on('join', (userData) => {
        socket.username = userData.username;
        socket.join(userData.username);
        console.log(`${userData.username} joined their room`);
        
        // Update user online status
        updateUserOnlineStatus(userData.username, true);
        
        // Broadcast to all users that this user is online
        socket.broadcast.emit('userOnline', {
            username: userData.username
        });
    });
    
    // Handle new messages
    socket.on('newMessage', (messageData) => {
        const roomName = messageData.chatType === 'friend' 
            ? [messageData.sender, messageData.receiver].sort().join('-')
            : `group-${messageData.groupId}`;
        
        // Broadcast to all users in the room except sender
        socket.to(roomName).emit('messageReceived', messageData);
    });
    
    // Notify about friend request sent
    socket.on('friendRequestSent', (data) => {
        socket.to(data.target).emit('friendRequestSent', {
            sender: data.sender,
            target: data.target,
            timestamp: data.timestamp
        });
    });
    
    // Notify about friend request accepted
    socket.on('friendRequestAccepted', (data) => {
        socket.to(data.requester).emit('friendRequestAccepted', {
            requester: data.requester,
            target: data.target
        });
    });
    
    // Notify about friend request rejected
    socket.on('friendRequestRejected', (data) => {
        socket.to(data.requester).emit('friendRequestRejected', {
            requester: data.requester,
            target: data.target
        });
    });
    
    // Notify about friend request canceled
    socket.on('friendRequestCanceled', (data) => {
        socket.to(data.target).emit('friendRequestCanceled', {
            requester: data.requester,
            target: data.target
        });
    });
    
    // Notify about friendship removed
    socket.on('friendshipRemoved', (data) => {
        socket.to(data.friend2).emit('friendshipRemoved', {
            friend1: data.friend1,
            friend2: data.friend2
        });
    });
    
    // Handle typing indicators
    socket.on('typing', (data) => {
        const roomName = data.chatType === 'friend' 
            ? [data.sender, data.receiver].sort().join('-')
            : `group-${data.groupId}`;
        
        socket.to(roomName).emit('userTyping', {
            username: socket.username,
            isTyping: data.isTyping
        });
    });
    
    // Handle voice call events
    socket.on('initiateCall', (callData) => {
        socket.to(callData.target).emit('incomingCall', {
            caller: callData.caller,
            callId: callData.callId,
            callType: callData.callType
        });
    });
    
    socket.on('acceptCall', (callData) => {
        socket.to(callData.caller).emit('callAccepted', {
            callId: callData.callId
        });
    });
    
    socket.on('rejectCall', (callData) => {
        socket.to(callData.caller).emit('callRejected', {
            callId: callData.callId
        });
    });
    
    socket.on('endCall', (callData) => {
        socket.to(callData.target).emit('callEnded', {
            callId: callData.callId
        });
    });
    
    // Handle WebRTC signaling
    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', {
            offer: data.offer,
            from: socket.username
        });
    });
    
    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', {
            answer: data.answer,
            from: socket.username
        });
    });
    
    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', {
            candidate: data.candidate,
            from: socket.username
        });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.username) {
            updateUserOnlineStatus(socket.username, false);
            
            // Broadcast to all users that this user is offline
            socket.broadcast.emit('userOffline', {
                username: socket.username
            });
        }
    });
});

// Helper function to update user online status
function updateUserOnlineStatus(username, isOnline) {
    const usersFilePath = path.join(__dirname, '../data/users/users.json');
    
    try {
        if (fs.existsSync(usersFilePath)) {
            const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
            const userIndex = users.findIndex(u => u.username === username);
            
            if (userIndex !== -1) {
                users[userIndex].isOnline = isOnline;
                users[userIndex].lastSeen = new Date().toISOString();
                fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
            }
        }
    } catch (error) {
        console.error('Error updating user online status:', error);
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Create founder account if it doesn't exist
async function createFounderAccount() {
    const usersFilePath = path.join(__dirname, '../data/users/users.json');
    
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
    }
    
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const founderExists = users.find(user => user.username === 'CaYatur');
    
    if (!founderExists) {
        const founderPassword = 'CHANGE_ME';
        const hashedPassword = await bcrypt.hash(founderPassword, 10);
        
        const founderUser = {
            email: 'cayatur@chatfriends.com',
            username: 'CaYatur',
            password: hashedPassword,
            profilePhoto: null,
            badges: ['founder', 'admin'],
            friends: [],
            groups: [],
            banned: false,
            isOnline: false,
            lastSeen: null,
            createdAt: new Date().toISOString()
        };
        
        users.push(founderUser);
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        
        console.log('✅ Founder account created successfully!');
        console.log('📧 Email: cayatur@chatfriends.com');
        console.log('👤 Username: CaYatur');
        console.log('🔐 Password: founder123');
        console.log('⚠️  Please change the password after first login!');
    } else {
        console.log('ℹ️  Founder account already exists');
    }
}

// Start the server
server.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🌐 Access the application at: http://localhost:${PORT}`);
    
    await createFounderAccount();
});

// Export io for use in other files
module.exports = { app, server, io };