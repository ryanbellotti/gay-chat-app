const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');

let localStream;
let remoteStream;

// ... (we'll add more code here later for WebRTC and Socket.IO communication)