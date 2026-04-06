import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return (
      <div className="admin-loading">
        <div className="home-spinner" />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <main className="admin-login-wrap">
        <form className="card admin-login" onSubmit={handleSubmit}>
          <div className="admin-login__logo">
            <div className="admin-login__logo-mark" />
            <span>GRAMATECH</span>
          </div>
          <h2 className="card-title">Sign in to Admin</h2>
          {error && <p className="login-error" role="alert">{error}</p>}
          <div className="field">
            <label htmlFor="login-user">Username</label>
            <input id="login-user" className="input" autoComplete="username"
              value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="login-pass">Password</label>
            <input id="login-pass" type="password" className="input" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
