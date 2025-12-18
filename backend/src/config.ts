import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  tokenTtl: '24h', // 24 soat - logout qilinmaguncha ishlaydi
  refreshTtl: '30d', // 30 kun - uzoq muddatli saqlash
};

