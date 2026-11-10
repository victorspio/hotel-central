import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('hotel_token')
    const storedUser = localStorage.getItem('hotel_user')

    if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      } catch {
        localStorage.removeItem('hotel_token')
        localStorage.removeItem('hotel_user')
      }
    } else {
      localStorage.removeItem('hotel_token')
      localStorage.removeItem('hotel_user')
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, senha) => {
    const response = await axios.post('/api/auth/login', { email, senha })
    const newToken = response.data.token
    const usuario = response.data.user || response.data.usuario

    if (!usuario) {
      throw new Error('Dados de usuário não retornados pelo servidor')
    }

    localStorage.setItem('hotel_token', newToken)
    localStorage.setItem('hotel_user', JSON.stringify(usuario))
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

    setToken(newToken)
    setUser(usuario)

    return usuario
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('hotel_token')
    localStorage.removeItem('hotel_user')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const updateUser = useCallback((updatedUser, newToken) => {
    if (updatedUser) {
      setUser(updatedUser)
      localStorage.setItem('hotel_user', JSON.stringify(updatedUser))
    }
    if (newToken) {
      setToken(newToken)
      localStorage.setItem('hotel_token', newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    }
  }, [])

  const isAdmin = user?.perfil === 'ADMIN'

  const value = {
    user,
    token,
    loading,
    isAdmin,
    login,
    logout,
    updateUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
