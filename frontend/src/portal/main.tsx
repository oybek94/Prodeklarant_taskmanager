import { lazy, StrictMode, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './portal.css';
import { PortalAuthProvider, usePortalAuth } from './context/PortalAuthContext';
import PortalLayout from './components/PortalLayout';
import { Spinner } from './components/ui';

const Login = lazy(() => import('./pages/Login'));
const Shipments = lazy(() => import('./pages/Shipments'));
const ShipmentDetail = lazy(() => import('./pages/ShipmentDetail'));
const Documents = lazy(() => import('./pages/Documents'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = usePortalAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner />;
  if (status === 'anonymous') {
    const from = location.pathname === '/login' ? undefined : location.pathname + location.search;
    return <Navigate to="/login" replace state={from ? { from } : undefined} />;
  }
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PortalAuthProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth><PortalLayout /></RequireAuth>}>
              <Route path="/" element={<Shipments />} />
              <Route path="/shipments/:id" element={<ShipmentDetail />} />
              <Route path="/documents" element={<Documents />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PortalAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
