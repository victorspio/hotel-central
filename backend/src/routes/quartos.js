const express = require('express');
const router = express.Router();
const quartoController = require('../controllers/quartoController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET /api/quartos
router.get('/', quartoController.listar);

// GET /api/quartos/:id
router.get('/:id', quartoController.buscar);

// POST /api/quartos  (ADMIN only)
router.post('/', authorize('ADMIN'), quartoController.criar);

// PUT /api/quartos/:id  (ADMIN or RECEPCIONISTA)
router.put('/:id', authorize('ADMIN', 'RECEPCIONISTA'), quartoController.atualizar);

// DELETE /api/quartos/:id (ADMIN only)
router.delete('/:id', authorize('ADMIN'), quartoController.excluir);

module.exports = router;
