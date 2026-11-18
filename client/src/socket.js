import { io } from 'socket.io-client';

let socket = null;

export function getChatSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || 'https://locomov-server.onrender.com';
    socket = io(url, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}
