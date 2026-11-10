const express = require('express');
const router = express.Router();
const hospedagemController = require('../controllers/hospedagemController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET /api/hospedagens
router.get('/', hospedagemController.listar);

// GET /api/hospedagens/:id
router.get('/:id', hospedagemController.buscar);

// POST /api/hospedagens  (check-in)
router.post('/', authorize('ADMIN', 'RECEPCIONISTA'), hospedagemController.criar);

// PUT /api/hospedagens/:id
router.put('/:id', authorize('ADMIN', 'RECEPCIONISTA'), hospedagemController.atualizar);

// POST /api/hospedagens/:id/checkout
router.post('/:id/checkout', authorize('ADMIN', 'RECEPCIONISTA'), hospedagemController.checkout);

// POST /api/hospedagens/:id/consumos
router.post('/:id/consumos', authorize('ADMIN', 'RECEPCIONISTA'), hospedagemController.adicionarConsumo);

// DELETE /api/hospedagens/:id/consumos/:consumoId
router.delete('/:id/consumos/:consumoId', authorize('ADMIN', 'RECEPCIONISTA'), hospedagemController.removerConsumo);

// PUT /api/hospedagens/quartos/:quartoId/status
router.put('/quartos/:quartoId/status', authorize('ADMIN', 'RECEPCIONISTA'), hospedagemController.alterarStatusQuarto);

module.exports = router;
