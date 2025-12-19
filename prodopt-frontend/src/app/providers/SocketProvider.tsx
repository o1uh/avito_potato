import { createContext, useContext, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSessionStore } from '@/entities/session/model/store';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const token = useSessionStore((state) => state.accessToken);
  // Инициализируем сокет, только если есть токен (или можно инициализировать всегда, но коннектить позже)
  // В данной реализации создаем сокет, но подключение контролируем через extraHeaders или auth
  
  // Примечание: Для Stage 1 можно оставить пустым или базовое подключение
  const socket = io('http://localhost:3000', {
    autoConnect: false,
    transports: ['websocket'],
  });

  useEffect(() => {
    if (token) {
      socket.auth = { token }; // Передача токена при рукопожатии
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [token, socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};