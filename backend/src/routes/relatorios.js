const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/relatorios/diario
router.get('/diario', relatorioController.diario);

// GET /api/relatorios/periodo
router.get('/periodo', relatorioController.periodo);

// GET /api/relatorios/exportar
router.get('/exportar', relatorioController.exportar);

module.exports = router;
