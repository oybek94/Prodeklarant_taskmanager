import 'dotenv/config';

// JWT secret'lar majburiy — agar o'rnatilmagan bo'lsa, server ishga tushmaydi
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  console.error('❌ XATO: JWT_SECRET .env faylida o\'rnatilmagan yoki juda qisqa (min 32 belgi)!');
  console.error('   Yangi secret yaratish uchun: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
  console.error('❌ XATO: JWT_REFRESH_SECRET .env faylida o\'rnatilmagan yoki juda qisqa (min 32 belgi)!');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret,
  jwtRefreshSecret,
  tokenTtl: '24h',   // 24 soat - logout qilinmaguncha ishlaydi
  refreshTtl: '30d', // 30 kun - uzoq muddatli saqlash
  // Stream token TTL in seconds (default 120s)
  streamTokenTtlSec: Number(process.env.STREAM_TOKEN_TTL_SEC || 120),
};

