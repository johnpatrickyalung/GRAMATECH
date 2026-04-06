import { useState } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CategoryList from './pages/CategoryList'
import CategoryDetail from './pages/CategoryDetail'
import CreateWord from './pages/CreateWord'
import EditWord from './pages/EditWord'
import AdminLayout from './pages/AdminLayout'
import './App.css'

function TopNav() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <header className="site-nav">
      <Link to="/" className="site-nav__brand" onClick={close}>
        GRAMA<span style={{ color: 'var(--text-heading)' }}>TECH</span>
      </Link>

      {/* Hamburger */}
      <button
        className={`site-nav__hamburger${open ? ' site-nav__hamburger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>

      {/* Links */}
      <nav className={`site-nav__links${open ? ' site-nav__links--open' : ''}`} aria-label="Main">
        <NavLink to="/" className="site-nav__link" end onClick={close}>Browse</NavLink>
        {user
          ? <NavLink to="/dashboard" className="site-nav__link" onClick={close}>Dashboard</NavLink>
          : <NavLink to="/admin" className="site-nav__link" onClick={close}>Admin</NavLink>}
        {user && (
          <button
            className="site-nav__link site-nav__logout"
            onClick={() => { close(); void logout() }}
            title="Sign out"
            aria-label="Sign out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        )}
      </nav>

      {/* Mobile overlay */}
      {open && <div className="site-nav__overlay" onClick={close} />}
    </header>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <TopNav />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Login />} />
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/category" element={<CategoryList />} />
              <Route path="/category/:id" element={<CategoryDetail />} />
              <Route path="/category/:id/create" element={<CreateWord />} />
              <Route path="/category/:id/:wordId" element={<EditWord />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
