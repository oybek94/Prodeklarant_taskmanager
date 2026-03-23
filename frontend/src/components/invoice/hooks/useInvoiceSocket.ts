import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '../../../contexts/SocketContext';

/**
 * Socket.io orqali invoice tahrirlash konfliktini kuzatish.
 * Agar boshqa foydalanuvchi ham shu invoysni ochgan bo'lsa, xabar ko'rsatiladi.
 */
export function useInvoiceSocket(invoiceId: number | undefined) {
  const socket = useSocket();
  const [editingConflictEditors, setEditingConflictEditors] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!socket || !invoiceId) return;

    socket.emit('invoice:editing', { invoiceId });

    const onConflict = (data: { invoiceId: number; editors: { id: number; name: string }[] }) => {
      if (data.invoiceId === invoiceId) {
        setEditingConflictEditors(data.editors);
        const names = data.editors.map(e => e.name).join(', ');
        toast(`⚠️ ${names} ham shu invoysni tahrirlayapti!`, { icon: '⚠️', duration: 6000 });
      }
    };
    const onEditingBy = (data: { invoiceId: number; editor: { id: number; name: string } }) => {
      if (data.invoiceId === invoiceId) {
        setEditingConflictEditors(prev => {
          if (prev.some(e => e.id === data.editor.id)) return prev;
          return [...prev, data.editor];
        });
        toast(`⚠️ ${data.editor.name} shu invoysni ochdi!`, { icon: '⚠️', duration: 4000 });
      }
    };
    const onEditingLeft = (data: { invoiceId: number; editor: { id: number; name: string } }) => {
      if (data.invoiceId === invoiceId) {
        setEditingConflictEditors(prev => prev.filter(e => e.id !== data.editor.id));
      }
    };

    socket.on('invoice:editingConflict', onConflict);
    socket.on('invoice:editingBy', onEditingBy);
    socket.on('invoice:editingLeft', onEditingLeft);

    return () => {
      socket.emit('invoice:editingDone');
      socket.off('invoice:editingConflict', onConflict);
      socket.off('invoice:editingBy', onEditingBy);
      socket.off('invoice:editingLeft', onEditingLeft);
    };
  }, [socket, invoiceId]);

  return { editingConflictEditors };
}
