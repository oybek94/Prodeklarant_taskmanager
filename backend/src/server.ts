import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { prisma } from './prisma';
import authRouter from './routes/auth';
import clientsRouter from './routes/clients';
import tasksRouter from './routes/tasks';
import transactionsRouter from './routes/transactions';
import kpiRouter from './routes/kpi';
import usersRouter from './routes/users';
import dashboardRouter from './routes/dashboard';
import dashboardNotesRouter from './routes/dashboard-notes';
import workersRouter from './routes/workers';
import workerPaymentsRouter from './routes/worker-payments';
import branchesRouter from './routes/branches';
import statePaymentsRouter from './routes/state-payments';
import bxmRouter from './routes/bxm';
import trainingRouter from './routes/training';
import examsRouter from './routes/exams';
import lessonsRouter from './routes/lessons';
import analyticsRouter from './routes/analytics';
import uploadRouter from './routes/upload';
import documentsRouter from './routes/documents';
import financeRouter from './routes/finance';
import invoicesRouter from './routes/invoices';
import companySettingsRouter from './routes/company-settings';
import certifierFeeConfigRouter from './routes/certifier-fee-config';
import yearlyGoalConfigRouter from './routes/yearly-goal-config';
import regionCodesRouter from './routes/region-codes';
import packagingTypesRouter from './routes/packaging-types';
import tnvedProductsRouter from './routes/tnved-products';
import contractsRouter from './routes/contracts';
import taskStatusRouter from './routes/task-status';
import taskDocumentsRouter from './routes/task-documents';
import taskAiChecksRouter from './routes/task-ai-checks';
import sendTaskEmailRouter from './routes/send-task-email';
import aiRouter from './routes/ai';
import reportsRouter from './routes/reports';
import qrRouter from './routes/qr';
import stickerRouter from './routes/sticker';
import { requireAuth } from './middleware/auth';
import { auditLog } from './middleware/audit';
import OpenAIClient from './ai/openai.client';
import path from 'path';
import fs from 'fs';
import lmsRouter from './routes/lms';
import { initializeExchangeRateScheduler } from './services/exchange-rate-scheduler';
import { initializeProcessScheduler } from './services/process-scheduler';
import { initCronJobs } from './cron';
import processRouter from './routes/process';
import notificationsRouter from './routes/notifications';
import leadsRouter from './routes/leads';
import debtsRouter from './routes/debts';
import systemRouter from './routes/system';
import recommendedPricesRouter from './routes/recommended-prices';
import exchangeRateRouter from './routes/exchange-rate';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS sozlamalari
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://138.249.7.15'
];

app.use(cors({
  origin: (origin, callback) => {
    // Agar origin yo'q bo'lsa (masalan, Nginx orqali kelgan so'rovlar), ruxsat berish
    if (!origin) {
      return callback(null, true);
    }

    // Agar origin allowedOrigins ro'yxatida bo'lsa, ruxsat berish
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Development'da barcha localhost originlarga ruxsat berish
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // Agar origin allowedOrigins ro'yxatida bo'lmasa, lekin production'da bo'lsa, 
    // ham ruxsat berish (chunki Nginx orqali kelgan so'rovlar origin header bilan kelishi mumkin)
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    // Development'da faqat allowedOrigins ro'yxatidagi originlarga ruxsat berish
    // Lekin xatolikni throw qilmasdan, faqat console'ga log qilamiz
    console.warn(`⚠️  CORS: ${origin} ruxsat berilmagan, lekin ruxsat berildi (development)`);
    callback(null, true);
  },
  credentials: true
}));
// Increase body size limits for file uploads (50MB for multiple files)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving - himoyalangan
// /uploads endi faqat autentifikatsiya bilan ochiladi
app.use('/uploads', requireAuth(), express.static(path.join(__dirname, '../uploads')));
// /api/uploads eski static endi o'chirildi - /api/secure-uploads ishlatiladi

// Himoyalangan fayl yuklash endpoint - JWT token talab qiladi
const uploadsRootDir = path.resolve(path.join(__dirname, '../uploads'));

app.get('/api/secure-uploads/*path', requireAuth(), (req, res) => {
  const rawParam = req.params.path;
  const relativePath = decodeURIComponent(
    Array.isArray(rawParam) ? rawParam.join('/') : (rawParam as string) || ''
  );

  if (!relativePath) {
    return res.status(400).json({ error: 'Fayl yo\'li ko\'rsatilmagan' });
  }

  // Path traversal hujumidan himoya
  const absolutePath = path.resolve(path.join(uploadsRootDir, relativePath));

  if (!absolutePath.startsWith(uploadsRootDir)) {
    return res.status(403).json({ error: 'Ruxsat berilmagan yo\'l' });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Fayl topilmadi' });
  }

  res.sendFile(absolutePath);
});


