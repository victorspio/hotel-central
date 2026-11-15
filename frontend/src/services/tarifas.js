import api from './api';

let cachedTarifas = null;
let lastFetch = 0;

export const tarifasService = {
  listar: async (params, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedTarifas && !params && (now - lastFetch < 60000)) {
      return { data: cachedTarifas };
    }
    const res = await api.get('/tarifas', { params });
    if (!params) {
      cachedTarifas = res.data;
      lastFetch = now;
    }
    return res;
  },
  atualizar: async (id, data) => {
    cachedTarifas = null;
    return api.put(`/tarifas/${id}`, data);
  },
  buscarPorTipo: (tipo, predio) => api.get(`/tarifas/por-tipo/${tipo}`, { params: { predio } }),
};
