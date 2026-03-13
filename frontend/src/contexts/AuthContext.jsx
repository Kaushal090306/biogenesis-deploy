import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('bg_user')
    return stored ? JSON.parse(stored) : null
  })

  const saveAuth = useCallback((token, userData) => {
    localStorage.setItem('bg_token', token)
    localStorage.setItem('bg_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('bg_token')
    localStorage.removeItem('bg_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updated) => {
    const merged = { ...user, ...updated }
    localStorage.setItem('bg_user', JSON.stringify(merged))
    setUser(merged)
  }, [user])

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ user, saveAuth, logout, updateUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
