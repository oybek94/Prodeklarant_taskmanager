import { useEffect } from 'react';
import toast from 'react-hot-toast';

export const useInvoiceSocket = (socket: any, loadInvoices: (isBackground?: boolean) => void) => {
  useEffect(() => {
    if (!socket) return;

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        const now = audioCtx.currentTime;

        // Pleasant "ding-ding" sound
        oscillator.frequency.setValueAtTime(523.25, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        oscillator.frequency.setValueAtTime(659.25, now + 0.15);
        gainNode.gain.setValueAtTime(0, now + 0.15);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.17);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
      } catch (e) {
        console.error('Audio play blocked:', e);
      }
    };

    const refresh = () => loadInvoices(true);
    
    const onTaskUpdated = (data: any) => { 
      console.log('Socket event (task) received in Invoices:', data);
      const action = data.deletedBy ? "o'chirdi" : data.createdBy ? "yaratdi" : "o'zgartirdi";
      const user = data.updatedBy || data.createdBy || data.deletedBy || 'Foydalanuvchi';
      const target = data?.task?.title ? `"${data.task.title}" taskini` : "Taskni";
      
      playNotificationSound();
      toast(`${user} ${target} ${action}`, { icon: '✏️' });
      refresh(); 
    };
    const onTaskStageUpdated = (data: any) => { 
      console.log('Socket event (taskStage) received in Invoices:', data);
      const stageName = data?.stage?.name || "Jarayon";
      const newStatus = data?.stage?.status || "yangilangan";
      const userName = data.updatedBy || "Foydalanuvchi";
      
      playNotificationSound();
      toast(`${userName} "${stageName}" bosqichini ${newStatus} holatiga o'tkazdi`, { icon: '🔄' });
      refresh(); 
    };
    const onInvoiceSaved = (data: any) => { 
      console.log('Socket event (invoice) received in Invoices:', data);
      playNotificationSound();
      toast(`Invoice saqlandi`, { icon: '💾' });
      refresh(); 
    };
    const onInvoiceDeleted = (data: any) => { 
      console.log('Socket event (invoice deleted) received in Invoices:', data);
      playNotificationSound();
      toast(`Invoice o'chirildi`, { icon: '🗑️' });
      refresh(); 
    };
    
    const onTaskErrorUpdated = (data: any) => {
      console.log('Socket event (taskErrorUpdated) received in Invoices:', data);
      playNotificationSound();
      refresh();
    };

    socket.on('task:created', onTaskUpdated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskUpdated);
    socket.on('task:stageUpdated', onTaskStageUpdated);
    socket.on('task:errorUpdated', onTaskErrorUpdated);
    socket.on('invoice:saved', onInvoiceSaved);
    socket.on('invoice:deleted', onInvoiceDeleted);

    return () => {
      socket.off('task:created', onTaskUpdated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskUpdated);
      socket.off('task:stageUpdated', onTaskStageUpdated);
      socket.off('task:errorUpdated', onTaskErrorUpdated);
      socket.off('invoice:saved', onInvoiceSaved);
      socket.off('invoice:deleted', onInvoiceDeleted);
    };
  }, [socket, loadInvoices]);
};
