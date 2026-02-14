require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const authRoutes = require('./controllers/authController');
app.use('/api/auth', authRoutes);

const io = new Server(server, {
    cors: {
        origin: "*", // Simplify for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

// Basic Health Check
app.get('/', (req, res) => {
    res.send('Chess Server is Running');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Socket.IO logic placeholder
const socketManager = require('./sockets/index');

// Initialize Socket Manager
socketManager(io);
