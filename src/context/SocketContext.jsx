import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  connectionError: null
});

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('dsc_token') || undefined },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    const onConnect = () => {
      console.info(`[Socket] connected id=${socketInstance.id} transport=${socketInstance.io.engine?.transport?.name}`);
      setIsConnected(true);
      setConnectionError(null);
    };
    const onDisconnect = (reason) => {
      console.warn(`[Socket] disconnected reason=${reason}`);
      setIsConnected(false);
    };
    const onConnectError = (error) => {
      console.warn(`[Socket] connection error: ${error.message}`);
      setConnectionError(error.message);
      setIsConnected(false);
    };
    const onReconnectAttempt = (attempt) => console.info(`[Socket] reconnect attempt=${attempt}`);
    const onReconnect = (attempt) => console.info(`[Socket] reconnected after attempt=${attempt}`);
    const onReconnectFailed = () => console.error('[Socket] reconnection failed');

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.io.on('reconnect_attempt', onReconnectAttempt);
    socketInstance.io.on('reconnect', onReconnect);
    socketInstance.io.on('reconnect_failed', onReconnectFailed);

    setSocket(socketInstance);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.io.off('reconnect_attempt', onReconnectAttempt);
      socketInstance.io.off('reconnect', onReconnect);
      socketInstance.io.off('reconnect_failed', onReconnectFailed);
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
