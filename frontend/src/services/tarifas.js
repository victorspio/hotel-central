import api from './api';

export const tarifasService = {
  listar: () => api.get('/tarifas'),
  atualizar: (id, data) => api.put(`/tarifas/${id}`, data),
  buscarPorTipo: (tipo) => api.get(`/tarifas/por-tipo/${tipo}`),
};
