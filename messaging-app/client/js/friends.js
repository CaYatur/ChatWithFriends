const friendsList = document.getElementById('friends-list');
const friendRequestButton = document.getElementById('send-friend-request');
const friendRequestInput = document.getElementById('friend-username-input');

// Function to fetch and display friends
function fetchFriends() {
    fetch('/api/friends')
        .then(response => response.json())
        .then(data => {
            friendsList.innerHTML = '';
            data.forEach(friend => {
                const listItem = document.createElement('li');
                listItem.textContent = friend.username;
                friendsList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error fetching friends:', error));
}

// Function to send a friend request
function sendFriendRequest() {
    const username = friendRequestInput.value;
    fetch('/api/friends/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
    })
        .then(response => {
            if (response.ok) {
                alert('Friend request sent!');
                friendRequestInput.value = '';
            } else {
                alert('Error sending friend request.');
            }
        })
        .catch(error => console.error('Error sending friend request:', error));
}

// Event listeners
friendRequestButton.addEventListener('click', sendFriendRequest);
document.addEventListener('DOMContentLoaded', fetchFriends);