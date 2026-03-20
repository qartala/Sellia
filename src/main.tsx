import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Dashboard from './pages/Dashboard';
import Chats from './pages/Chats';
import Flows from './pages/Flows';
import FlowBuilder from './pages/FlowBuilder';
import Ads from './pages/Ads';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminPanel from './pages/AdminPanel';
import Calendar from './pages/Calendar';
import Collections from './pages/Collections';
import './index.css';

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="text-center">
      <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400 text-sm">Cargando Sellia...</p>
    </div>
  </div>
);

// Only for normal (non-superadmin) users
function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (['superadmin', 'subadmin'].includes(user.role)) return <Navigate to="/admin" replace />;
  return <Layout><Outlet /></Layout>;
}

// Only for superadmin
function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!['superadmin', 'subadmin'].includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={['superadmin', 'subadmin'].includes(user.role) ? '/admin' : '/'} replace />;
  return <Outlet />;
}

function ProtectedFullscreen() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (['superadmin', 'subadmin'].includes(user.role)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

// Helper para proteger rutas de módulos específicos
function ModuleRoute({ feature, children }: { feature: keyof ReturnType<typeof useAuth>['user']; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <>{children}</>;
  if (!user[feature as keyof typeof user]) return <Navigate to="/" replace />;
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Superadmin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          {/* Protected user routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ModuleRoute feature="has_dashboard"><Dashboard /></ModuleRoute>} />
            <Route path="/chats" element={<ModuleRoute feature="has_chats"><Chats /></ModuleRoute>} />
            <Route path="/flows" element={<ModuleRoute feature="has_flows"><Flows /></ModuleRoute>} />
            <Route path="/calendar" element={<ModuleRoute feature="has_chats"><Calendar /></ModuleRoute>} />
            <Route path="/collections" element={<ModuleRoute feature="has_chats"><Collections /></ModuleRoute>} />
            <Route path="/ads" element={<ModuleRoute feature="has_ads"><Ads /></ModuleRoute>} />
            <Route path="/integrations" element={<ModuleRoute feature="has_integrations"><Integrations /></ModuleRoute>} />
            <Route path="/settings/*" element={<ModuleRoute feature="has_settings"><Settings /></ModuleRoute>} />
          </Route>
          <Route element={<ProtectedFullscreen />}>
            <Route path="/flows/builder" element={<ModuleRoute feature="has_flows"><FlowBuilder /></ModuleRoute>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
