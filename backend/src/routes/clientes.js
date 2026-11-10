const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET /api/clientes
router.get('/', clienteController.listar);

// GET /api/clientes/:id
router.get('/:id', clienteController.buscar);

// POST /api/clientes
router.post('/', authorize('ADMIN', 'RECEPCIONISTA'), clienteController.criar);

// PUT /api/clientes/:id
router.put('/:id', authorize('ADMIN', 'RECEPCIONISTA'), clienteController.atualizar);

// DELETE /api/clientes/:id  (soft delete)
router.delete('/:id', authorize('ADMIN'), clienteController.excluir);

module.exports = router;
