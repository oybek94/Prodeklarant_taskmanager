import { io } from '../server';
import { appCache } from './cache';

/**
 * Task/invoys o'zgarishi dashboard statistikasini eskirtiradi. Dashboard shu eventlarni
 * olib qayta so'raydi — kesh tozalanmasa 5 daqiqagacha eski natija qaytardi.
 */
const invalidateDashboardOn = (event: string) => {
  if (event.startsWith('task:') || event.startsWith('invoice:')) {
    appCache.invalidate('dashboard:');
  }
};

/**
 * Socket.io event emitter service.
 * Route fayllaridan real-time eventlarni yuborish uchun.
 */
export const socketEmitter = {
  /** Barcha ulangan foydalanuvchilarga event yuborish */
  broadcast: (event: string, data: unknown) => {
    invalidateDashboardOn(event);
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

  /** Bitta foydalanuvchidan boshqa barchasiga yuborish (endi hammaga yuboradi, tablarni sinxronlash uchun) */
  broadcastExcept: (excludeUserId: number, event: string, data: unknown) => {
    invalidateDashboardOn(event);
    io.emit(event, data);
  },
};
