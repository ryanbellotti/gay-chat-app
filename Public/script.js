const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const status = document.getElementById('status');

let localStream;
let remoteStream;
let peerConnection;
let partnerId;

startButton.addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        peerConnection = new RTCPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: partnerId
                });
            }
        };

        peerConnection.ontrack = event => {
            const remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };

        startButton.disabled = true;
        status.textContent = 'Connecting...';
    } catch (error) {
        console.error('Error accessing media devices:', error);
        status.textContent = 'Error accessing camera and microphone. Please check your settings.';
    }
});

socket.on('connected', async (data) => {
    partnerId = data.partnerId;
    status.textContent = 'Connected to a partner!';
    nextButton.disabled = false;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('offer', {
        offer: offer,
        to: partnerId
    });
});

socket.on('offer', async (data) => {
    partnerId = data.from;
    nextButton.disabled = false;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', {
        answer: answer,
        to: partnerId
    });
});

socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', async (data) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

socket.on('partnerDisconnected', () => {
    disconnectFromPartner();
    status.textContent = 'Partner disconnected. Finding a new partner...';
    nextButton.disabled = false; 
});

nextButton.addEventListener('click', () => {
    if (partnerId) {
        socket.emit('next');
        disconnectFromPartner();
    }
});

function disconnectFromPartner() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    remoteVideo.srcObject = null;
    partnerId = null;
    chatMessages.innerHTML = ''; 

    status.textContent = 'Disconnected. Finding a new partner...';
    nextButton.disabled = true; 
}

sendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message && partnerId) {
        socket.emit('chat-message', { message, to: partnerId });
        addMessage('You', message);
        chatInput.value = '';
    }
});

socket.on('chat-message', (data) => {
    addMessage(data.from, data.message);
});

function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${sender}: ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
}
// ... (rest of the code from the previous step)

const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
const profileNameInput = document.getElementById('profileName');
const profilePictureInput = document.getElementById('profilePicture');
const saveProfileButton = document.getElementById('saveProfileButton');

// Load profile from local storage on page load
loadProfile();

startButton.addEventListener('click', () => {
    // Show the profile modal before starting the chat
    profileModal.show();
});

saveProfileButton.addEventListener('click', () => {
    const name = profileNameInput.value.trim();
    if (!name) {
        alert('Please enter your name.');
        return;
    }

    const profile = { name };

    // Handle profile picture upload (if implemented)
    // ...

    // Save profile to local storage
    localStorage.setItem('profile', JSON.stringify(profile));

    profileModal.hide(); // Close the modal

    // Now you can proceed with starting the chat
    // ... (existing code to start the chat)
});

socket.on('connected', async (data) => {
    partnerId = data.partnerId;
    status.textContent = 'Connected to a partner!';
    nextButton.disabled = false;

    // Send your profile to the partner
    const profile = getProfile();
    if (profile) {
        socket.emit('profile', { profile, to: partnerId });
    }

    // ... (create and send offer)
});

socket.on('profile', (data) => {
    // Display the partner's profile (you'll need to add UI elements for this)
    console.log('Partner profile:', data.profile);
});

function loadProfile() {
    const profile = getProfile();
    if (profile) {
        profileNameInput.value = profile.name;
        // Load profile picture (if implemented)
        // ...
    }
}

function getProfile() {
    const profileData = localStorage.getItem('profile');
    return profileData ? JSON.parse(profileData) : null;
}