import { io } from 'socket.io-client';

let socket = null;

export function getChatSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}
