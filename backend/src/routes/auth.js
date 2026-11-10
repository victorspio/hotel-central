const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('E-mail inválido'),
    body('senha').notEmpty().withMessage('Senha obrigatória'),
  ],
  authController.login
);

// POST /api/auth/refresh
router.post('/refresh', authenticate, authController.refresh);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

// PUT /api/auth/perfil
router.put('/perfil', authenticate, authController.atualizarPerfil);

module.exports = router;
