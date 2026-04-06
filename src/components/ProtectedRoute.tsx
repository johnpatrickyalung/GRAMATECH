import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="home-spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/admin" replace />

  return <>{children}</>
}
