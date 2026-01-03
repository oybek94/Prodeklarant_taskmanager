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
import contractsRouter from './routes/contracts';
import taskStatusRouter from './routes/task-status';
import taskDocumentsRouter from './routes/task-documents';
import taskAiChecksRouter from './routes/task-ai-checks';
import aiRouter from './routes/ai';
import { requireAuth } from './middleware/auth';
import { auditLog } from './middleware/audit';
import OpenAIClient from './ai/openai.client';
import path from 'path';
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
// Increase body size limits for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
      bxm: '/api/bxm',
      ai: '/api/ai',
    },
  });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
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
app.use('/api/invoices', requireAuth(), invoicesRouter);
app.use('/api/company-settings', companySettingsRouter);
app.use('/api/contracts', requireAuth(), contractsRouter);

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

// Server'ni darhol ishga tushirish - database ulanishini kutmasdan
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
  console.log(`✅ Server ishga tushdi!`);
  
  // Database ulanishini tekshirish (async, server ishga tushgandan keyin)
  prisma.$connect()
    .then(() => {
      console.log('✅ Database ulanishi muvaffaqiyatli!');
    })
    .catch((err: any) => {
      console.error('⚠️  Database ulanishi muammosi:', err.message);
      console.log('⚠️  Server ishlayapti, lekin database ulanishi yo\'q. Iltimos, database sozlamalarini tekshiring.');
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

