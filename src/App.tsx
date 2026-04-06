import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import Admin from './pages/Admin'
import Home from './pages/Home'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="site-nav">
          <Link to="/" className="site-nav__brand">
            GRAMATECH
          </Link>
          <nav className="site-nav__links" aria-label="Main">
            <NavLink to="/" className="site-nav__link" end>
              Browse
            </NavLink>
            <NavLink to="/admin" className="site-nav__link">
              Admin
            </NavLink>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
