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
import { requireAuth } from './middleware/auth';
import { auditLog } from './middleware/audit';
// import { fixDatabaseRoles } from './utils/fixDatabaseRoles'; // Vaqtinchalik o'chirilgan

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS sozlamalari
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

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
app.use('/api/clients', requireAuth(), auditLog('ACCESS', 'CLIENT'), clientsRouter);
app.use('/api/tasks', requireAuth(), auditLog('ACCESS', 'TASK'), tasksRouter);
app.use('/api/transactions', requireAuth(), auditLog('ACCESS', 'TRANSACTION'), transactionsRouter);
app.use('/api/kpi', requireAuth(), kpiRouter);
app.use('/api/users', requireAuth('ADMIN'), auditLog('ACCESS', 'USER'), usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/workers', workersRouter);
app.use('/api/branches', requireAuth(), branchesRouter);
app.use('/api/state-payments', requireAuth('ADMIN'), statePaymentsRouter);
app.use('/api/bxm', bxmRouter);

// Server'ni darhol ishga tushirish - database ulanishini kutmasdan
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
  console.log(`✅ Server ishga tushdi!`);
  
  // Database ulanishini tekshirish (async, server ishga tushgandan keyin)
  prisma.$connect()
    .then(() => {
      console.log('✅ Database ulanishi muvaffaqiyatli!');
    })
    .catch((err) => {
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

