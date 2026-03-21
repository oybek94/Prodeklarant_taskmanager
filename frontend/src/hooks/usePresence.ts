import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useLocation } from 'react-router-dom';

export interface OnlineUser {
  id: number;
  name: string;
  role: string;
  page?: string;
}

/** Sahifa nomlarini o'zbekchaga tarjima qilish */
const PAGE_LABELS: Record<string, string> = {
  '/tasks': 'Ishlar',
  '/tasks/archive': 'Arxiv',
  '/dashboard': 'Dashboard',
  '/clients': 'Mijozlar',
  '/transactions': 'Tranzaksiyalar',
  '/finance': 'Moliya',
  '/invoices': 'Invoyslar',
  '/workers': 'Ishchilar',
  '/settings': 'Sozlamalar',
  '/reports': 'Hisobotlar',
  '/training': "Ta'lim",
  '/leads': 'Lidlar',
  '/crm': 'CRM',
  '/profile': 'Profil',
};

export function getPageLabel(path?: string): string {
  if (!path) return '';
  // Aniq mos kelishni tekshirish
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  // Invoice tahrirlash
  if (path.startsWith('/invoices/')) return 'Invoys tahrirlash';
  // Task ko'rish
  if (path.match(/^\/tasks\/\d+/)) return 'Task ko\'rish';
  // Client ko'rish
  if (path.match(/^\/clients\/\d+/)) return 'Mijoz ko\'rish';
  return path;
}

/**
 * Online foydalanuvchilarni kuzatish hook'i.
 * Avtomatik ravishda joriy sahifani serverga yuboradi.
 */
export function usePresence() {
  const socket = useSocket();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Joriy sahifani serverga yuborish
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('page:view', { page: location.pathname });
  }, [socket, location.pathname]);

  // Socket qayta ulanganda sahifani yuborish
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      socket.emit('page:view', { page: location.pathname });
    };
    socket.on('connect', onConnect);
    return () => { socket.off('connect', onConnect); };
  }, [socket, location.pathname]);

  // Online foydalanuvchilar ro'yxatini tinglash
  useEffect(() => {
    if (!socket) return;
    const onPresenceUpdate = (users: OnlineUser[]) => {
      setOnlineUsers(users);
    };
    socket.on('presence:update', onPresenceUpdate);
    return () => { socket.off('presence:update', onPresenceUpdate); };
  }, [socket]);

  return { onlineUsers };
}
