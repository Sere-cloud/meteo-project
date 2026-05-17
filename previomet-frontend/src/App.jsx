// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage           from './pages/Auth/AuthPage';
import AdminDashboard     from './pages/Admin/AdminDashboard';
import FarmerDashboard    from './pages/Farmer/FarmerDashboard';
import LogisticsDashboard from './pages/Logistics/LogisticsDashboard';

// ─── Protection de route par rôle ─────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/login" replace />;
  return children;
}

// ─── Arbre de routes ──────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Racine → login */}
      <Route path="/"         element={<Navigate to="/login" replace />} />
      <Route path="/login"    element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Dashboard Admin ✅ */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }/>

      {/* Dashboard Agriculteur ✅ */}
      <Route path="/farmer/*" element={
        <ProtectedRoute allowedRoles={['agriculteur']}>
          <FarmerDashboard />
        </ProtectedRoute>
      }/>

      {/* Dashboard Logisticien ✅ */}
      <Route path="/logistics/*" element={
        <ProtectedRoute allowedRoles={['logisticien']}>
          <LogisticsDashboard />
        </ProtectedRoute>
      }/>
    </Routes>
  );
}

// ─── App racine ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
