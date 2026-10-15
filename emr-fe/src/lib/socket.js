import { io } from 'socket.io-client';
import { getAccessToken, subscribeToTokens } from './tokenStorage';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export const SOCKET_STATUS = Object.freeze({
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
});

let socket = null;
let status = SOCKET_STATUS.DISCONNECTED;
const statusListeners = new Set();

const setStatus = (next) => {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener());
};

export const getSocketStatus = () => status;

export const subscribeToSocketStatus = (listener) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      // A function is re-evaluated on every (re)connect, so reconnects always carry the freshest token.
      auth: (callback) => callback({ token: getAccessToken() }),
    });
    socket.on('connect', () => setStatus(SOCKET_STATUS.CONNECTED));
    socket.on('disconnect', () => setStatus(SOCKET_STATUS.DISCONNECTED));
    socket.on('connect_error', () => setStatus(SOCKET_STATUS.DISCONNECTED));
    socket.io.on('reconnect_attempt', () => setStatus(SOCKET_STATUS.CONNECTING));
  }
  return socket;
}

export function connectSocket() {
  const instance = getSocket();
  if (!instance.connected && !instance.active) {
    setStatus(SOCKET_STATUS.CONNECTING);
    instance.connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    setStatus(SOCKET_STATUS.DISCONNECTED);
  }
}

// After a token refresh, reconnect so the server re-authenticates with the new access token.
subscribeToTokens((token) => {
  if (token && socket?.connected) {
    socket.disconnect();
    setStatus(SOCKET_STATUS.CONNECTING);
    socket.connect();
  }
});