// Rate limiting — brute force va DDoS dan himoya
// Login uchun: 15 daqiqada max 10 urinish
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10,
  message: { error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Umumiy API: 1 daqiqada max 200 so\'rov
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 200,
  message: { error: 'Juda ko\'p so\'rov. Bir daqiqadan keyin qayta urinib ko\'ring.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/uploads') || req.path.startsWith('/api/uploads'),
});

app.get('/', (_req, res) => {
  res.json({
    message: 'Prodeklarant API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      clients: '/api/clients',
      tasks: '/api/tasks',
      transactions: '/api/transactions',
      kpi: '/api/kpi',
      users: '/api/users',
      dashboard: '/api/dashboard',
      workers: '/api/workers',
      workerPayments: '/api/worker-payments',
      bxm: '/api/bxm',
      ai: '/api/ai',
      debts: '/api/debts',
    },
  });
});

app.get('/health', async (_req, res) => {
  try {
    // Quick health check without database query to avoid timeout
    // Immediately respond to avoid blocking
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'running'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// Separate endpoint for database health check
app.get('/health/db', async (_req, res) => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 5000))
    ]);
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// Rate limiting qo'llash
app.use('/api/auth/login', loginLimiter);         // Login uchun qat'iy limit
app.use('/api/auth/client/login', loginLimiter);  // Client login uchun ham
app.use('/api', apiLimiter);                      // Barcha API uchun umumiy limit

