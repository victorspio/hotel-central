const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'hotel_central_jwt_secret_2024_super_seguro';
  return jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil, nome: user.nome },
    secret,
    { expiresIn: '8h' }
  );
}

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
    }

    const { email, senha } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = generateToken(user);

    const { senha: _, ...userSemSenha } = user;

    res.json({
      token,
      user: userSemSenha,
      usuario: userSemSenha,
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

const atualizarPerfil = async (req, res, next) => {
  try {
    const { nome, email, senhaAtual, novaSenha } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const dataToUpdate = {};

    if (nome && nome.trim()) {
      dataToUpdate.nome = nome.trim();
    }

    if (email && email.trim() && email.trim() !== user.email) {
      const emailExistente = await prisma.user.findUnique({
        where: { email: email.trim() },
      });
      if (emailExistente) {
        return res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário' });
      }
      dataToUpdate.email = email.trim();
    }

    if (novaSenha && novaSenha.trim()) {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Informe a senha atual para definir uma nova senha' });
      }
      const senhaValida = await bcrypt.compare(senhaAtual, user.senha);
      if (!senhaValida) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
      if (novaSenha.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
      }
      dataToUpdate.senha = await bcrypt.hash(novaSenha.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    });

    const token = generateToken(updatedUser);

    res.json({
      message: 'Perfil atualizado com sucesso!',
      user: updatedUser,
      usuario: updatedUser,
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, me, atualizarPerfil };
