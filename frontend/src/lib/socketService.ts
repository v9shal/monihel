import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io('http://localhost:3000', {
    auth: { token },
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[Socket Service] Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('[Socket Service] Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket Service] Connection error:', error);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

export const isConnected = (): boolean => {
  return socket?.connected ?? false;
};