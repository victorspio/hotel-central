const express = require('express');
const router = express.Router();
const quartoController = require('../controllers/quartoController');
const hospedagemController = require('../controllers/hospedagemController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET /api/quartos
router.get('/', quartoController.listar);

// GET /api/quartos/:id
router.get('/:id', quartoController.buscar);

// POST /api/quartos  (ADMIN only)
router.post('/', authorize('ADMIN'), quartoController.criar);

// PATCH /api/quartos/:id/status (ADMIN or RECEPCIONISTA)
router.patch('/:id/status', authorize('ADMIN', 'RECEPCIONISTA'), (req, res, next) => {
  req.params.quartoId = req.params.id;
  return hospedagemController.alterarStatusQuarto(req, res, next);
});

// PUT /api/quartos/:id/status (ADMIN or RECEPCIONISTA)
router.put('/:id/status', authorize('ADMIN', 'RECEPCIONISTA'), (req, res, next) => {
  req.params.quartoId = req.params.id;
  return hospedagemController.alterarStatusQuarto(req, res, next);
});

// PUT /api/quartos/:id  (ADMIN or RECEPCIONISTA)
router.put('/:id', authorize('ADMIN', 'RECEPCIONISTA'), quartoController.atualizar);

// DELETE /api/quartos/:id (ADMIN only)
router.delete('/:id', authorize('ADMIN'), quartoController.excluir);

module.exports = router;
