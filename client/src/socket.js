import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://10.169.195.23:5000';

const socket = io(URL, {
    autoConnect: false,
    reconnection: true,
});

export default socket;
