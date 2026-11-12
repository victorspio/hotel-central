import api from './api';

export const tarifasService = {
  listar: (params) => api.get('/tarifas', { params }),
  atualizar: (id, data) => api.put(`/tarifas/${id}`, data),
  buscarPorTipo: (tipo, predio) => api.get(`/tarifas/por-tipo/${tipo}`, { params: { predio } }),
};
