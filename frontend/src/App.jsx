import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={<PublicRoute><AuthPage mode="login" /></PublicRoute>}
        />
        <Route
          path="/register"
          element={<PublicRoute><AuthPage mode="register" /></PublicRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<AdminRoute><AdminPage /></AdminRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
