const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TIPOS_VALIDOS = ['SOLTEIRO', 'CASAL', 'SUITE', 'FAMILIA'];
const STATUS_VALIDOS = ['LIVRE', 'OCUPADO', 'LIMPEZA', 'MANUTENCAO'];

const listar = async (req, res, next) => {
  try {
    const { status, tipo, andar, predio, page, limit } = req.query;

    const where = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (andar) where.andar = Number(andar);
    if (predio) where.predio = predio.toUpperCase();

    const orderBy = [{ predio: 'asc' }, { andar: 'asc' }, { numero: 'asc' }];

    if (page || limit) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      const [quartos, total] = await Promise.all([
        prisma.quarto.findMany({
          where,
          skip,
          take: limitNum,
          orderBy,
        }),
        prisma.quarto.count({ where }),
      ]);

      return res.json({
        data: quartos,
        quartos,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const quartos = await prisma.quarto.findMany({
      where,
      orderBy,
    });

    res.json(quartos);
  } catch (err) {
    next(err);
  }
};

const buscar = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quarto = await prisma.quarto.findUnique({
      where: { id: Number(id) },
      include: {
        hospedagens: {
          where: { status: 'ATIVA' },
          include: {
            cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
          },
          take: 1,
        },
      },
    });

    if (!quarto) {
      return res.status(404).json({ error: 'Quarto não encontrado' });
    }

    const { hospedagens, ...quartoData } = quarto;
    res.json({
      ...quartoData,
      hospedagemAtual: hospedagens[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { numero, predio, tipo, capacidade, valorDiaria, andar, descricao } = req.body;

    if (!numero || !valorDiaria) {
      return res.status(400).json({ error: 'Número e valor da diária são obrigatórios' });
    }

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const predioNormalizado = (predio && ['CENTRAL', 'ANEXO'].includes(predio.toUpperCase())) ? predio.toUpperCase() : 'CENTRAL';

    const existente = await prisma.quarto.findFirst({
      where: { numero: String(numero), predio: predioNormalizado },
    });
    if (existente) {
      return res.status(409).json({
        error: `O quarto ${numero} já está cadastrado no ${predioNormalizado === 'CENTRAL' ? 'Prédio Central' : 'Prédio Anexo'}`,
      });
    }

    const quarto = await prisma.quarto.create({
      data: {
        numero: String(numero),
        predio: predioNormalizado,
        tipo: tipo || 'SOLTEIRO',
        capacidade: Number(capacidade) || 1,
        valorDiaria: Number(valorDiaria),
        andar: Number(andar) || 1,
        descricao,
        status: 'LIVRE',
      },
    });

    res.status(201).json(quarto);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numero, predio, tipo, capacidade, valorDiaria, andar, status, descricao } = req.body;

    const quarto = await prisma.quarto.findUnique({ where: { id: Number(id) } });
    if (!quarto) {
      return res.status(404).json({ error: 'Quarto não encontrado' });
    }

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}` });
    }

    if (status && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    }

    const predioDestino = predio ? ((['CENTRAL', 'ANEXO'].includes(predio.toUpperCase())) ? predio.toUpperCase() : quarto.predio) : quarto.predio;
    const numeroDestino = numero ? String(numero) : quarto.numero;

    if (numeroDestino !== quarto.numero || predioDestino !== quarto.predio) {
      const duplicado = await prisma.quarto.findFirst({
        where: {
          id: { not: Number(id) },
          numero: numeroDestino,
          predio: predioDestino,
        },
      });
      if (duplicado) {
        return res.status(409).json({
          error: `O quarto ${numeroDestino} já está cadastrado no ${predioDestino === 'CENTRAL' ? 'Prédio Central' : 'Prédio Anexo'}`,
        });
      }
    }

    const quartoAtualizado = await prisma.quarto.update({
      where: { id: Number(id) },
      data: {
        numero: numero ? String(numero) : undefined,
        predio: predioDestino,
        tipo,
        capacidade: capacidade !== undefined ? Number(capacidade) : undefined,
        valorDiaria: valorDiaria !== undefined ? Number(valorDiaria) : undefined,
        andar: andar !== undefined ? Number(andar) : undefined,
        status,
        descricao,
      },
    });

    res.json(quartoAtualizado);
  } catch (err) {
    next(err);
  }
};

const excluir = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quarto = await prisma.quarto.findUnique({ where: { id: Number(id) } });
    if (!quarto) {
      return res.status(404).json({ error: 'Quarto não encontrado' });
    }

    if (quarto.status === 'OCUPADO') {
      return res.status(409).json({ error: 'Quarto está ocupado. Faça o checkout antes de excluir.' });
    }

    const hospedagemAtiva = await prisma.hospedagem.findFirst({
      where: { quartoId: Number(id), status: 'ATIVA' },
    });
    if (hospedagemAtiva) {
      return res.status(409).json({ error: 'Quarto possui hospedagem ativa.' });
    }

    await prisma.quarto.delete({ where: { id: Number(id) } });

    res.json({ message: 'Quarto excluído com sucesso' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscar, criar, atualizar, excluir };
