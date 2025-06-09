const apiUrl = '/api';
let currentUser = null;
let currentChatId = null;
let currentChatType = 'friend';
let currentChatData = null;
let lastActivityTime = Date.now();
let onlineStatusInterval;
let messageUpdateInterval;
let lastMessageId = null;
let currentCall = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;

// Socket.IO connection
let socket = null;

// Check authentication
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = { username, token };
    initializeChat();
});

async function initializeChat() {
    try {
        await loadUserData();
        initializeSocket();
        loadFriends();
        loadGroups();
        loadFriendRequests();
        initializeOnlineStatus();
        initializeRealTimeMessages();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing chat:', error);
        showNotification('Başlatma hatası!', 'error');
    }
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (searchInput.value.trim()) {
                    searchFriends();
                } else {
                    loadFriends();
                }
            }, 500);
        });
    }
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

function initializeSocket() {
    // Initialize socket.io connection
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        // Join user's personal room
        socket.emit('join', { username: currentUser.username });
    });
    
    socket.on('messageReceived', (messageData) => {
        // Sadece diğer kullanıcılardan gelen mesajları ekle
        if (messageData.sender !== currentUser.username) {
            // Add new message to current chat if it matches
            if (currentChatId && 
                ((currentChatType === 'friend' && 
                  (messageData.sender === currentChatId || messageData.receiver === currentChatId)) ||
                 (currentChatType === 'group' && messageData.groupId === currentChatId))) {
                addMessageToChat(messageData);
                scrollToBottom();
            }
            
            // Unread message indicator güncelle
            updateUnreadMessageIndicator(messageData);
        }
    });

    // Arkadaşlık isteği gönderildi
    socket.on('friendRequestSent', (data) => {
        if (data.target === currentUser.username) {
            loadFriendRequests(); // Yeni istek geldi, listeyi güncelle
            showNotification(`${data.sender} size arkadaşlık isteği gönderdi!`, 'info');
        }
    });
    
    // Arkadaşlık isteği kabul edildi
    socket.on('friendRequestAccepted', (data) => {
        if (data.requester === currentUser.username) {
            loadFriends(); // Arkadaş listesini güncelle
            showNotification(`${data.target} arkadaşlık isteğinizi kabul etti!`, 'success');
        }
        loadFriendRequests(); // İstek listesini güncelle
    });
    
    // Arkadaşlık isteği reddedildi
    socket.on('friendRequestRejected', (data) => {
        if (data.requester === currentUser.username) {
            showNotification(`${data.target} arkadaşlık isteğinizi reddetti.`, 'info');
        }
        loadFriendRequests(); // İstek listesini güncelle
    });
    
    // Arkadaşlık isteği iptal edildi
    socket.on('friendRequestCanceled', (data) => {
        if (data.target === currentUser.username) {
            loadFriendRequests(); // İstek listesini güncelle
        }
    });
    
    // Arkadaşlık sonlandırıldı
    socket.on('friendshipRemoved', (data) => {
        if (data.friend1 === currentUser.username || data.friend2 === currentUser.username) {
            loadFriends(); // Arkadaş listesini güncelle
            const removedFriend = data.friend1 === currentUser.username ? data.friend2 : data.friend1;
            showNotification(`${removedFriend} ile arkadaşlık sonlandırıldı.`, 'info');
            
            // Eğer o arkadaşla sohbet ediyorsa, sohbeti kapat
            if (currentChatId === removedFriend && currentChatType === 'friend') {
                closeCurrentChat();
            }
        }
    });
    
    // Real-time online status updates
    socket.on('userOnline', (userData) => {
        updateFriendOnlineStatus(userData.username, true);
    });
    
    socket.on('userOffline', (userData) => {
        updateFriendOnlineStatus(userData.username, false);
    });
    
    socket.on('userTyping', (data) => {
        if (currentChatId && data.username !== currentUser.username) {
            showTypingIndicator(data.username, data.isTyping);
        }
    });
    
    socket.on('incomingCall', (callData) => {
        showIncomingCallModal(callData);
    });
    
    socket.on('callAccepted', (callData) => {
        document.getElementById('voiceCallStatus').textContent = 'Bağlandı';
    });
    
    socket.on('callRejected', (callData) => {
        document.getElementById('voiceCallModal').style.display = 'none';
        showNotification('Arama reddedildi', 'info');
    });
    
    socket.on('callEnded', (callData) => {
        endCall();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Okunmamış mesajları takip etmek için
let unreadMessages = {};

function updateUnreadMessageIndicator(messageData) {
    const sender = messageData.sender;
    
    // Eğer şu anda o kişiyle sohbet etmiyorsa, okunmamış sayacını artır
    if (currentChatId !== sender || currentChatType !== 'friend') {
        if (!unreadMessages[sender]) {
            unreadMessages[sender] = 0;
        }
        unreadMessages[sender]++;
        
        // Arkadaş listesindeki elementa okunmamış işareti ekle
        const friendElement = document.querySelector(`.friend-item[data-username="${sender}"]`);
        if (friendElement) {
            let unreadBadge = friendElement.querySelector('.unread-badge');
            if (!unreadBadge) {
                unreadBadge = document.createElement('span');
                unreadBadge.className = 'unread-badge';
                friendElement.appendChild(unreadBadge);
            }
            unreadBadge.textContent = unreadMessages[sender];
            unreadBadge.style.display = 'inline-block';
        }
    }
}

function clearUnreadMessages(username) {
    if (unreadMessages[username]) {
        delete unreadMessages[username];
        
        // Okunmamış işaretini kaldır
        const friendElement = document.querySelector(`.friend-item[data-username="${username}"]`);
        if (friendElement) {
            const unreadBadge = friendElement.querySelector('.unread-badge');
            if (unreadBadge) {
                unreadBadge.remove();
            }
        }
    }
}

// createFriendElement fonksiyonunu güncelle
function createFriendElement(friend) {
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.setAttribute('data-username', friend.username);
    
    // Okunmamış mesaj kontrolü
    const unreadCount = unreadMessages[friend.username] || 0;
    const unreadBadge = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';
    
    div.innerHTML = `
        <img src="${friend.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}" alt="${friend.username}" class="friend-avatar">
        <div class="friend-info">
            <div class="friend-name">${friend.username}</div>
            <div class="friend-status ${friend.isOnline ? 'online' : 'offline'}">
                ${friend.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </div>
        </div>
        <div class="friend-actions">
            <button onclick="openChat('${friend.username}', 'friend')" class="chat-btn" title="Sohbet Et">
                <i class="fas fa-comment"></i>
            </button>
            <button onclick="showFriendContextMenu(event, '${friend.username}')" class="more-btn" title="Daha Fazla">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
        ${unreadBadge}
    `;
    
    return div;
}

// openChat fonksiyonunu güncelle
function openChat(chatId, chatType) {
    // Önceki sohbeti kapat
    if (currentChatId && currentChatType === 'friend') {
        leaveCurrentRoom();
    }
    
    currentChatId = chatId;
    currentChatType = chatType;
    
    // Okunmamış mesajları temizle
    if (chatType === 'friend') {
        clearUnreadMessages(chatId);
    }
    
    // Chat arayüzünü güncelle
    updateChatInterface(chatId, chatType);
    
    // Mesajları yükle
    loadMessages();
    
    // Room'a katıl
    joinChatRoom();
    
    // Chat container'ı göster
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'block';
}

function updateFriendOnlineStatus(username, isOnline) {
    // Update friend status in the UI
    const friendElement = document.querySelector(`.friend-item[data-username="${username}"]`);
    if (friendElement) {
        const statusElement = friendElement.querySelector('.friend-status');
        if (statusElement) {
            statusElement.textContent = isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
            statusElement.className = `friend-status ${isOnline ? 'online' : 'offline'}`;
        }
    }
    
    // Update chat header if currently chatting with this user
    if (currentChatId === username && currentChatType === 'friend') {
        const chatStatus = document.getElementById('chatStatus');
        if (chatStatus) {
            chatStatus.textContent = isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
            chatStatus.className = `chat-status ${isOnline ? 'online' : 'offline'}`;
        }
    }
}

function showTypingIndicator(username, isTyping) {
    const indicator = document.getElementById('typingIndicator');
    const text = document.querySelector('.typing-text');
    
    if (isTyping) {
        text.textContent = `${username} yazıyor`;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

function showIncomingCallModal(callData) {
    document.getElementById('incomingCallName').textContent = callData.caller;
    // Set caller's avatar if available
    document.getElementById('incomingCallModal').style.display = 'block';
    
    // Store call data for accept/reject
    currentCall = callData;
}

// User data and authentication
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        if (!token || !username) {
            window.location.href = 'index.html';
            return;
        }
        
        const response = await fetch(`${apiUrl}/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = {
                username: userData.username,
                email: userData.email,
                profilePhoto: userData.profilePhoto,
                token: token
            };
            
            updateUserProfile();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        window.location.href = 'index.html';
    }
}

function updateUserProfile() {
    if (!currentUser) return;
    
    document.getElementById('currentUsername').textContent = currentUser.username;
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.src = currentUser.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }
}

// Tab management
function showTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Find and activate the clicked tab
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        if (btn.textContent.includes(tabName === 'friends' ? 'Arkadaşlar' : 'Gruplar')) {
            btn.classList.add('active');
        }
    });
    
    // Show the corresponding tab content
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
}

// Friends functions
async function loadFriends() {
    try {
        const response = await fetch(`${apiUrl}/friends/list`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = '';
            
            if (data.friends && data.friends.length > 0) {
                data.friends.forEach(friend => {
                    const friendElement = createFriendElement(friend);
                    friendsList.appendChild(friendElement);
                });
            } else {
                friendsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Henüz arkadaşınız yok</p>';
            }
        }
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

function createFriendElement(friend) {
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.dataset.username = friend.username;
    div.onclick = (e) => {
        if (!e.target.closest('.friend-context-menu')) {
            openChat(friend.username, 'friend', friend);
        }
    };
    
    div.innerHTML = `
        <img src="${friend.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}" alt="${friend.username}" class="friend-avatar">
        <div class="friend-info">
            <div class="friend-name">${friend.username}</div>
            <div class="friend-status ${friend.isOnline ? 'online' : 'offline'}">
                ${friend.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </div>
        </div>
        <div class="friend-context-menu">
            <button onclick="showFriendContextMenu(event, '${friend.username}')" class="context-menu-btn">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
    `;
    
    return div;
}

function showFriendContextMenu(event, username) {
    event.stopPropagation();
    
    // Remove existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="removeFriendConfirm('${username}')">
            <i class="fas fa-user-minus"></i> Arkadaşlıktan Çıkar
        </div>
    `;
    
    // Position the menu
    const rect = event.target.getBoundingClientRect();
    contextMenu.style.position = 'fixed';
    contextMenu.style.top = rect.bottom + 'px';
    contextMenu.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    contextMenu.style.zIndex = '1000';
    
    document.body.appendChild(contextMenu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeContextMenu() {
            if (contextMenu.parentElement) {
                contextMenu.remove();
            }
            document.removeEventListener('click', closeContextMenu);
        });
    }, 100);
}

// Block user fonksiyonlarını kaldıralım (artık kullanılmayacak)
// blockUser ve confirmBlockUser fonksiyonlarını sil

function removeFriendConfirm(username) {
    // Close context menu
    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    
    // Show confirmation dialog
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Arkadaşlığı Sonlandır</h3>
            </div>
            <div class="modal-body">
                <p><strong>${username}</strong> ile arkadaşlığı sonlandırmak istediğinize emin misiniz?</p>
                <p class="warning-text">Bu işlem geri alınamaz ve sohbet geçmişiniz silinir.</p>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal').remove()" class="cancel-btn">İptal</button>
                <button onclick="removeFriend('${username}'); this.closest('.modal').remove()" class="danger-btn">Arkadaşlığı Sonlandır</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function blockUser(username) {
    // Close context menu
    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    
    showNotification('Engelleme özelliği yakında eklenecek!', 'info');
}

async function removeFriend(username) {
    try {
        const response = await fetch(`${apiUrl}/friends/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ friendUsername: username })
        });
        
        if (response.ok) {
            showNotification(`${username} ile arkadaşlık sonlandırıldı!`, 'success');
            loadFriends();
            
            // If currently chatting with this friend, close chat
            if (currentChatId === username && currentChatType === 'friend') {
                closeCurrentChat();
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Arkadaş silinemedi!', 'error');
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification('Arkadaş silinirken hata oluştu!', 'error');
    }
}



// Friend requests
async function loadFriendRequests() {
    try {
        const response = await fetch(`${apiUrl}/friends/requests`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const requestsList = document.getElementById('friendRequests');
            const requestCount = document.getElementById('requestCount');
            
            requestsList.innerHTML = '';
            
            // Gelen istekleri göster (kabul/reddet edilebilir)
            if (data.receivedRequests && data.receivedRequests.length > 0) {
                requestCount.textContent = data.receivedRequests.length;
                
                data.receivedRequests.forEach(request => {
                    const requestElement = createReceivedRequestElement(request);
                    requestsList.appendChild(requestElement);
                });
            }
            
            // Gönderilen istekleri göster (iptal edilebilir)
            if (data.sentRequests && data.sentRequests.length > 0) {
                data.sentRequests.forEach(request => {
                    const requestElement = createSentRequestElement(request);
                    requestsList.appendChild(requestElement);
                });
            }
            
            // Hiç istek yoksa
            if ((!data.receivedRequests || data.receivedRequests.length === 0) && 
                (!data.sentRequests || data.sentRequests.length === 0)) {
                requestCount.textContent = '0';
                requestsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Arkadaşlık isteği yok</p>';
            } else if (!data.receivedRequests || data.receivedRequests.length === 0) {
                requestCount.textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

// Gelen istekler için element oluştur (kabul/reddet) - Profil fotoğrafı düzeltmesi ile
function createReceivedRequestElement(request) {
    const div = document.createElement('div');
    div.className = 'request-item received-request';
    
    div.innerHTML = `
        <img src="${request.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}" alt="${request.requester}" class="friend-avatar">
        <div class="friend-info">
            <div class="friend-name">${request.requester}</div>
            <div class="friend-status" style="color: #4CAF50;">Gelen İstek</div>
        </div>
        <div class="request-actions">
            <button onclick="acceptFriendRequest('${request.requester}')" class="accept-btn" title="Kabul Et">
                <i class="fas fa-check"></i>
            </button>
            <button onclick="rejectFriendRequest('${request.requester}')" class="reject-btn" title="Reddet">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    return div;
}

// Gönderilen istekler için element oluştur (iptal et) - Profil fotoğrafı düzeltmesi ile
function createSentRequestElement(request) {
    const div = document.createElement('div');
    div.className = 'request-item sent-request';
    
    div.innerHTML = `
        <img src="${request.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}" alt="${request.target}" class="friend-avatar">
        <div class="friend-info">
            <div class="friend-name">${request.target}</div>
            <div class="friend-status" style="color: #ff9800;">Gönderilen İstek</div>
        </div>
        <div class="request-actions">
            <button onclick="cancelFriendRequest('${request.target}')" class="cancel-btn" title="İptal Et">
                <i class="fas fa-ban"></i> İptal
            </button>
        </div>
    `;
    
    return div;
}

// İstek iptal etme fonksiyonu - zaten var, sadece console.log ekleyelim
async function cancelFriendRequest(targetUsername) {
    console.log('cancelFriendRequest called with:', targetUsername); // Debug log
    
    try {
        const response = await fetch(`${apiUrl}/friends/cancel-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ targetUsername: targetUsername })
        });
        
        console.log('Response status:', response.status); // Debug log
        
        if (response.ok) {
            loadFriendRequests();
            showNotification('Arkadaşlık isteği iptal edildi!', 'info');
        } else {
            const data = await response.json();
            console.log('Error response:', data); // Debug log
            showNotification(data.message || 'İstek iptal edilemedi!', 'error');
        }
    } catch (error) {
        console.error('Error canceling friend request:', error);
        showNotification('Bir hata oluştu!', 'error');
    }
}

// Arkadaşlıktan çıkarma onay fonksiyonu
function removeFriendConfirm(username) {
    // Close context menu
    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    
    // Show confirmation dialog
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Arkadaşlığı Sonlandır</h3>
            </div>
            <div class="modal-body">
                <p><strong>${username}</strong> ile arkadaşlığı sonlandırmak istediğinize emin misiniz?</p>
                <p class="warning-text">Bu işlem geri alınamaz ve sohbet geçmişiniz silinir.</p>
            </div>
            <div class="modal-footer">
                <button onclick="closeConfirmationModal()" class="cancel-btn">İptal</button>
                <button onclick="confirmRemoveFriend('${username}')" class="danger-btn">Arkadaşlığı Sonlandır</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Arkadaş silme onaylama
function confirmRemoveFriend(username) {
    closeConfirmationModal();
    removeFriend(username);
}

// Onay modalını kapatma
function closeConfirmationModal() {
    const modal = document.querySelector('.confirmation-modal');
    if (modal) {
        modal.remove();
    }
}

// Arkadaş silme fonksiyonu
async function removeFriend(username) {
    try {
        const response = await fetch(`${apiUrl}/friends/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ friendUsername: username })
        });
        
        if (response.ok) {
            showNotification(`${username} ile arkadaşlık sonlandırıldı!`, 'success');
            loadFriends();
            
            // If currently chatting with this friend, close chat
            if (currentChatId === username && currentChatType === 'friend') {
                closeCurrentChat();
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Arkadaş silinemedi!', 'error');
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification('Arkadaş silinirken hata oluştu!', 'error');
    }
}

// Kullanıcı engelleme fonksiyonu
function blockUser(username) {
    // Close context menu
    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    
    // Show confirmation dialog
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Kullanıcıyı Engelle</h3>
            </div>
            <div class="modal-body">
                <p><strong>${username}</strong> kullanıcısını engellemek istediğinize emin misiniz?</p>
                <p class="warning-text">Bu kullanıcı size mesaj gönderemez ve arkadaşlık isteği gönderemez.</p>
            </div>
            <div class="modal-footer">
                <button onclick="closeConfirmationModal()" class="cancel-btn">İptal</button>
                <button onclick="confirmBlockUser('${username}')" class="danger-btn">Engelle</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Kullanıcı engelleme onaylama
async function confirmBlockUser(username) {
    closeConfirmationModal();
    
    try {
        const response = await fetch(`${apiUrl}/users/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ targetUsername: username })
        });
        
        if (response.ok) {
            showNotification(`${username} kullanıcısı engellendi!`, 'success');
            loadFriends();
            
            // If currently chatting with this user, close chat
            if (currentChatId === username && currentChatType === 'friend') {
                closeCurrentChat();
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Kullanıcı engellenemedi!', 'error');
        }
    } catch (error) {
        console.error('Error blocking user:', error);
        showNotification('Kullanıcı engellenirken hata oluştu!', 'error');
    }
}



async function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) {
        showNotification('Lütfen bir kullanıcı adı girin!', 'error');
        return;
    }
    
    if (username === currentUser.username) {
        showNotification('Kendinize arkadaşlık isteği gönderemezsiniz!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${apiUrl}/friends/send-request`, {
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
            loadFriendRequests(); // Anlık güncelleme
            
            // Socket ile bildir
            if (socket) {
                socket.emit('friendRequestSent', {
                    sender: currentUser.username,
                    target: username,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showNotification('Bir hata oluştu!', 'error');
    }
}

async function acceptFriendRequest(username) {
    try {
        const response = await fetch(`${apiUrl}/friends/accept-request`, {
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
            
            // Socket ile bildir
            if (socket) {
                socket.emit('friendRequestAccepted', {
                    requester: username,
                    target: currentUser.username
                });
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'İstek kabul edilemedi!', 'error');
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showNotification('Bir hata oluştu!', 'error');
    }
}

async function rejectFriendRequest(username) {
    try {
        const response = await fetch(`${apiUrl}/friends/reject-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ requesterUsername: username })
        });
        
        if (response.ok) {
            loadFriendRequests();
            showNotification('Arkadaşlık isteği reddedildi!', 'info');
            
            // Socket ile bildir
            if (socket) {
                socket.emit('friendRequestRejected', {
                    requester: username,
                    target: currentUser.username
                });
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'İstek reddedilemedi!', 'error');
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showNotification('Bir hata oluştu!', 'error');
    }
}

async function cancelFriendRequest(targetUsername) {
    try {
        const response = await fetch(`${apiUrl}/friends/cancel-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ targetUsername: targetUsername })
        });
        
        if (response.ok) {
            loadFriendRequests();
            showNotification('Arkadaşlık isteği iptal edildi!', 'info');
            
            // Socket ile bildir
            if (socket) {
                socket.emit('friendRequestCanceled', {
                    requester: currentUser.username,
                    target: targetUsername
                });
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'İstek iptal edilemedi!', 'error');
        }
    } catch (error) {
        console.error('Error canceling friend request:', error);
        showNotification('Bir hata oluştu!', 'error');
    }
}

async function removeFriend(username) {
    try {
        const response = await fetch(`${apiUrl}/friends/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ friendUsername: username })
        });
        
        if (response.ok) {
            showNotification(`${username} ile arkadaşlık sonlandırıldı!`, 'success');
            loadFriends();
            
            // If currently chatting with this friend, close chat
            if (currentChatId === username && currentChatType === 'friend') {
                closeCurrentChat();
            }
            
            // Socket ile bildir
            if (socket) {
                socket.emit('friendshipRemoved', {
                    friend1: currentUser.username,
                    friend2: username
                });
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Arkadaş silinemedi!', 'error');
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification('Arkadaş silinirken hata oluştu!', 'error');
    }
}

// Groups functions
async function loadGroups() {
    try {
        const response = await fetch(`${apiUrl}/groups`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const groups = await response.json();
            const groupsList = document.getElementById('groupsList');
            groupsList.innerHTML = '';
            
            if (groups && groups.length > 0) {
                groups.forEach(group => {
                    const groupElement = createGroupElement(group);
                    groupsList.appendChild(groupElement);
                });
            } else {
                groupsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Henüz grubunuz yok</p>';
            }
        }
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

function createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'group-item';
    div.dataset.groupId = group.id;
    div.onclick = (e) => {
        if (!e.target.closest('.group-actions')) {
            openChat(group.id, 'group', group);
        }
    };
    
    div.innerHTML = `
        <div class="group-avatar">
            <i class="fas fa-users"></i>
        </div>
        <div class="group-info">
            <div class="group-name">${group.name}</div>
            <div class="group-members">${group.members ? group.members.length : 0} üye</div>
        </div>
        <div class="group-actions">
            <button onclick="showGroupSettings('${group.id}')" class="group-settings-btn" title="Grup Ayarları">
                <i class="fas fa-cog"></i>
            </button>
            ${group.createdBy === currentUser.username ? `
                <button onclick="deleteGroup('${group.id}')" class="group-delete-btn" title="Grubu Sil">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `;
    
    return div;
}

async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    if (!name) {
        showNotification('Lütfen bir grup adı girin!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${apiUrl}/groups`, {
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
        } else {
            const data = await response.json();
            showNotification(data.message || 'Grup oluşturulamadı!', 'error');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showNotification('Bir hata oluştu!', 'error');
    }
}

// Settings functions
function showUserSettings() {
    const modal = document.getElementById('userSettingsModal');
    if (modal) {
        // Populate current user data
        document.getElementById('settingsUsername').value = currentUser.username;
        document.getElementById('settingsEmail').value = currentUser.email || '';
        document.getElementById('settingsAvatar').src = currentUser.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
        modal.style.display = 'block';
    }
}

function closeUserSettings() {
    const modal = document.getElementById('userSettingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function uploadProfilePhoto() {
    document.getElementById('profilePhotoInput').click();
}

async function handleProfilePhotoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Lütfen bir resim dosyası seçin!', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Dosya boyutu 5MB\'dan küçük olmalı!', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('profilePhoto', file);
    
    try {
        const response = await fetch(`${apiUrl}/users/${currentUser.username}/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser.profilePhoto = data.profilePhoto;
            updateUserProfile();
            document.getElementById('settingsAvatar').src = data.profilePhoto;
            showNotification('Profil fotoğrafı güncellendi!', 'success');
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Fotoğraf yüklenemedi!', 'error');
        }
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        showNotification('Fotoğraf yüklenirken hata oluştu!', 'error');
    }
}

async function updateProfile() {
    const email = document.getElementById('settingsEmail').value;
    
    try {
        const response = await fetch(`${apiUrl}/users/${currentUser.username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            currentUser.email = email;
            showNotification('Profil güncellendi!', 'success');
            closeUserSettings();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Profil güncellenemedi!', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Profil güncellenirken hata oluştu!', 'error');
    }
}

// Logout function
function logout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    }
}

// Search functionality
async function searchFriends() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length === 0) {
        loadFriends();
        return;
    }
    
    try {
        const response = await fetch(`${apiUrl}/users/search?q=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const searchResults = await response.json();
            displaySearchResults(searchResults);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Arama sırasında hata oluştu!', 'error');
    }
}

function displaySearchResults(results) {
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = '';
    
    if (results.length === 0) {
        friendsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Sonuç bulunamadı</p>';
        return;
    }
    
    results.forEach(user => {
        const userElement = createSearchResultElement(user);
        friendsList.appendChild(userElement);
    });
}

function createSearchResultElement(user) {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    
    div.innerHTML = `
        <img src="${user.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='}" alt="${user.username}" class="friend-avatar">
        <div class="friend-info">
            <div class="friend-name">${user.username}</div>
            <div class="friend-status ${user.isOnline ? 'online' : 'offline'}">
                ${user.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </div>
        </div>
        <div class="search-actions">
            <button onclick="sendFriendRequestTo('${user.username}')" class="add-friend-btn">
                <i class="fas fa-user-plus"></i> Arkadaş Ekle
            </button>
        </div>
    `;
    
    return div;
}

async function sendFriendRequestTo(username) {
    try {
        const response = await fetch(`${apiUrl}/friends/send-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ targetUsername: username })
        });
        
        if (response.ok) {
            showNotification('Arkadaşlık isteği gönderildi!', 'success');
            // Refresh search results
            searchFriends();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Arkadaşlık isteği gönderilemedi!', 'error');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showNotification('Arkadaşlık isteği gönderilirken hata oluştu!', 'error');
    }
}

// Chat functions
function openChat(chatId, chatType, chatData) {
    currentChatId = chatId;
    currentChatType = chatType;
    currentChatData = chatData;
    
    // Hide welcome screen and show chat container
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    
    // Remove active class from all chat items
    document.querySelectorAll('.friend-item, .group-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current chat item
    const chatItem = document.querySelector(`[data-username="${chatId}"], [data-group-id="${chatId}"]`);
    if (chatItem) {
        chatItem.classList.add('active');
    }
    
    // Join chat room via socket
    if (socket) {
        socket.emit('joinChat', {
            chatId: chatId,
            chatType: chatType,
            currentUser: currentUser.username
        });
    }
    
    // Update chat header
    document.getElementById('chatName').textContent = chatData.username || chatData.name;
    
    if (chatType === 'friend') {
        document.getElementById('chatAvatar').src = chatData.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
        document.getElementById('chatStatus').textContent = chatData.isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
        document.getElementById('chatStatus').className = `chat-status ${chatData.isOnline ? 'online' : 'offline'}`;
    } else {
        document.getElementById('chatAvatar').innerHTML = '<i class="fas fa-users"></i>';
        document.getElementById('chatStatus').textContent = `${chatData.members ? chatData.members.length : 0} üye`;
        document.getElementById('chatStatus').className = 'chat-status';
    }
    
    // Load messages
    loadMessages();
}

function closeCurrentChat() {
    currentChatId = null;
    currentChatType = null;
    currentChatData = null;
    
    // Show welcome screen and hide chat container
    document.getElementById('welcomeScreen').style.display = 'flex';
    document.getElementById('chatContainer').style.display = 'none';
    
    // Remove active class from all chat items
    document.querySelectorAll('.friend-item, .group-item').forEach(item => {
        item.classList.remove('active');
    });
}

async function loadMessages() {
    if (!currentChatId) return;
    
    try {
        const response = await fetch(`${apiUrl}/messages/chat/${currentChatId}?chatType=${currentChatType}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            const messagesArea = document.getElementById('messagesArea');
            messagesArea.innerHTML = '';
            
            messages.forEach(message => {
                const messageElement = createMessageElement(message);
                messagesArea.appendChild(messageElement);
            });
            
            scrollToBottom();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return iconMap[type] || 'fa-info-circle';
}

// Online status system
function initializeOnlineStatus() {
    // Update last activity on user interaction
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            lastActivityTime = Date.now();
        }, { passive: true });
    });
    
    // Send heartbeat every 30 seconds
    onlineStatusInterval = setInterval(sendHeartbeat, 30000);
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            sendHeartbeat();
        }
    });
    
    // Send offline status when page unloads
    window.addEventListener('beforeunload', () => {
        navigator.sendBeacon(`${apiUrl}/users/status`, JSON.stringify({
            status: 'offline',
            token: currentUser.token
        }));
    });
}

async function sendHeartbeat() {
    if (!currentUser) return;
    
    const isActive = Date.now() - lastActivityTime < 60000; // Active if user interacted in last minute
    
    try {
        await fetch(`${apiUrl}/users/heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                isActive: isActive,
                lastActivity: lastActivityTime
            })
        });
        
        // Update friends' online status
        updateFriendsOnlineStatus();
    } catch (error) {
        console.error('Heartbeat failed:', error);
    }
}

async function updateFriendsOnlineStatus() {
    try {
        const response = await fetch(`${apiUrl}/friends/online-status`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const onlineStatuses = await response.json();
            
            // Update friend status in the UI
            document.querySelectorAll('.friend-item').forEach(friendElement => {
                const friendName = friendElement.querySelector('.friend-name')?.textContent;
                const statusElement = friendElement.querySelector('.friend-status');
                
                if (friendName && statusElement && onlineStatuses[friendName]) {
                    const status = onlineStatuses[friendName];
                    statusElement.textContent = status.isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
                    statusElement.className = `friend-status ${status.isOnline ? 'online' : 'offline'}`;
                }
            });
        }
    } catch (error) {
        console.error('Error updating online status:', error);
    }
}

// Real-time Message Updates
function initializeRealTimeMessages() {
    // This is handled by Socket.IO now
    console.log('Real-time messaging initialized via Socket.IO');
}

// Utility functions
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = `message ${message.sender === currentUser.username ? 'own' : ''}`;
    div.dataset.messageId = message.id;
    
    const time = new Date(message.timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let senderPhoto = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Qjc0ODEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPGVsbGlwc2UgY3g9IjIwIiBjeT0iMzIiIHJ4PSIxMiIgcnk9IjgiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    
    if (message.sender === currentUser.username) {
        senderPhoto = currentUser.profilePhoto || senderPhoto;
    } else if (currentChatType === 'friend' && currentChatData) {
        senderPhoto = currentChatData.profilePhoto || senderPhoto;
    }
    
    div.innerHTML = `
        <img src="${senderPhoto}" alt="${message.sender}" class="message-avatar">
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

function addMessageToChat(message) {
    const messagesArea = document.getElementById('messagesArea');
    const messageElement = createMessageElement(message);
    messagesArea.appendChild(messageElement);
}

// Message sending
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content || !currentChatId) return;
    
    try {
        let response;
        
        if (currentChatType === 'friend') {
            response = await fetch(`${apiUrl}/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({
                    receiverUsername: currentChatId,
                    content: content
                })
            });
        } else {
            response = await fetch(`${apiUrl}/groups/${currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({
                    content: content
                })
            });
        }
        
        if (response.ok) {
            messageInput.value = '';
            const data = await response.json();
            
            // Sadece kendi gönderdiğin mesajı ekle
            const messageData = data.data || data.messageData;
            addMessageToChat(messageData);
            scrollToBottom();
            
            // Socket emit et ama kendi mesajını tekrar alma
            if (socket) {
                socket.emit('newMessage', {
                    ...messageData,
                    chatType: currentChatType,
                    sender: currentUser.username,
                    receiver: currentChatType === 'friend' ? currentChatId : null,
                    groupId: currentChatType === 'group' ? currentChatId : null
                });
            }
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Mesaj gönderilemedi!', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Mesaj gönderilirken hata oluştu!', 'error');
    }
}

// Voice call functions (placeholders)
function startVoiceCall() {
    showNotification('Sesli arama özelliği yakında!', 'info');
}

function endCall() {
    const modal = document.getElementById('voiceCallModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function muteCall() {
    showNotification('Mikrofon kapatma özelliği yakında!', 'info');
}

function acceptIncomingCall() {
    const modal = document.getElementById('incomingCallModal');
    if (modal) {
        modal.style.display = 'none';
    }
    showNotification('Arama kabul edildi!', 'success');
}

function rejectIncomingCall() {
    const modal = document.getElementById('incomingCallModal');
    if (modal) {
        modal.style.display = 'none';
    }
    showNotification('Arama reddedildi!', 'info');
}

// File functions (placeholders)
function attachFile() {
    showNotification('Dosya gönderme özelliği yakında!', 'info');
}

function handleFileSelect(event) {
    showNotification('Dosya gönderme özelliği yakında!', 'info');
}

// Group settings functions (placeholders)
function showGroupSettings(groupId) {
    showNotification('Grup ayarları özelliği yakında!', 'info');
}

function closeGroupSettings() {
    const modal = document.getElementById('groupSettingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function deleteGroup(groupId) {
    if (confirm('Bu grubu silmek istediğinize emin misiniz?')) {
        showNotification('Grup silme özelliği yakında!', 'info');
    }
}

// Additional event handlers
function handleMessageKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function handleTyping() {
    // Simple typing indicator logic
    if (socket && currentChatId) {
        socket.emit('typing', {
            chatType: currentChatType,
            sender: currentUser.username,
            receiver: currentChatType === 'friend' ? currentChatId : null,
            groupId: currentChatType === 'group' ? currentChatId : null,
            isTyping: true
        });
    }
}

function stopTyping() {
    if (socket && currentChatId) {
        socket.emit('typing', {
            chatType: currentChatType,
            sender: currentUser.username,
            receiver: currentChatType === 'friend' ? currentChatId : null,
            groupId: currentChatType === 'group' ? currentChatId : null,
            isTyping: false
        });
    }
}

function showChatSettings() {
    if (currentChatType === 'group') {
        showGroupSettings(currentChatId);
    } else {
        showNotification('Arkadaş sohbet ayarları yakında!', 'info');
    }
}

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (onlineStatusInterval) {
        clearInterval(onlineStatusInterval);
    }
});

// Global fonksiyon tanımlamalarına ekleyelim (dosyanın sonunda)
window.showTab = showTab;
window.addFriend = addFriend;
window.createGroup = createGroup;
window.showUserSettings = showUserSettings;
window.closeUserSettings = closeUserSettings;
window.uploadProfilePhoto = uploadProfilePhoto;
window.handleProfilePhotoChange = handleProfilePhotoChange;
window.updateProfile = updateProfile;
window.logout = logout;
window.sendMessage = sendMessage;
window.handleMessageKeyPress = handleMessageKeyPress;
window.handleTyping = handleTyping;
window.stopTyping = stopTyping;
window.showChatSettings = showChatSettings;
window.startVoiceCall = startVoiceCall;
window.endCall = endCall;
window.muteCall = muteCall;
window.acceptIncomingCall = acceptIncomingCall;
window.rejectIncomingCall = rejectIncomingCall;
window.attachFile = attachFile;
window.handleFileSelect = handleFileSelect;
window.showGroupSettings = showGroupSettings;
window.closeGroupSettings = closeGroupSettings;
window.deleteGroup = deleteGroup;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.removeFriend = removeFriend;
window.showFriendContextMenu = showFriendContextMenu;
window.sendFriendRequestTo = sendFriendRequestTo;
window.cancelFriendRequest = cancelFriendRequest;
window.removeFriendConfirm = removeFriendConfirm;
window.blockUser = blockUser;
window.confirmRemoveFriend = confirmRemoveFriend;
window.confirmBlockUser = confirmBlockUser;
window.closeConfirmationModal = closeConfirmationModal;