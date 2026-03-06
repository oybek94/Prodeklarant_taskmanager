import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Transactions from './pages/Transactions';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Workers from './pages/Workers';
import WorkerReport from './pages/WorkerReport';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Training from './pages/Training';
import TrainingDetail from './pages/TrainingDetail';
import TrainingManagement from './pages/TrainingManagement';
import TrainingManageDetail from './pages/TrainingManageDetail';
import TrainingStageDetail from './pages/TrainingStageDetail';
import TrainingStageEdit from './pages/TrainingStageEdit';
import Exam from './pages/Exam';
import ExamResult from './pages/ExamResult';
import ClientLogin from './pages/ClientLogin';
import ClientDashboard from './pages/ClientDashboard';
import Finance from './pages/Finance';
import Invoice from './pages/Invoice';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import QRVerification from './pages/QRVerification';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import CrmDashboard from './pages/CrmDashboard';

const AppRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'ADMIN' ? "/dashboard" : (user?.role === 'SELLER' ? "/leads" : "/tasks")} />
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
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route path="/tasks/new" element={<Tasks />} />
        <Route path="/tasks/archive" element={<Tasks />} />
        <Route path="/tasks/archive/filters" element={<Tasks />} />
        <Route path="/tasks/:id/edit" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER', 'WORKER', 'OPERATOR', 'ACCOUNTANT', 'OWNER']}>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route path="/transactions/new" element={<Transactions />} />
        <Route path="/transactions/:id/edit" element={<Transactions />} />
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
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
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
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
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
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated
                ? (user?.role === 'ADMIN' ? "/dashboard" : (user?.role === 'SELLER' ? "/leads" : "/tasks"))
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
};

import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
