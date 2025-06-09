const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../data/uploads/files');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow all file types for now
        cb(null, true);
    }
});

// Profile photo upload configuration
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../data/uploads/profiles');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${req.user.username}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for profile photos
    },
    fileFilter: function (req, file, cb) {
        // Only allow image files for profile photos
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for profile photos'), false);
        }
    }
});

// Upload file for messaging
exports.uploadFile = upload.single('file');

// Upload profile photo
exports.uploadProfilePhoto = profileUpload.single('profilePhoto');

// Handle file upload after multer processing
exports.handleFileUpload = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileData = {
        id: uuidv4(),
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.username,
        uploadedAt: new Date().toISOString(),
        url: `/uploads/files/${req.file.filename}`
    };
    
    // Save file metadata
    const filesMetadataPath = path.join(__dirname, '../../data/uploads/files-metadata.json');
    let filesMetadata = [];
    
    if (fs.existsSync(filesMetadataPath)) {
        filesMetadata = JSON.parse(fs.readFileSync(filesMetadataPath, 'utf8'));
    }
    
    filesMetadata.push(fileData);
    fs.writeFileSync(filesMetadataPath, JSON.stringify(filesMetadata, null, 2));
    
    res.status(200).json(fileData);
};

// Handle profile photo upload
exports.handleProfilePhotoUpload = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    // Update user's profile photo in users.json
    const usersFilePath = path.join(__dirname, '../../data/users/users.json');
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    
    const userIndex = users.findIndex(user => user.username === req.user.username);
    if (userIndex !== -1) {
        // Delete old profile photo if exists
        if (users[userIndex].profilePhoto) {
            const oldPhotoPath = path.join(__dirname, '../../data', users[userIndex].profilePhoto);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }
        
        users[userIndex].profilePhoto = photoUrl;
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    }
    
    res.status(200).json({
        message: 'Profile photo updated successfully',
        profilePhoto: photoUrl
    });
};

// Get file metadata
exports.getFileMetadata = (req, res) => {
    const { fileId } = req.params;
    
    const filesMetadataPath = path.join(__dirname, '../../data/uploads/files-metadata.json');
    
    if (!fs.existsSync(filesMetadataPath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const filesMetadata = JSON.parse(fs.readFileSync(filesMetadataPath, 'utf8'));
    const fileData = filesMetadata.find(file => file.id === fileId);
    
    if (!fileData) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    res.status(200).json(fileData);
};

// Download file
exports.downloadFile = (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../data/uploads/files', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    res.download(filePath);
};