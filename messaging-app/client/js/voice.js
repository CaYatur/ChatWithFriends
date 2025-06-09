const socket = io(); // Initialize socket.io

let localStream;
const mediaConstraints = {
    audio: true,
    video: false
};

// Start voice chat
function startVoiceChat() {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(stream => {
            localStream = stream;
            const audioElement = document.createElement('audio');
            audioElement.srcObject = localStream;
            audioElement.play();
            socket.emit('joinVoiceChat', { roomId: 'defaultRoom' });
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
        });
}

// Handle incoming voice streams
socket.on('voiceStream', (stream) => {
    const audioElement = document.createElement('audio');
    audioElement.srcObject = stream;
    audioElement.play();
});

// Stop voice chat
function stopVoiceChat() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    socket.emit('leaveVoiceChat', { roomId: 'defaultRoom' });
}

// Event listeners for buttons
document.getElementById('startVoiceChat').addEventListener('click', startVoiceChat);
document.getElementById('stopVoiceChat').addEventListener('click', stopVoiceChat);