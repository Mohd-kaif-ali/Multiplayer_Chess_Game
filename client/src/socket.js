import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'https://chess-backend.onrender.com';

const socket = io(URL, {
    autoConnect: false,
    reconnection: true,
});

export default socket;
