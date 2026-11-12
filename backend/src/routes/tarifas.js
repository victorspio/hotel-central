const express = require('express');
const router = express.Router();
const tarifasController = require('../controllers/tarifasController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, tarifasController.listar);
router.get('/por-tipo/:tipo', authenticate, tarifasController.buscarPorTipo);
router.put('/:id', authenticate, requireAdmin, tarifasController.atualizar);

module.exports = router;
