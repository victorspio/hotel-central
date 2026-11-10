import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor: attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hotel_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      window.location.pathname !== '/login'
    ) {
      localStorage.removeItem('hotel_token')
      localStorage.removeItem('hotel_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  getMe: () => api.get('/auth/me'),
  atualizarPerfil: (data) => api.put('/auth/perfil', data)
}

// ─── Clientes ──────────────────────────────────────────────────────────────
export const clientes = {
  list: (params) => api.get('/clientes', { params }),
  getOne: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  remove: (id) => api.delete(`/clientes/${id}`)
}

// ─── Quartos ───────────────────────────────────────────────────────────────
export const quartos = {
  list: (params) => api.get('/quartos', { params }),
  getOne: (id) => api.get(`/quartos/${id}`),
  create: (data) => api.post('/quartos', data),
  update: (id, data) => api.put(`/quartos/${id}`, data),
  remove: (id) => api.delete(`/quartos/${id}`)
}

// ─── Hospedagens ───────────────────────────────────────────────────────────
export const hospedagens = {
  list: (params) => api.get('/hospedagens', { params }),
  getOne: (id) => api.get(`/hospedagens/${id}`),
  create: (data) => api.post('/hospedagens', data),
  update: (id, data) => api.put(`/hospedagens/${id}`, data),
  checkout: (id, data) => api.post(`/hospedagens/${id}/checkout`, data),
  addConsumo: (id, data) => api.post(`/hospedagens/${id}/consumos`, data),
  removeConsumo: (id, consumoId) => api.delete(`/hospedagens/${id}/consumos/${consumoId}`),
  updateQuartoStatus: (quartoId, status) => api.patch(`/quartos/${quartoId}/status`, { status })
}

// ─── Financeiro ────────────────────────────────────────────────────────────
export const financeiro = {
  listLancamentos: (params) => api.get('/financeiro/lancamentos', { params }),
  createLancamento: (data) => api.post('/financeiro/lancamentos', data),
  updateLancamento: (id, data) => api.put(`/financeiro/lancamentos/${id}`, data),
  deleteLancamento: (id) => api.delete(`/financeiro/lancamentos/${id}`),
  getResumo: (params) => api.get('/financeiro/resumo', { params }),
  getFluxoCaixa: (params) => api.get('/financeiro/fluxo-caixa', { params })
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboard = {
  get: () => api.get('/dashboard')
}

// ─── Relatórios ────────────────────────────────────────────────────────────
export const relatorios = {
  getDiario: (params) => api.get('/relatorios/diario', { params }),
  getPeriodo: (params) => api.get('/relatorios/periodo', { params }),
  exportar: (params) => api.get('/relatorios/exportar', { params, responseType: 'blob' })
}

export default api
