const prisma = require('../lib/prisma');

// GET /api/tarifas - listar todas
const listar = async (req, res, next) => {
  try {
    const tarifas = await prisma.tarifaQuarto.findMany({
      orderBy: { tipo: 'asc' },
    });
    res.json(tarifas);
  } catch (err) {
    next(err);
  }
};

// PUT /api/tarifas/:id - atualizar tarifa
const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { valorPorPessoa, nome, descricao, ativo } = req.body;

    if (valorPorPessoa === undefined || valorPorPessoa === null) {
      return res.status(400).json({ error: 'valorPorPessoa é obrigatório' });
    }

    const tarifa = await prisma.tarifaQuarto.findUnique({ where: { id: Number(id) } });
    if (!tarifa) return res.status(404).json({ error: 'Tarifa não encontrada' });

    const updated = await prisma.tarifaQuarto.update({
      where: { id: Number(id) },
      data: {
        valorPorPessoa: Number(valorPorPessoa),
        nome: nome || tarifa.nome,
        descricao: descricao !== undefined ? descricao : tarifa.descricao,
        ativo: ativo !== undefined ? Boolean(ativo) : tarifa.ativo,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// GET /api/tarifas/por-tipo/:tipo - buscar tarifa por tipo
const buscarPorTipo = async (req, res, next) => {
  try {
    const { tipo } = req.params;
    const tarifa = await prisma.tarifaQuarto.findUnique({ where: { tipo } });
    if (!tarifa) return res.status(404).json({ error: 'Tarifa não encontrada' });
    res.json(tarifa);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, atualizar, buscarPorTipo };
