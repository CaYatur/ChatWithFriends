const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const messagesFilePath = path.join(__dirname, '../../data/messages/messages.json');

// Helper function to read messages from file
const readMessagesFromFile = () => {
    if (!fs.existsSync(messagesFilePath)) {
        const dir = path.dirname(messagesFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(messagesFilePath, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(messagesFilePath, 'utf8');
    return JSON.parse(data);
};

// Helper function to write messages to file
const writeMessagesToFile = (messages) => {
    const dir = path.dirname(messagesFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2));
};

// Function to send a message
exports.sendMessage = (req, res) => {
    const { receiverUsername, content } = req.body;
    const senderUsername = req.user.username;

    if (!receiverUsername || !content) {
        return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const newMessage = {
        id: uuidv4(),
        sender: senderUsername,
        receiver: receiverUsername,
        content,
        type: 'text',
        timestamp: new Date().toISOString(),
        read: false
    };

    const messages = readMessagesFromFile();
    messages.push(newMessage);
    writeMessagesToFile(messages);

    res.status(201).json({ message: 'Message sent successfully', data: newMessage });
};

// Function to upload and send file
exports.uploadFile = (req, res) => {
    try {
        const { chatId, chatType } = req.body;
        const senderUsername = req.user.username;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Dosya yüklenemedi!' });
        }

        if (!chatId) {
            return res.status(400).json({ message: 'Chat ID gerekli!' });
        }

        // Create file message
        const fileData = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: `/uploads/files/${req.file.filename}`
        };

        let newMessage;
        const messages = readMessagesFromFile();

        if (chatType === 'friend') {
            newMessage = {
                id: uuidv4(),
                sender: senderUsername,
                receiver: chatId,
                content: `Dosya gönderildi: ${req.file.originalname}`,
                type: 'file',
                fileData: fileData,
                timestamp: new Date().toISOString(),
                read: false
            };
        } else {
            // For group messages, we'd handle differently
            // This is a simplified version
            newMessage = {
                id: uuidv4(),
                groupId: chatId,
                sender: senderUsername,
                content: `Dosya gönderildi: ${req.file.originalname}`,
                type: 'file',
                fileData: fileData,
                timestamp: new Date().toISOString()
            };
        }

        messages.push(newMessage);
        writeMessagesToFile(messages);

        res.status(201).json({ 
            message: 'Dosya başarıyla yüklendi!', 
            data: newMessage 
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Dosya yüklenirken hata oluştu!' });
    }
};

// Function to get messages for a chat
exports.getMessages = (req, res) => {
    const { chatId } = req.params;
    const { chatType, after } = req.query;
    const username = req.user.username;

    try {
        const messages = readMessagesFromFile();
        let chatMessages;

        if (chatType === 'group') {
            // Group messages
            chatMessages = messages.filter(message => message.groupId === chatId);
        } else {
            // Friend messages - chatId is the friend's username
            chatMessages = messages.filter(message => 
                (message.sender === username && message.receiver === chatId) ||
                (message.sender === chatId && message.receiver === username)
            );
        }

        // Sort by timestamp
        chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // If 'after' parameter is provided, return only messages after that ID
        if (after) {
            const afterIndex = chatMessages.findIndex(msg => msg.id === after);
            if (afterIndex !== -1) {
                chatMessages = chatMessages.slice(afterIndex + 1);
            }
        }

        res.json(chatMessages);
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ message: 'Mesajlar yüklenirken hata oluştu!' });
    }
};

// Function to delete a message
exports.deleteMessage = (req, res) => {
    const { messageId } = req.params;
    const username = req.user.username;

    try {
        const messages = readMessagesFromFile();
        const messageIndex = messages.findIndex(msg => msg.id === messageId);

        if (messageIndex === -1) {
            return res.status(404).json({ message: 'Mesaj bulunamadı!' });
        }

        const message = messages[messageIndex];

        // Check if user is the sender
        if (message.sender !== username) {
            return res.status(403).json({ message: 'Bu mesajı silme yetkiniz yok!' });
        }

        // Remove message
        messages.splice(messageIndex, 1);
        writeMessagesToFile(messages);

        res.json({ message: 'Mesaj başarıyla silindi!' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Mesaj silinirken hata oluştu!' });
    }
};

// Function to get all chats for a user
exports.getUserChats = (req, res) => {
    const username = req.user.username;
    const messages = readMessagesFromFile();
    
    try {
        // Get unique chat partners
        const chatPartners = new Set();
        messages.forEach(message => {
            if (message.sender === username && message.receiver) {
                chatPartners.add(message.receiver);
            } else if (message.receiver === username && message.sender) {
                chatPartners.add(message.sender);
            }
        });
        
        // Get last message for each chat
        const chats = Array.from(chatPartners).map(partner => {
            const chatMessages = messages.filter(message => 
                (message.sender === username && message.receiver === partner) ||
                (message.sender === partner && message.receiver === username)
            );
            
            const lastMessage = chatMessages[chatMessages.length - 1];
            
            return {
                chatId: partner,
                partner,
                lastMessage,
                messageCount: chatMessages.length
            };
        });
        
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error getting user chats:', error);
        res.status(500).json({ message: 'Sohbetler yüklenirken hata oluştu!' });
    }
};