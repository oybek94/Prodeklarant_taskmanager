import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Training from './pages/Training';
import TrainingDetail from './pages/TrainingDetail';
import TrainingManagement from './pages/TrainingManagement';
import TrainingManageDetail from './pages/TrainingManageDetail';
import Exam from './pages/Exam';

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/training" element={<Training />} />
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
        <Route path="/exam/:id" element={<Exam />} />
        <Route
          path="/workers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route path="/workers/:id" element={<Profile />} />
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
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
