const app = (() => {
    let currentUser = null;
    let currentChatId = null;
    let currentChatType = 'friend'; // 'friend' or 'group'
    let currentChatData = null;

    const init = () => {
        setupEventListeners();
        loadUserProfile();
        loadFriendsList();
        loadGroups();
    };

    const setupEventListeners = () => {
        document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
        document.getElementById('createGroupBtn').addEventListener('click', createGroup);
        document.getElementById('uploadProfilePicBtn').addEventListener('change', uploadProfilePicture);
    };

    const loadUserProfile = () => {
        // Fetch user profile data from the server
        fetch('/api/users/profile')
            .then(response => response.json())
            .then(data => {
                document.getElementById('username').innerText = data.username;
                document.getElementById('profilePic').src = data.profilePicUrl;
            })
            .catch(error => console.error('Error loading user profile:', error));
    };

    const loadFriendsList = () => {
        // Fetch friends list from the server
        fetch('/api/friends')
            .then(response => response.json())
            .then(data => {
                const friendsList = document.getElementById('friendsList');
                friendsList.innerHTML = '';
                data.forEach(friend => {
                    const li = document.createElement('li');
                    li.innerText = friend.username;
                    friendsList.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading friends list:', error));
    };

    const loadGroups = () => {
        // Fetch groups from the server
        fetch('/api/groups')
            .then(response => response.json())
            .then(data => {
                const groupsList = document.getElementById('groupsList');
                groupsList.innerHTML = '';
                data.forEach(group => {
                    const li = document.createElement('li');
                    li.innerText = group.name;
                    groupsList.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading groups:', error));
    };

    const sendMessage = () => {
        const message = document.getElementById('messageInput').value;
        // Send message to the server
        fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Message sent:', data);
            document.getElementById('messageInput').value = '';
        })
        .catch(error => console.error('Error sending message:', error));
    };

    const createGroup = () => {
        const groupName = document.getElementById('groupNameInput').value;
        // Create a new group on the server
        fetch('/api/groups/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: groupName })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Group created:', data);
            loadGroups();
        })
        .catch(error => console.error('Error creating group:', error));
    };

    const uploadProfilePicture = (event) => {
        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('profilePic', file);

        fetch('/api/users/uploadProfilePic', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Profile picture uploaded:', data);
            loadUserProfile();
        })
        .catch(error => console.error('Error uploading profile picture:', error));
    };

    // Initialize app
    document.addEventListener('DOMContentLoaded', function() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        if (token && username) {
            currentUser = { username, token };
            showChatInterface();
            loadUserData();
        } else {
            showLogin();
        }
    });

    // Auth functions
    function showLogin() {
        document.getElementById('login').style.display = 'block';
        document.getElementById('register').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'none';
    }

    function showRegister() {
        document.getElementById('login').style.display = 'none';
        document.getElementById('register').style.display = 'block';
        document.getElementById('chatInterface').style.display = 'none';
    }

    function showChatInterface() {
        document.getElementById('login').style.display = 'none';
        document.getElementById('register').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'flex';
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        currentUser = null;
        currentChatId = null;
        currentChatData = null;
        showLogin();
    }

    // Load user data
    async function loadUserData() {
        if (!currentUser) return;
        
        document.getElementById('currentUsername').textContent = currentUser.username;
        
        // Load profile photo
        try {
            const response = await fetch(`/api/users/${currentUser.username}`, {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                if (userData.profilePhoto) {
                    document.getElementById('userAvatar').src = userData.profilePhoto;
                    document.getElementById('settingsAvatar').src = userData.profilePhoto;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
        
        // Load friends and groups
        loadFriends();
        loadGroups();
        loadFriendRequests();
    }

    // Tab management
    function showTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        event.target.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    // Friends functions
    async function loadFriends() {
        try {
            const response = await fetch('/api/friends/list', {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const friendsList = document.getElementById('friendsList');
                friendsList.innerHTML = '';
                
                data.friends.forEach(friend => {
                    const friendElement = createFriendElement(friend);
                    friendsList.appendChild(friendElement);
                });
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    function createFriendElement(friend) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.onclick = () => openChat(friend.username, 'friend', friend);
        
        div.innerHTML = `
            <img src="${friend.profilePhoto || '/profiles/default.png'}" alt="${friend.username}" class="friend-avatar" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTggMzJDOCAyNS4zNzI2IDEzLjM3MjYgMjAgMjAgMjBDMjYuNjI3NCAyMCAzMiAyNS4zNzI2IDMyIDMyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'">
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="friend-status">Çevrimiçi</div>
            </div>
        `;
        
        return div;
    }

    async function sendFriendRequest() {
        const username = document.getElementById('friendUsername').value.trim();
        if (!username) return;
        
        try {
            const response = await fetch('/api/friends/send-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ targetUsername: username })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('friendUsername').value = '';
                showNotification('Arkadaşlık isteği gönderildi!', 'success');
            } else {
                showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            showNotification('Bir hata oluştu!', 'error');
        }
    }

    async function loadFriendRequests() {
        try {
            const response = await fetch('/api/friends/pending-requests', {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const requestsList = document.getElementById('friendRequests');
                const requestCount = document.getElementById('requestCount');
                
                requestsList.innerHTML = '';
                requestCount.textContent = data.receivedRequests.length;
                
                data.receivedRequests.forEach(request => {
                    const requestElement = createRequestElement(request);
                    requestsList.appendChild(requestElement);
                });
            }
        } catch (error) {
            console.error('Error loading friend requests:', error);
        }
    }

    function createRequestElement(request) {
        const div = document.createElement('div');
        div.className = 'request-item';
        
        div.innerHTML = `
            <img src="${request.profilePhoto || '/profiles/default.png'}" alt="${request.username}" class="friend-avatar"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTggMzJDOCAyNS4zNzI2IDEzLjM3MjYgMjAgMjAgMjBDMjYuNjI3NCAyMCAzMiAyNS4zNzI2IDMyIDMyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'">
            <div class="friend-info">
                <div class="friend-name">${request.username}</div>
            </div>
            <div class="request-actions">
                <button class="accept-btn" onclick="acceptFriendRequest('${request.username}')" title="Kabul Et">
                    <i class="fas fa-check"></i>
                </button>
                <button class="reject-btn" onclick="rejectFriendRequest('${request.username}')" title="Reddet">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        return div;
    }

    async function acceptFriendRequest(username) {
        try {
            const response = await fetch('/api/friends/accept-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ requesterUsername: username })
            });
            
            if (response.ok) {
                loadFriendRequests();
                loadFriends();
                showNotification('Arkadaşlık isteği kabul edildi!', 'success');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    }

    async function rejectFriendRequest(username) {
        try {
            const response = await fetch('/api/friends/reject-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ requesterUsername: username })
            });
            
            if (response.ok) {
                loadFriendRequests();
                showNotification('Arkadaşlık isteği reddedildi!', 'success');
            }
        } catch (error) {
            console.error('Error rejecting friend request:', error);
        }
    }

    // Groups functions
    async function loadGroups() {
        try {
            const response = await fetch('/api/groups', {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            
            if (response.ok) {
                const groups = await response.json();
                const groupsList = document.getElementById('groupsList');
                groupsList.innerHTML = '';
                
                groups.forEach(group => {
                    const groupElement = createGroupElement(group);
                    groupsList.appendChild(groupElement);
                });
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    function createGroupElement(group) {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.onclick = () => openChat(group.id, 'group', group);
        
        div.innerHTML = `
            <div class="group-avatar">
                <i class="fas fa-users"></i>
            </div>
            <div class="group-info">
                <div class="group-name">${group.name}</div>
                <div class="group-members">${group.members.length} üye</div>
            </div>
        `;
        
        return div;
    }

    async function createGroup() {
        const name = document.getElementById('groupName').value.trim();
        if (!name) return;
        
        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ name })
            });
            
            if (response.ok) {
                document.getElementById('groupName').value = '';
                loadGroups();
                showNotification('Grup oluşturuldu!', 'success');
            }
        } catch (error) {
            console.error('Error creating group:', error);
        }
    }

    // Chat functions
    function openChat(chatId, chatType, chatData) {
        currentChatId = chatId;
        currentChatType = chatType;
        currentChatData = chatData;
        
        // Update UI
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        // Update chat header
        document.getElementById('chatName').textContent = chatData.username || chatData.name;
        document.getElementById('chatStatus').textContent = chatType === 'friend' ? 'Çevrimiçi' : `${chatData.members.length} üye`;
        
        if (chatType === 'friend') {
            document.getElementById('chatAvatar').src = chatData.profilePhoto || '/profiles/default.png';
        } else {
            document.getElementById('chatAvatar').src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Q0FGNTCIIC8+CjxnIGZpbGw9IndoaXRlIj4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNSIgcj0iMyIvPgo8Y2lyY2xlIGN4PSIyNSIgY3k9IjE1IiByPSIzIi8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMjUiIHI9IjMiLz4KPC9nPgo8L3N2Zz4K';
        }
        
        // Remove active class from all items
        document.querySelectorAll('.friend-item, .group-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current item
        event.target.closest('.friend-item, .group-item')?.classList.add('active');
        
        // Load messages
        loadMessages();
    }

    async function loadMessages() {
        if (!currentChatId) return;
        
        try {
            let url;
            if (currentChatType === 'friend') {
                const chatId = [currentUser.username, currentChatId].sort().join('-');
                url = `/api/messages/chat/${chatId}`;
            } else {
                url = `/api/groups/${currentChatId}/messages`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            
            if (response.ok) {
                const messages = await response.json();
                displayMessages(messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    function displayMessages(messages) {
        const messagesArea = document.getElementById('messagesArea');
        messagesArea.innerHTML = '';
        
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            messagesArea.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.sender === currentUser.username ? 'own' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <img src="/profiles/default.png" alt="${message.sender}" class="message-avatar"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTggMzJDOCAyNS4zNzI2IDEzLjM3MjYgMjAgMjAgMjBDMjYuNjI3NCAyMCAzMiAyNS4zNzI2IDMyIDMyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'">
            <div class="message-content">
                ${currentChatType === 'group' && message.sender !== currentUser.username ? `
                    <div class="message-header">
                        <span class="message-sender">${message.sender}</span>
                        <span class="message-time">${time}</span>
                    </div>
                ` : `<div class="message-header"><span class="message-time">${time}</span></div>`}
                <div class="message-text">${message.content}</div>
            </div>
        `;
        
        return div;
    }

    async function sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !currentChatId) return;
        
        try {
            let url, body;
            
            if (currentChatType === 'friend') {
                url = '/api/messages/send';
                body = {
                    receiverUsername: currentChatId,
                    content: content
                };
            } else {
                url = `/api/groups/${currentChatId}/messages`;
                body = {
                    content: content
                };
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                input.value = '';
                loadMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    function handleMessageKeyPress(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    }

    // File attachment
    function attachFile() {
        document.getElementById('fileInput').click();
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            // TODO: Implement file upload
            showNotification('Dosya yükleme özelliği yakında!', 'info');
        }
    }

    // User settings
    function showUserSettings() {
        document.getElementById('settingsUsername').value = currentUser.username;
        // Load current email and avatar
        document.getElementById('userSettingsModal').style.display = 'block';
    }

    function closeUserSettings() {
        document.getElementById('userSettingsModal').style.display = 'none';
    }

    function uploadProfilePhoto() {
        document.getElementById('profilePhotoInput').click();
    }

    async function handleProfilePhotoChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('profilePhoto', file);
        
        try {
            const response = await fetch(`/api/users/${currentUser.username}/photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                document.getElementById('userAvatar').src = data.profilePhoto;
                document.getElementById('settingsAvatar').src = data.profilePhoto;
                showNotification('Profil fotoğrafı güncellendi!', 'success');
            }
        } catch (error) {
            console.error('Error uploading profile photo:', error);
            showNotification('Profil fotoğrafı yüklenirken hata oluştu!', 'error');
        }
    }

    async function updateProfile() {
        const email = document.getElementById('settingsEmail').value;
        
        try {
            const response = await fetch(`/api/users/${currentUser.username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ email })
            });
            
            if (response.ok) {
                showNotification('Profil güncellendi!', 'success');
                closeUserSettings();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Profil güncellenirken hata oluştu!', 'error');
        }
    }

    // Voice call
    function startVoiceCall() {
        if (currentChatType === 'friend' && currentChatData) {
            document.getElementById('voiceCallName').textContent = currentChatData.username;
            document.getElementById('voiceCallAvatar').src = currentChatData.profilePhoto || '/profiles/default.png';
            document.getElementById('voiceCallModal').style.display = 'block';
            
            // TODO: Implement actual voice call functionality
            setTimeout(() => {
                document.getElementById('voiceCallStatus').textContent = 'Bağlandı';
            }, 2000);
        }
    }

    function muteCall() {
        const btn = document.getElementById('muteBtn');
        const icon = btn.querySelector('i');
        
        if (icon.classList.contains('fa-microphone')) {
            icon.classList.remove('fa-microphone');
            icon.classList.add('fa-microphone-slash');
            btn.style.background = 'var(--accent-danger)';
        } else {
            icon.classList.remove('fa-microphone-slash');
            icon.classList.add('fa-microphone');
            btn.style.background = 'var(--bg-tertiary)';
        }
    }

    function endCall() {
        document.getElementById('voiceCallModal').style.display = 'none';
        // Reset call state
        document.getElementById('voiceCallStatus').textContent = 'Aranıyor...';
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.querySelector('i').className = 'fas fa-microphone';
        muteBtn.style.background = 'var(--bg-tertiary)';
    }

    // Utility functions
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-primary);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        if (type === 'error') {
            notification.style.background = 'var(--accent-danger)';
        }
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Add CSS for notification animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', app.init);