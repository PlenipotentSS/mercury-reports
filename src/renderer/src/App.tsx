import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './components/Auth'
import Layout from './components/Layout'
import Home from './pages/Home'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <Layout>
      {(currentPage: 'home' | 'reports' | 'settings') => {
        switch (currentPage) {
          case 'home':
            return <Home />
          case 'reports':
            return <Reports />
          case 'settings':
            return <Settings />
          default:
            return <Home />
        }
      }}
    </Layout>
  )
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
