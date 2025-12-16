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
import ExamResult from './pages/ExamResult';

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
            ? <Navigate to={user?.role === 'ADMIN' ? "/dashboard" : "/tasks"} /> 
            : <Login /> 
        } 
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ClientDetail />
            </ProtectedRoute>
          }
        />
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
        <Route path="/exam/:id/result" element={<ExamResult />} />
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
      <Route 
        path="/" 
        element={
          <Navigate 
            to={
              isAuthenticated 
                ? (user?.role === 'ADMIN' ? "/dashboard" : "/tasks")
                : "/login"
            } 
            replace 
          />
        } 
      />
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
