import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sideOpen, setSideOpen] = useState(false)

  const close = () => setSideOpen(false)

  const handleNav = (to: string) => {
    close()
    navigate(to)
  }

  return (
    <div className="admin-shell">

      {/* Mobile topbar */}
      <div className="admin-mobile-bar">
        <button className="admin-mobile-bar__toggle" onClick={() => setSideOpen((v) => !v)} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="admin-mobile-bar__title">Admin</span>
      </div>

      {/* Overlay */}
      {sideOpen && <div className="admin-sidebar-overlay" onClick={close} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar${sideOpen ? ' admin-sidebar--open' : ''}`}>
        <nav className="admin-nav">
          <p className="admin-nav__section-label">Menu</p>

          <NavLink to="/dashboard"
            className={({ isActive }) => `admin-nav__item${isActive ? ' admin-nav__item--active' : ''}`}
            onClick={close}
          >
            <span className="admin-nav__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </span>
            Dashboard
          </NavLink>

          <NavLink to="/category"
            className={({ isActive }) => `admin-nav__item${isActive ? ' admin-nav__item--active' : ''}`}
            onClick={close}
          >
            <span className="admin-nav__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            Categories
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">{user?.username[0].toUpperCase()}</div>
            <span className="admin-sidebar__username">{user?.username}</span>
          </div>
          <button className="admin-sidebar__logout" onClick={() => { close(); void logout() }} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  )
}
