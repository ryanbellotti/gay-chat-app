const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let waitingUser = null;

io.on('connection', (socket) => {
    console.log('a user connected');

    if (waitingUser) {
        // If there's a waiting user, pair them with the new user
        const partnerSocket = waitingUser;
        waitingUser = null;

        // Set partner IDs for both users
        socket.partnerId = partnerSocket.id;
        partnerSocket.partnerId = socket.id;

        // Notify both users that they're connected
        socket.emit('connected', { partnerId: partnerSocket.id });
        partnerSocket.emit('connected', { partnerId: socket.id });
    } else {
        // If there's no waiting user, make this user wait
        waitingUser = socket;
    }

    // Handle 'offer' from user
    socket.on('offer', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('offer', {
                offer: data.offer,
                from: socket.id
            });
        }
    });

    // Handle 'answer' from user
    socket.on('answer', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('answer', {
                answer: data.answer,
                from: socket.id
            });
        }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    // Handle chat messages
    socket.on('chat-message', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('chat-message', {
                message: data.message,
                from: socket.id
            });
        }
    });

    // Handle 'next' event for moving to the next user
    socket.on('next', () => {
        disconnectFromPartner(socket); // Disconnect from the current partner

        if (waitingUser) {
            // If there's a waiting user, pair them with this user
            const partnerSocket = waitingUser;
            waitingUser = null;

            // Set partner IDs for both users
            socket.partnerId = partnerSocket.id;
            partnerSocket.partnerId = socket.id;

            socket.emit('connected', { partnerId: partnerSocket.id });
            partnerSocket.emit('connected', { partnerId: socket.id });
        } else {
            // If there's no waiting user, make this user wait
            waitingUser = socket;
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (waitingUser === socket) {
            // If the waiting user disconnects, remove them from the queue
            waitingUser = null;
        } else {
            // Notify partner if the connected user disconnects
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('partnerDisconnected');
            }
        }
    });
});

// Helper function to disconnect the current partner
function disconnectFromPartner(socket) {
    if (socket.partnerId) {
        const partnerSocket = io.sockets.sockets.get(socket.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('partnerDisconnected');
        }
    }
    socket.partnerId = null;
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});
