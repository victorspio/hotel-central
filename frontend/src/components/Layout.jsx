import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  BedDouble,
  Users,
  Building,
  FileBarChart,
  DollarSign,
  LogOut,
  Hotel,
  Menu,
  X,
  ChevronRight,
  KeyRound,
  ShieldCheck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { auth as authApi } from '../services/api'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mapa', label: 'Mapa de Quartos', icon: Map },
  { to: '/hospedagens', label: 'Hospedagens', icon: BedDouble },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/quartos', label: 'Quartos', icon: Building },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign, adminOnly: true }
]

function NavItem({ item, isAdmin, onClick }) {
  if (item.adminOnly && !isAdmin) return null

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'sidebar-link',
          isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
        ].join(' ')
      }
    >
      <item.icon size={18} />
      <span>{item.label}</span>
      <ChevronRight size={14} className="ml-auto opacity-50" />
    </NavLink>
  )
}

export default function Layout() {
  const { user, isAdmin, logout, updateUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    nome: '',
    email: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  })
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        nome: user.nome || '',
        email: user.email || '',
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      }))
    }
  }, [user, profileModalOpen])

  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!profileForm.nome.trim()) return toast.error('Nome é obrigatório.')
    if (!profileForm.email.trim()) return toast.error('E-mail é obrigatório.')

    if (profileForm.novaSenha) {
      if (!profileForm.senhaAtual) {
        return toast.error('Informe sua senha atual para poder alterá-la.')
      }
      if (profileForm.novaSenha.length < 6) {
        return toast.error('A nova senha deve ter no mínimo 6 caracteres.')
      }
      if (profileForm.novaSenha !== profileForm.confirmarSenha) {
        return toast.error('A confirmação da nova senha não confere.')
      }
    }

    setSavingProfile(true)
    try {
      const res = await authApi.atualizarPerfil({
        nome: profileForm.nome,
        email: profileForm.email,
        senhaAtual: profileForm.senhaAtual || undefined,
        novaSenha: profileForm.novaSenha || undefined
      })

      if (updateUser) {
        updateUser(res.data.user || res.data.usuario, res.data.token)
      }
      toast.success('Login e senha atualizados com sucesso!')
      setProfileModalOpen(false)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao atualizar dados de acesso.')
    } finally {
      setSavingProfile(false)
    }
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 w-64 bg-primary-800 flex flex-col transition-transform duration-300',
          'lg:relative lg:translate-x-0 lg:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-700/80 bg-primary-900/30">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Hotel Central 2 e Anexo"
              className="h-12 w-auto max-w-[175px] object-contain drop-shadow"
            />
          </div>
          <button
            className="lg:hidden text-blue-300 hover:text-white p-1"
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              isAdmin={isAdmin}
              onClick={closeSidebar}
            />
          ))}
        </nav>

        {/* User info & logout */}
        <div className="border-t border-primary-700 px-4 py-4 space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-inner">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.nome || 'Usuário'}
              </p>
              <p className="text-blue-300 text-xs truncate">
                {isAdmin ? 'Administrador' : 'Recepcionista'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-primary-700 hover:text-white transition-colors"
          >
            <KeyRound size={16} />
            Alterar Login / Senha
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-primary-700 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sair do sistema
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              Bem-vindo, <strong className="text-gray-700">{user?.nome?.split(' ')[0]}</strong>
            </span>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
            >
              <KeyRound size={14} />
              <span>Minha Conta</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>

      {/* Modal de Alteração de Login e Senha */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Alterar Dados de Acesso"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setProfileModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} loading={savingProfile}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Nome de Exibição"
            required
            value={profileForm.nome}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, nome: e.target.value }))}
            placeholder="Ex: Administrador"
          />

          <Input
            label="E-mail de Login"
            type="email"
            required
            value={profileForm.email}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="seuemail@hotel.com"
            helper="Este é o e-mail usado para acessar o sistema"
          />

          <div className="border-t border-gray-100 pt-3 mt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary-600" />
              Segurança & Senha (Opcional)
            </p>
            <p className="text-xs text-gray-400">
              Preencha apenas se desejar mudar sua senha atual.
            </p>

            <Input
              label="Senha Atual"
              type="password"
              value={profileForm.senhaAtual}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, senhaAtual: e.target.value }))}
              placeholder="Digite sua senha atual"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nova Senha"
                type="password"
                value={profileForm.novaSenha}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, novaSenha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />

              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={profileForm.confirmarSenha}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
