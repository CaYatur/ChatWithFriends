const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const callsFilePath = path.join(__dirname, '../../data/calls/calls.json');
const usersFilePath = path.join(__dirname, '../../data/users/users.json');

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

// Initiate a voice call
exports.initiateCall = (req, res) => {
    try {
        const { targetUsername, callType } = req.body; // callType: 'voice' or 'video'
        const callerUsername = req.user.username;

        if (!targetUsername) {
            return res.status(400).json({ message: 'Hedef kullanıcı gerekli!' });
        }

        if (targetUsername === callerUsername) {
            return res.status(400).json({ message: 'Kendinizi arayamazsınız!' });
        }

        const users = readJsonFile(usersFilePath);
        const calls = readJsonFile(callsFilePath);

        // Check if target user exists
        const targetUser = users.find(u => u.username === targetUsername);
        if (!targetUser) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }

        // Check if target user is online
        if (!targetUser.isOnline) {
            return res.status(400).json({ message: 'Kullanıcı çevrimdışı!' });
        }

        // Create call record
        const newCall = {
            id: uuidv4(),
            caller: callerUsername,
            target: targetUsername,
            callType: callType || 'voice',
            status: 'initiating', // initiating, ringing, active, ended
            startTime: new Date().toISOString(),
            endTime: null,
            duration: null
        };

        calls.push(newCall);

        if (writeJsonFile(callsFilePath, calls)) {
            // In a real implementation, you would emit this via Socket.IO
            res.status(201).json({ 
                message: 'Arama başlatıldı!', 
                callId: newCall.id,
                call: newCall
            });
        } else {
            res.status(500).json({ message: 'Arama başlatılırken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error initiating call:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Accept a voice call
exports.acceptCall = (req, res) => {
    try {
        const { callId } = req.body;
        const username = req.user.username;

        const calls = readJsonFile(callsFilePath);

        // Find the call
        const callIndex = calls.findIndex(call => 
            call.id === callId && call.target === username && call.status === 'initiating'
        );

        if (callIndex === -1) {
            return res.status(404).json({ message: 'Arama bulunamadı veya zaten sonlanmış!' });
        }

        // Update call status
        calls[callIndex].status = 'active';
        calls[callIndex].acceptTime = new Date().toISOString();

        if (writeJsonFile(callsFilePath, calls)) {
            res.json({ 
                message: 'Arama kabul edildi!', 
                call: calls[callIndex]
            });
        } else {
            res.status(500).json({ message: 'Arama kabul edilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error accepting call:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Reject a voice call
exports.rejectCall = (req, res) => {
    try {
        const { callId } = req.body;
        const username = req.user.username;

        const calls = readJsonFile(callsFilePath);

        // Find the call
        const callIndex = calls.findIndex(call => 
            call.id === callId && call.target === username && call.status === 'initiating'
        );

        if (callIndex === -1) {
            return res.status(404).json({ message: 'Arama bulunamadı veya zaten sonlanmış!' });
        }

        // Update call status
        calls[callIndex].status = 'rejected';
        calls[callIndex].endTime = new Date().toISOString();

        if (writeJsonFile(callsFilePath, calls)) {
            res.json({ 
                message: 'Arama reddedildi!', 
                call: calls[callIndex]
            });
        } else {
            res.status(500).json({ message: 'Arama reddedilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error rejecting call:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// End a voice call
exports.endCall = (req, res) => {
    try {
        const { callId } = req.body;
        const username = req.user.username;

        const calls = readJsonFile(callsFilePath);

        // Find the call
        const callIndex = calls.findIndex(call => 
            call.id === callId && 
            (call.caller === username || call.target === username) &&
            (call.status === 'active' || call.status === 'initiating')
        );

        if (callIndex === -1) {
            return res.status(404).json({ message: 'Arama bulunamadı!' });
        }

        // Calculate duration if call was active
        const call = calls[callIndex];
        const endTime = new Date();
        let duration = null;

        if (call.status === 'active' && call.acceptTime) {
            const acceptTime = new Date(call.acceptTime);
            duration = Math.floor((endTime - acceptTime) / 1000); // Duration in seconds
        }

        // Update call status
        calls[callIndex].status = 'ended';
        calls[callIndex].endTime = endTime.toISOString();
        calls[callIndex].duration = duration;

        if (writeJsonFile(callsFilePath, calls)) {
            res.json({ 
                message: 'Arama sonlandırıldı!', 
                call: calls[callIndex]
            });
        } else {
            res.status(500).json({ message: 'Arama sonlandırılırken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error ending call:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get call history
exports.getCallHistory = (req, res) => {
    try {
        const username = req.user.username;
        const calls = readJsonFile(callsFilePath);

        // Get user's calls (as caller or target)
        const userCalls = calls.filter(call => 
            call.caller === username || call.target === username
        );

        // Sort by start time (newest first)
        userCalls.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        res.json(userCalls);
    } catch (error) {
        console.error('Error getting call history:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};