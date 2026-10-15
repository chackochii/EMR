import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  getSocketStatus,
  subscribeToSocketStatus,
} from '../lib/socket';

export const useSocketStatus = () => useSyncExternalStore(subscribeToSocketStatus, getSocketStatus);

/** Keeps one authenticated socket connection alive for as long as the caller is mounted. */
export function useSocketConnection() {
  useEffect(() => {
    connectSocket();
    return disconnectSocket;
  }, []);
}

const APPOINTMENT_EVENTS = ['appointment:created', 'appointment:updated', 'appointment:cancelled'];

/**
 * Subscribes to a doctor's scheduler room (re-subscribing after reconnects) and forwards
 * appointment events as `onEvent(eventName, appointment)`.
 */
export function useSchedulerSocket(doctorId, onEvent) {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!doctorId) return undefined;
    const socket = getSocket();
    const subscribe = () => socket.emit('scheduler:subscribe', { doctorId });
    const listeners = APPOINTMENT_EVENTS.map((eventName) => {
      const listener = (payload) => handlerRef.current?.(eventName, payload?.appointment);
      socket.on(eventName, listener);
      return [eventName, listener];
    });

    if (socket.connected) subscribe();
    socket.on('connect', subscribe);

    return () => {
      socket.off('connect', subscribe);
      listeners.forEach(([eventName, listener]) => socket.off(eventName, listener));
      if (socket.connected) socket.emit('scheduler:unsubscribe', { doctorId });
    };
  }, [doctorId]);
}
