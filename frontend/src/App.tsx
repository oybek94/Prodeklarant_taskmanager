import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, lazy, Suspense, useCallback } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LeadWonAnimation from './components/LeadWonAnimation';
import XpAnimation from './components/XpAnimation';
import MedalAnimation from './components/notifications/MedalAnimation';

// Lazy-loaded page components for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskErrorBoundary = lazy(() => import('./components/tasks/TaskErrorBoundary'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const Workers = lazy(() => import('./pages/Workers'));
const WorkerReport = lazy(() => import('./pages/WorkerReport'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Training = lazy(() => import('./pages/Training'));
const TrainingDetail = lazy(() => import('./pages/TrainingDetail'));
const TrainingManagement = lazy(() => import('./pages/TrainingManagement'));
const TrainingManageDetail = lazy(() => import('./pages/TrainingManageDetail'));
const TrainingStageDetail = lazy(() => import('./pages/TrainingStageDetail'));
const TrainingStageEdit = lazy(() => import('./pages/TrainingStageEdit'));
const Exam = lazy(() => import('./pages/Exam'));
const ExamResult = lazy(() => import('./pages/ExamResult'));
const ClientLogin = lazy(() => import('./pages/ClientLogin'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const Finance = lazy(() => import('./pages/Finance'));
const Invoice = lazy(() => import('./pages/Invoice'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Reports = lazy(() => import('./pages/Reports'));
const QRVerification = lazy(() => import('./pages/QRVerification'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const CrmDashboard = lazy(() => import('./pages/CrmDashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Debts = lazy(() => import('./pages/Debts'));
const FAQ = lazy(() => import('./pages/FAQ'));
const SellerKpi = lazy(() => import('./pages/SellerKpi'));
const DataAssistant = lazy(() => import('./pages/DataAssistant').then(m => ({ default: m.DataAssistant })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-500 dark:text-gray-400">Yuklanmoqda...</span>
    </div>
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const socket = useSocket();

  const navigate = useNavigate();

  const handleAdminErrorClick = useCallback((t: any, taskId: number) => {
    toast.dismiss(t.id);
    navigate(`/tasks/${taskId}`);
  }, [navigate]);

  useEffect(() => {
    if (!socket || !user) return;
    
    if (user.role === 'ADMIN') {
      const handleAdminError = (data: any) => {
        toast((t) => (
          <div className="flex flex-col gap-1 cursor-pointer" onClick={() => handleAdminErrorClick(t, data.error.taskId)}>
            <span className="font-bold text-red-600">⚠️ {data.event}</span>
            <span className="text-sm">Yangi xato hisoboti qo'shildi. Baholash uchun ustiga bosing !</span>
          </div>
        ), { duration: 6000 });
      };
      socket.on('admin_new_error_report', handleAdminError);
      return () => { socket.off('admin_new_error_report', handleAdminError); };
    }
  }, [socket, user, handleAdminErrorClick]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleBounty = (data: any) => {
      if (data.createdById === user.id) {
         toast.success(`Zo'r ish! Topgan xatoyingiz tekshirildi. ${Number(data.bountyRewardUzs).toLocaleString('uz-UZ')} UZS va ${data.bountyXp} XP mukofot!`, { duration: 8000, icon: '🕵️‍♂️' });
      }
    };
    
    const handleQuality = (data: any) => {
      if (data.userId === user.id) {
         toast((t) => (
           <div className="flex flex-col gap-1">
             <span className="font-bold text-amber-600 dark:text-amber-400">🏆 Oylik Sifat Indeksi!</span>
             <span className="text-sm text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">{data.message}</span>
           </div>
         ), { duration: 10000 });
      }
    };

    socket.on('user:bounty_awarded', handleBounty);
    socket.on('user:quality_award', handleQuality);

    return () => {
      socket.off('user:bounty_awarded', handleBounty);
      socket.off('user:quality_award', handleQuality);
    };
  }, [socket, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" />
            : <Login />
        }
      />
      <Route
        path="/client/login"
        element={<ClientLogin />}
      />
      <Route
        path="/client/dashboard"
        element={<ClientDashboard />}
      />
      <Route
        path="/q/:token"
        element={<QRVerification />}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/leads"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SELLER']}>
              <Leads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SELLER']}>
              <LeadDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SELLER']}>
              <CrmDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller-kpi"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SELLER']}>
              <SellerKpi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <TaskErrorBoundary>
                <Tasks />
              </TaskErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/tasks/new" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><TaskErrorBoundary><Tasks /></TaskErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/archive" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><TaskErrorBoundary><Tasks /></TaskErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/archive/filters" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><TaskErrorBoundary><Tasks /></TaskErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/:id/edit" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><TaskErrorBoundary><Tasks /></TaskErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><TaskDetail /></ProtectedRoute>} />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route path="/transactions/new" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><Transactions /></ProtectedRoute>} />
        <Route path="/transactions/:id/edit" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}><Transactions /></ProtectedRoute>} />
        <Route
          path="/debts"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Debts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Finance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <ClientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/task/:taskId"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Invoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/client/:clientId/contract/:contractId"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Invoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER', 'SELLER']}>
              <Training />
            </ProtectedRoute>
          }
        />
        <Route path="/training/:id" element={<TrainingDetail />} />
        <Route
          path="/training/manage"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TrainingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/:id/manage"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TrainingManageDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/:trainingId/stage/:stageId"
          element={<TrainingStageDetail />}
        />
        <Route
          path="/training/:trainingId/stage/:stageId/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TrainingStageEdit />
            </ProtectedRoute>
          }
        />
        <Route path="/exam/:id" element={<Exam />} />
        <Route path="/exam/:id/result" element={<ExamResult />} />
        <Route
          path="/faq"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <FAQ />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route path="/workers/:id" element={<Profile />} />
        <Route path="/workers/:id/report" element={<WorkerReport />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER', 'SELLER']}><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/data-assistant" element={<ProtectedRoute allowedRoles={['ADMIN', 'OWNER']}><DataAssistant /></ProtectedRoute>} />
      </Route>
      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated
                ? (user?.role === 'SELLER' ? "/crm" : "/dashboard")
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
    </Suspense>
  );
};

import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'number') {
        (document.activeElement as HTMLInputElement).blur();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SocketProvider>
            <AppRoutes />
            <LeadWonAnimation />
            <MedalAnimation />
            <XpAnimation />
            <Toaster position="top-right" />
          </SocketProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
