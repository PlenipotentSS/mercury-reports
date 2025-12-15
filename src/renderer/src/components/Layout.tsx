import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: (currentPage: 'home' | 'reports' | 'settings') => React.JSX.Element
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<'home' | 'reports' | 'settings'>('home')

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <h1 className="app-title">Mercury Reports</h1>
        </div>

        <nav className="nav">
          <button
            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button
            className={`nav-button ${currentPage === 'reports' ? 'active' : ''}`}
            onClick={() => setCurrentPage('reports')}
          >
            Reports
          </button>
          <button
            className={`nav-button ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentPage('settings')}
          >
            Settings
          </button>
        </nav>

        <div className="header-right">
          <span className="user-name">{user?.name}</span>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">{children(currentPage)}</main>
    </div>
  )
}
