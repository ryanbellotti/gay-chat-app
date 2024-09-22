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

        // Notify both users that they're connected
        socket.emit('connected', { partnerId: partnerSocket.id });
        partnerSocket.emit('connected', { partnerId: socket.id });
    } else {
        // If there's no waiting user, make this user wait
        waitingUser = socket;
    }

    socket.on('offer', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('offer', {
                offer: data.offer,
                from: socket.id
            });
        }
    });

    socket.on('answer', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('answer', {
                answer: data.answer,
                from: socket.id
            });
        }
    });

    socket.on('ice-candidate', (data) => {
        const partnerSocket = io.sockets.sockets.get(data.to);
        if (partnerSocket) {
            partnerSocket.emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (waitingUser === socket) {
            waitingUser = null; // If the waiting user disconnects, remove them from the queue
        } else {
            // If a connected user disconnects, notify their partner
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('partnerDisconnected');
            }
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
// ... (rest of the code from the previous step)

socket.on('chat-message', (data) => {
    const partnerSocket = io.sockets.sockets.get(data.to);
    if (partnerSocket) {
        partnerSocket.emit('chat-message', {
            message: data.message,
            from: socket.id
        });
    }
});

// ... socket.on('next', () => {
    disconnectFromPartner(socket); // Disconnect from the current partner

    if (waitingUser) {
        // If there's a waiting user, pair them with this user
        const partnerSocket = waitingUser;
        waitingUser = null;

        socket.emit('connected', { partnerId: partnerSocket.id });
        partnerSocket.emit('connected', { partnerId: socket.id });
    } else {
        // If there's no waiting user, make this user wait
        waitingUser = socket;
    }
});

function disconnectFromPartner(socket) {
    if (socket.partnerId) {
        const partnerSocket = io.sockets.sockets.get(socket.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('partnerDisconnected');
        }
    }
    socket.partnerId = null;
}

// ... (rest of the code)
