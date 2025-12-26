import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  name: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  login: (email: string) => Promise<{ success: boolean; error?: string }>
  signup: (name: string, email: string) => Promise<{ success: boolean; error?: string }>
  updateUser: (name: string, email: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string) => {
    try {
      const result = await window.api.userLogin(email)
      if (result.success && result.user) {
        setUser(result.user)
        localStorage.setItem('user', JSON.stringify(result.user))
        return { success: true }
      }
      return { success: false, error: result.error || 'Login failed' }
    } catch (error) {
      return { success: false, error: 'An error occurred during login' }
    }
  }

  const signup = async (name: string, email: string) => {
    try {
      const result = await window.api.userSignup(name, email)
      if (result.success && result.user) {
        setUser(result.user)
        localStorage.setItem('user', JSON.stringify(result.user))
        return { success: true }
      }
      return { success: false, error: result.error || 'Signup failed' }
    } catch (error) {
      return { success: false, error: 'An error occurred during signup' }
    }
  }

  const updateUser = async (name: string, email: string) => {
    if (!user) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      const result = await window.api.userUpdate(user.id, name, email)
      if (result.success && result.user) {
        setUser(result.user)
        localStorage.setItem('user', JSON.stringify(result.user))
        return { success: true }
      }
      return { success: false, error: result.error || 'Update failed' }
    } catch (error) {
      return { success: false, error: 'An error occurred during update' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, updateUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
