const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/financeiro/resumo
router.get('/resumo', financeiroController.resumo);

// GET /api/financeiro/fluxo-caixa
router.get('/fluxo-caixa', financeiroController.fluxoCaixa);

// GET /api/financeiro/lancamentos
router.get('/lancamentos', financeiroController.listar);

// GET /api/financeiro/lancamentos/:id
router.get('/lancamentos/:id', financeiroController.buscar);

// POST /api/financeiro/lancamentos
router.post('/lancamentos', financeiroController.criar);

// PUT /api/financeiro/lancamentos/:id
router.put('/lancamentos/:id', financeiroController.atualizar);

// DELETE /api/financeiro/lancamentos/:id
router.delete('/lancamentos/:id', financeiroController.excluir);

module.exports = router;
