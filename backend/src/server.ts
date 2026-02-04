import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import authRouter from './routes/auth';
import clientsRouter from './routes/clients';
import tasksRouter from './routes/tasks';
import transactionsRouter from './routes/transactions';
import kpiRouter from './routes/kpi';
import usersRouter from './routes/users';
import dashboardRouter from './routes/dashboard';
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
import contractsRouter from './routes/contracts';
import taskStatusRouter from './routes/task-status';
import taskDocumentsRouter from './routes/task-documents';
import taskAiChecksRouter from './routes/task-ai-checks';
import aiRouter from './routes/ai';
import reportsRouter from './routes/reports';
import qrRouter from './routes/qr';
import stickerRouter from './routes/sticker';
import { requireAuth } from './middleware/auth';
import { auditLog } from './middleware/audit';
import OpenAIClient from './ai/openai.client';
import path from 'path';
import { initializeExchangeRateScheduler } from './services/exchange-rate-scheduler';
// import { fixDatabaseRoles } from './utils/fixDatabaseRoles'; // Vaqtinchalik o'chirilgan

const app = express();
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
// Increase body size limits for file uploads (200MB for multiple files, each file max 100MB)
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Static file serving - uploads papkasini serve qilish
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

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

app.use('/api/auth', authRouter);
// AI endpoints (protected, requires authentication)
app.use('/api/ai', requireAuth(), aiRouter);
// Client endpoints (public for client login, but protected for other operations)
app.use('/api/clients', clientsRouter);
app.use('/api/tasks', requireAuth(), auditLog('ACCESS', 'TASK'), tasksRouter);
app.use('/api/tasks', requireAuth(), taskStatusRouter);
app.use('/api/tasks', requireAuth(), taskDocumentsRouter);
app.use('/api/tasks', requireAuth(), taskAiChecksRouter);
app.use('/api/transactions', requireAuth(), auditLog('ACCESS', 'TRANSACTION'), transactionsRouter);
app.use('/api/kpi', requireAuth(), kpiRouter);
app.use('/api/users', requireAuth('ADMIN'), auditLog('ACCESS', 'USER'), usersRouter);
app.use('/api/dashboard', dashboardRouter);
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
app.use('/api/contracts', requireAuth(), contractsRouter);
// Public QR verification endpoint (no authentication required)
app.use('/q', qrRouter);
app.use('/api/q', qrRouter);
// Sticker PDF generation endpoint (requires authentication)
app.use('/api/sticker', stickerRouter);

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

// Server'ni darhol ishga tushirish - database ulanishini kutmasdan
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
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

