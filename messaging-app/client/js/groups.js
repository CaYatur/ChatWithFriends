const apiUrl = '/api/groups';

// Function to create a new group
async function createGroup(groupName, members) {
    const response = await fetch(`${apiUrl}/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupName, members }),
    });
    return response.json();
}

// Function to get all groups for a user
async function getUserGroups(userId) {
    const response = await fetch(`${apiUrl}/user/${userId}`);
    return response.json();
}

// Function to send a message to a group
async function sendMessageToGroup(groupId, message) {
    const response = await fetch(`${apiUrl}/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, message }),
    });
    return response.json();
}

// Function to add a member to a group
async function addMemberToGroup(groupId, userId) {
    const response = await fetch(`${apiUrl}/add-member`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, userId }),
    });
    return response.json();
}

// Function to remove a member from a group
async function removeMemberFromGroup(groupId, userId) {
    const response = await fetch(`${apiUrl}/remove-member`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, userId }),
    });
    return response.json();
}

// Function to share a file in a group
async function shareFileInGroup(groupId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${apiUrl}/share-file/${groupId}`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

// Function to share a photo in a group
async function sharePhotoInGroup(groupId, photo) {
    const formData = new FormData();
    formData.append('photo', photo);
    const response = await fetch(`${apiUrl}/share-photo/${groupId}`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

// Function to get group details
async function getGroupDetails(groupId) {
    const response = await fetch(`${apiUrl}/${groupId}`);
    return response.json();
}

// Exporting functions for use in other modules
export {
    createGroup,
    getUserGroups,
    sendMessageToGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    shareFileInGroup,
    sharePhotoInGroup,
    getGroupDetails,
};