app.use('/api/auth', authRouter);
// AI endpoints (protected, requires authentication)
app.use('/api/ai', requireAuth(), aiRouter);
// Client endpoints (public for client login, but protected for other operations)
app.use('/api/clients', clientsRouter);
app.use('/api/tasks', requireAuth(), auditLog('ACCESS', 'TASK'), tasksRouter);
app.use('/api/tasks', requireAuth(), taskStatusRouter);
app.use('/api/tasks', requireAuth(), taskDocumentsRouter);
app.use('/api/tasks', requireAuth(), taskAiChecksRouter);
app.use('/api/send-task-email', requireAuth(), sendTaskEmailRouter);
app.use('/api/transactions', requireAuth(), auditLog('ACCESS', 'TRANSACTION'), transactionsRouter);
app.use('/api/kpi', requireAuth(), kpiRouter);
app.use('/api/users', requireAuth('ADMIN'), auditLog('ACCESS', 'USER'), usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/dashboard-notes', dashboardNotesRouter);
app.use('/api/workers', workersRouter);
app.use('/api/worker-payments', workerPaymentsRouter);
app.use('/api/branches', requireAuth(), branchesRouter);
app.use('/api/state-payments', requireAuth('ADMIN'), statePaymentsRouter);
app.use('/api/bxm', bxmRouter);
app.use('/api/training', trainingRouter);
app.use('/api/exams', examsRouter);
app.use('/api/lessons', requireAuth(), lessonsRouter);
app.use('/api/analytics', requireAuth('ADMIN'), analyticsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/invoices', requireAuth(), invoicesRouter);
app.use('/api/company-settings', companySettingsRouter);
app.use('/api/certifier-fee-config', certifierFeeConfigRouter);
app.use('/api/yearly-goal-config', yearlyGoalConfigRouter);
app.use('/api/region-codes', regionCodesRouter);
app.use('/api/packaging-types', requireAuth(), packagingTypesRouter);
app.use('/api/tnved-products', requireAuth(), tnvedProductsRouter);
app.use('/api/contracts', requireAuth(), contractsRouter);
// Public QR verification endpoint (no authentication required)
app.use('/q', qrRouter);
app.use('/api/q', qrRouter);
// Sticker PDF generation endpoint (requires authentication)
app.use('/api/sticker', stickerRouter);
app.use('/api/process', requireAuth(), processRouter);
app.use('/api/notifications', requireAuth(), notificationsRouter);
app.use('/api/leads', requireAuth(), leadsRouter);
app.use('/api/debts', requireAuth('ADMIN'), debtsRouter);
app.use('/api/system', requireAuth('ADMIN'), systemRouter);
app.use('/api/recommended-prices', recommendedPricesRouter);
app.use('/api/exchange-rate', exchangeRateRouter);

// LMS endpoints (v1) - stream token issuance and streaming proxy
app.use('/api/v1', lmsRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Validate environment variables on startup
function validateEnvironment() {
  const requiredVars: string[] = [];
  const warnings: string[] = [];

  // Check OpenAI API key (required for AI features)
  if (!OpenAIClient.isConfigured()) {
    warnings.push('⚠️  OPENAI_API_KEY is not set. AI features will not work.');
  } else {
    console.log('✅ OPENAI_API_KEY is configured');
  }

  // Check database URL
  if (!process.env.DATABASE_URL) {
    requiredVars.push('DATABASE_URL');
  }

  // Display warnings
  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(warning));
  }

  // Fail fast if critical vars are missing
  if (requiredVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${requiredVars.join(', ')}`);
    console.error('Please set them in your .env file');
    process.exit(1);
  }
}

// Validate environment before starting server
validateEnvironment();

// Initialize exchange rate scheduler
initializeExchangeRateScheduler();
initializeProcessScheduler();
initCronJobs();

// ===== Socket.io =====
import { verifyAccessToken } from './utils/jwt';

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) return callback(null, true);
      if (process.env.NODE_ENV === 'production') return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// JWT autentifikatsiya — faqat ruxsat berilgan foydalanuvchilar ulanishi mumkin
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication token required'));
  try {
    const payload = verifyAccessToken(token);
    socket.data.user = { id: payload.sub, role: payload.role, name: payload.name, branchId: payload.branchId };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  console.log(`🔌 Socket connected: ${user.name} (id: ${user.id})`);

  // Presence: foydalanuvchi ulanganda online ro'yxatiga qo'shish
  broadcastPresence();

  // Sahifa o'zgarganida
  socket.on('page:view', (data: { page: string }) => {
    socket.data.currentPage = data.page;
    broadcastPresence();
  });

  // Invoice tahrirlash boshlanishi
  socket.on('invoice:editing', (data: { invoiceId: number }) => {
    const { invoiceId } = data;
    socket.data.editingInvoiceId = invoiceId;

    // Tekshirish: boshqa kim shu invoysni tahrirlayapti?
    const editors: { id: number; name: string }[] = [];
    for (const [, s] of io.sockets.sockets) {
      if (s.id !== socket.id && s.data.editingInvoiceId === invoiceId && s.data.user) {
        editors.push({ id: s.data.user.id, name: s.data.user.name });
      }
    }
    // Agar boshqa kimdir tahrirlayotgan bo'lsa — foydalanuvchiga xabar
    if (editors.length > 0) {
      socket.emit('invoice:editingConflict', { invoiceId, editors });
    }
    // Boshqa foydalanuvchilarga xabar berish
    socket.broadcast.emit('invoice:editingBy', {
      invoiceId,
      editor: { id: user.id, name: user.name },
    });
  });

  // Invoice tahrirlashdan chiqish
  socket.on('invoice:editingDone', () => {
    const invoiceId = socket.data.editingInvoiceId;
    socket.data.editingInvoiceId = undefined;
    if (invoiceId) {
      socket.broadcast.emit('invoice:editingLeft', {
        invoiceId,
        editor: { id: user.id, name: user.name },
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${user.name} (id: ${user.id})`);
    // Invoice editing cleanup
    const invoiceId = socket.data.editingInvoiceId;
    if (invoiceId) {
      socket.broadcast.emit('invoice:editingLeft', {
        invoiceId,
        editor: { id: user.id, name: user.name },
      });
    }
    broadcastPresence();
  });
});

/** Online foydalanuvchilar ro'yxatini barcha ulanganlarga yuborish */
function broadcastPresence() {
  const onlineUsers: { id: number; name: string; role: string; page?: string }[] = [];
  const seen = new Set<number>();
  for (const [, socket] of io.sockets.sockets) {
    const u = socket.data.user;
    if (!u || seen.has(u.id)) continue;
    seen.add(u.id);
    onlineUsers.push({
      id: u.id,
      name: u.name,
      role: u.role,
      page: socket.data.currentPage || undefined,
    });
  }
  io.emit('presence:update', onlineUsers);
}

export { io };

// Server'ni ishga tushirish
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
  console.log(`✅ Socket.io ready`);
  console.log(`✅ Server ishga tushdi!`);

  // Database ulanishini tekshirish (async, server ishga tushgandan keyin)
  // Add timeout to avoid blocking server startup
  Promise.race([
    prisma.$connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
  ])
    .then(() => {
      console.log('✅ Database ulanishi muvaffaqiyatli!');
    })
    .catch((err: any) => {
      console.error('⚠️  Database ulanishi muammosi:', err.message);
      console.log('⚠️  Server ishlayapti, lekin database ulanishi sekin yoki mavjud emas. Remote database\'ga ulanish muammosi bo\'lishi mumkin.');
    });
});

// Xatoliklarni tutish
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Server'ni to'xtatmasdan davom ettiramiz
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});


