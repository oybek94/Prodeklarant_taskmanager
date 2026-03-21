import { io } from '../server';

/**
 * Socket.io event emitter service.
 * Route fayllaridan real-time eventlarni yuborish uchun.
 */
export const socketEmitter = {
  /** Barcha ulangan foydalanuvchilarga event yuborish */
  broadcast: (event: string, data: unknown) => {
    io.emit(event, data);
  },

  /** Bitta foydalanuvchiga event yuborish (user:ID xonasiga) */
  toUser: (userId: number, event: string, data: unknown) => {
    io.to(`user:${userId}`).emit(event, data);
  },

  /** Ma'lum bir xonaga event yuborish (masalan, task:123) */
  toRoom: (room: string, event: string, data: unknown) => {
    io.to(room).emit(event, data);
  },

  /** Bitta foydalanuvchidan boshqa barchasiga yuborish */
  broadcastExcept: (excludeUserId: number, event: string, data: unknown) => {
    const sockets = io.sockets.sockets;
    for (const [, socket] of sockets) {
      if (socket.data.user?.id !== excludeUserId) {
        socket.emit(event, data);
      }
    }
  },
};
