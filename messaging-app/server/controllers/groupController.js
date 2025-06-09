const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const groupsFilePath = path.join(__dirname, '../../data/groups/groups.json');
const usersFilePath = path.join(__dirname, '../../data/users/users.json');
const messagesFilePath = path.join(__dirname, '../../data/messages/group_messages.json');

// Helper function to read JSON files
function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
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
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Create a new group
exports.createGroup = (req, res) => {
    try {
        const { name, description } = req.body;
        const createdBy = req.user.username;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: 'Grup adı gerekli!' });
        }

        const groups = readJsonFile(groupsFilePath);
        const users = readJsonFile(usersFilePath);

        // Check if user exists
        const user = users.find(u => u.username === createdBy);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }

        // Create new group
        const newGroup = {
            id: uuidv4(),
            name: name.trim(),
            description: description || '',
            createdBy: createdBy,
            members: [{
                username: createdBy,
                joinedAt: new Date().toISOString(),
                role: 'owner'
            }],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        groups.push(newGroup);
        
        if (writeJsonFile(groupsFilePath, groups)) {
            res.status(201).json({
                message: 'Grup başarıyla oluşturuldu!',
                group: newGroup
            });
        } else {
            res.status(500).json({ message: 'Grup oluşturulurken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get all groups for a user
exports.getUserGroups = (req, res) => {
    try {
        const username = req.user.username;
        const groups = readJsonFile(groupsFilePath);

        // Filter groups where user is a member
        const userGroups = groups.filter(group => 
            group.members.some(member => member.username === username)
        );

        res.json(userGroups);
    } catch (error) {
        console.error('Error getting user groups:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get group details
exports.getGroupDetails = (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.user.username;
        const groups = readJsonFile(groupsFilePath);
        const users = readJsonFile(usersFilePath);

        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        // Check if user is a member
        const isMember = group.members.some(member => member.username === username);
        if (!isMember) {
            return res.status(403).json({ message: 'Bu gruba erişim yetkiniz yok!' });
        }

        // Add profile photos to members
        const membersWithPhotos = group.members.map(member => {
            const user = users.find(u => u.username === member.username);
            return {
                ...member,
                profilePhoto: user ? user.profilePhoto : null
            };
        });

        const groupWithPhotos = {
            ...group,
            members: membersWithPhotos
        };

        res.json(groupWithPhotos);
    } catch (error) {
        console.error('Error getting group details:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Update group
exports.updateGroup = (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description } = req.body;
        const username = req.user.username;
        const groups = readJsonFile(groupsFilePath);

        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        const group = groups[groupIndex];

        // Check if user is the owner
        if (group.createdBy !== username) {
            return res.status(403).json({ message: 'Sadece grup sahibi grubu düzenleyebilir!' });
        }

        // Update group
        if (name) group.name = name.trim();
        if (description !== undefined) group.description = description;
        group.lastActivity = new Date().toISOString();

        if (writeJsonFile(groupsFilePath, groups)) {
            res.json({
                message: 'Grup başarıyla güncellendi!',
                group: group
            });
        } else {
            res.status(500).json({ message: 'Grup güncellenirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Delete group
exports.deleteGroup = (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.user.username;
        const groups = readJsonFile(groupsFilePath);

        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        const group = groups[groupIndex];

        // Check if user is the owner
        if (group.createdBy !== username) {
            return res.status(403).json({ message: 'Sadece grup sahibi grubu silebilir!' });
        }

        // Remove group
        groups.splice(groupIndex, 1);

        if (writeJsonFile(groupsFilePath, groups)) {
            res.json({ message: 'Grup başarıyla silindi!' });
        } else {
            res.status(500).json({ message: 'Grup silinirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Add member to group
exports.addMember = (req, res) => {
    try {
        const { groupId } = req.params;
        const { username: newMemberUsername } = req.body;
        const requesterUsername = req.user.username;
        
        const groups = readJsonFile(groupsFilePath);
        const users = readJsonFile(usersFilePath);

        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        // Check if requester is a member and has permission
        const requesterMember = group.members.find(m => m.username === requesterUsername);
        if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
            return res.status(403).json({ message: 'Üye ekleme yetkiniz yok!' });
        }

        // Check if new member exists
        const newUser = users.find(u => u.username === newMemberUsername);
        if (!newUser) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı!' });
        }

        // Check if already a member
        const isAlreadyMember = group.members.some(m => m.username === newMemberUsername);
        if (isAlreadyMember) {
            return res.status(400).json({ message: 'Kullanıcı zaten grupta!' });
        }

        // Add new member
        group.members.push({
            username: newMemberUsername,
            joinedAt: new Date().toISOString(),
            role: 'member'
        });
        group.lastActivity = new Date().toISOString();

        if (writeJsonFile(groupsFilePath, groups)) {
            res.json({
                message: 'Üye başarıyla eklendi!',
                member: {
                    username: newMemberUsername,
                    profilePhoto: newUser.profilePhoto
                }
            });
        } else {
            res.status(500).json({ message: 'Üye eklenirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Remove member from group
exports.removeMember = (req, res) => {
    try {
        const { groupId, username: memberToRemove } = req.params;
        const requesterUsername = req.user.username;
        
        const groups = readJsonFile(groupsFilePath);

        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        // Check if requester has permission
        const requesterMember = group.members.find(m => m.username === requesterUsername);
        if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
            return res.status(403).json({ message: 'Üye çıkarma yetkiniz yok!' });
        }

        // Cannot remove the owner
        if (memberToRemove === group.createdBy) {
            return res.status(400).json({ message: 'Grup sahibi çıkarılamaz!' });
        }

        // Find and remove member
        const memberIndex = group.members.findIndex(m => m.username === memberToRemove);
        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Üye grupta bulunamadı!' });
        }

        group.members.splice(memberIndex, 1);
        group.lastActivity = new Date().toISOString();

        if (writeJsonFile(groupsFilePath, groups)) {
            res.json({ message: 'Üye başarıyla çıkarıldı!' });
        } else {
            res.status(500).json({ message: 'Üye çıkarılırken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Leave group
exports.leaveGroup = (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.user.username;
        
        const groups = readJsonFile(groupsFilePath);

        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        // Owner cannot leave, must delete group instead
        if (group.createdBy === username) {
            return res.status(400).json({ message: 'Grup sahibi grubu terk edemez! Grubu silin.' });
        }

        // Find and remove member
        const memberIndex = group.members.findIndex(m => m.username === username);
        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Grupta değilsiniz!' });
        }

        group.members.splice(memberIndex, 1);
        group.lastActivity = new Date().toISOString();

        if (writeJsonFile(groupsFilePath, groups)) {
            res.json({ message: 'Gruptan başarıyla ayrıldınız!' });
        } else {
            res.status(500).json({ message: 'Gruptan ayrılırken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error leaving group:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Get group messages
exports.getGroupMessages = (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.user.username;
        
        const groups = readJsonFile(groupsFilePath);
        const messages = readJsonFile(messagesFilePath);

        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        // Check if user is a member
        const isMember = group.members.some(member => member.username === username);
        if (!isMember) {
            return res.status(403).json({ message: 'Bu gruba erişim yetkiniz yok!' });
        }

        // Filter messages for this group
        const groupMessages = messages.filter(msg => msg.groupId === groupId);

        res.json(groupMessages);
    } catch (error) {
        console.error('Error getting group messages:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};

// Send message to group
exports.sendGroupMessage = (req, res) => {
    try {
        const { groupId } = req.params;
        const { content } = req.body;
        const sender = req.user.username;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Mesaj içeriği gerekli!' });
        }

        const groups = readJsonFile(groupsFilePath);
        const messages = readJsonFile(messagesFilePath);

        const group = groups.find(g => g.id === groupId);
        if (!group) {
            return res.status(404).json({ message: 'Grup bulunamadı!' });
        }

        // Check if user is a member
        const isMember = group.members.some(member => member.username === sender);
        if (!isMember) {
            return res.status(403).json({ message: 'Bu gruba mesaj gönderme yetkiniz yok!' });
        }

        const newMessage = {
            id: uuidv4(),
            groupId: groupId,
            sender: sender,
            content: content.trim(),
            type: 'text',
            timestamp: new Date().toISOString()
        };

        messages.push(newMessage);

        // Update group's last activity
        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
            groups[groupIndex].lastActivity = new Date().toISOString();
            writeJsonFile(groupsFilePath, groups);
        }

        if (writeJsonFile(messagesFilePath, messages)) {
            res.status(201).json({
                message: 'Mesaj başarıyla gönderildi!',
                messageData: newMessage
            });
        } else {
            res.status(500).json({ message: 'Mesaj gönderilirken hata oluştu!' });
        }
    } catch (error) {
        console.error('Error sending group message:', error);
        res.status(500).json({ message: 'Sunucu hatası!' });
    }
};