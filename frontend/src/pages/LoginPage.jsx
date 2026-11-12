import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hotel, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', senha: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.senha) {
      setError('Preencha o e-mail e a senha.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await login(form.email, form.senha)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Erro no login:', err)
      console.error('Detalhes do servidor:', err?.response?.data)
      const data = err?.response?.data
      const msg = data?.message
        ? `${data.error || 'Erro'}: ${data.message}`
        : (data?.error || err?.message || 'E-mail ou senha incorretos.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header strip */}
          <div className="bg-gradient-to-r from-primary-800 to-primary-700 px-8 py-8 text-center flex flex-col items-center">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm shadow-inner mb-3">
              <img
                src="/logo.png"
                alt="Hotel Central 2 e Anexo"
                className="h-20 w-auto object-contain drop-shadow-md"
              />
            </div>
            <p className="text-blue-200 text-sm font-medium">Sistema de Gestão Hoteleira</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Acesso ao sistema</h2>
              <p className="text-sm text-gray-500">Insira suas credenciais para continuar.</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Input
              label="E-mail"
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              autoComplete="username"
              required
              disabled={loading}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="senha" className="text-sm font-medium text-gray-700">
                Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={form.senha}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </Button>
          </form>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          © {new Date().getFullYear()} Hotel Central 2 e Anexo. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
