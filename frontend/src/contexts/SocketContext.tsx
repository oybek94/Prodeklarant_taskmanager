import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : (import.meta.env.PROD ? '' : 'http://localhost:3001');

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Token yo'q — socket ulanmaydi
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Agar allaqachon ulangan bo'lsa, qayta ulanmaslik
    if (socketRef.current?.connected) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    s.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    s.on('connect_error', (err) => {
      console.warn('🔌 Socket connection error:', err.message);
      // Token muddati o'tgan bo'lsa, qayta ulanmaslik
      if (err.message.includes('expired') || err.message.includes('Invalid')) {
        s.disconnect();
      }
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Token o'zgarganda qayta ulanish uchun (login/logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        // Token o'zgargan — sahifani yangilash orqali socket qayta ulanadi
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocket(null);
        }
        if (e.newValue) {
          const s = io(SOCKET_URL, {
            auth: { token: e.newValue },
            transports: ['websocket', 'polling'],
            reconnection: true,
          });
          s.on('connect', () => console.log('🔌 Socket reconnected after token change'));
          socketRef.current = s;
          setSocket(s);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

/** Socket.io instance ni olish hook'i. null bo'lsa ulanmagan. */
export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
