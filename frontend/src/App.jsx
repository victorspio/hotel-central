import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

// Lazy-load pages to split heavy bundles (recharts, pdf, html2canvas) and load instantly
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ClientesPage = lazy(() => import('./pages/ClientesPage'))
const ClienteDetalhePage = lazy(() => import('./pages/ClienteDetalhePage'))
const QuartosPage = lazy(() => import('./pages/QuartosPage'))
const MapaQuartosPage = lazy(() => import('./pages/MapaQuartosPage'))
const HospedagensPage = lazy(() => import('./pages/HospedagensPage'))
const NovaHospedagemPage = lazy(() => import('./pages/NovaHospedagemPage'))
const HospedagemDetalhePage = lazy(() => import('./pages/HospedagemDetalhePage'))
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const ConfiguracoesTarifasPage = lazy(() => import('./pages/ConfiguracoesTarifasPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[350px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user.perfil !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="clientes/:id" element={<ClienteDetalhePage />} />
        <Route path="quartos" element={<QuartosPage />} />
        <Route path="mapa" element={<MapaQuartosPage />} />
        <Route path="hospedagens" element={<HospedagensPage />} />
        <Route path="hospedagens/nova" element={<NovaHospedagemPage />} />
        <Route path="hospedagens/:id" element={<HospedagemDetalhePage />} />
        <Route
          path="financeiro"
          element={
            <ProtectedRoute adminOnly>
              <FinanceiroPage />
            </ProtectedRoute>
          }
        />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route
          path="configuracoes"
          element={
            <ProtectedRoute adminOnly>
              <ConfiguracoesTarifasPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <AppRoutes />
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '10px',
              fontSize: '14px'
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
