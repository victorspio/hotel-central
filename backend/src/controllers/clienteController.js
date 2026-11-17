const prisma = require('../lib/prisma');

function validarCPF(cpf) {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11;
}

function normalizarCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

function norm(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/c(?=t)/g, '');
}

const listar = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search && search.trim()) {
      const q = search.trim();
      const digits = q.replace(/\D/g, '');
      const orConditions = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
      if (digits.length >= 2) {
        orConditions.push({ cpf: { contains: digits } });
        orConditions.push({ telefone: { contains: digits } });
      }
      where.OR = orConditions;
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { nome: 'asc' },
        include: {
          _count: { select: { hospedagens: true } },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      data: clientes,
      clientes,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (err) {
    next(err);
  }
};

const buscar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
      include: {
        hospedagens: {
          orderBy: { createdAt: 'desc' },
          include: { quarto: { select: { numero: true, tipo: true } } },
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const {
      nome, cpf, rg, dataNascimento, telefone, email,
      logradouro, numero, complemento, bairro, cidade, estado, cep, observacoes,
    } = req.body;

    if (!nome || !cpf) {
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios' });
    }

    if (!validarCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos.' });
    }

    const cpfNormalizado = normalizarCPF(cpf);

    const existente = await prisma.cliente.findUnique({ where: { cpf: cpfNormalizado } });
    if (existente) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cpf: cpfNormalizado,
        rg,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        telefone,
        email,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        observacoes,
      },
    });

    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nome, cpf, rg, dataNascimento, telefone, email,
      logradouro, numero, complemento, bairro, cidade, estado, cep, observacoes, ativo,
    } = req.body;

    const clienteExistente = await prisma.cliente.findUnique({ where: { id: Number(id) } });
    if (!clienteExistente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    let cpfNormalizado = clienteExistente.cpf;
    if (cpf) {
      if (!validarCPF(cpf)) {
        return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos.' });
      }
      cpfNormalizado = normalizarCPF(cpf);

      if (cpfNormalizado !== clienteExistente.cpf) {
        const duplicado = await prisma.cliente.findUnique({ where: { cpf: cpfNormalizado } });
        if (duplicado) {
          return res.status(409).json({ error: 'CPF já cadastrado para outro cliente' });
        }
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data: {
        nome,
        cpf: cpfNormalizado,
        rg,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
        telefone,
        email,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        observacoes,
        ativo: ativo !== undefined ? Boolean(ativo) : undefined,
      },
    });

    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

const excluir = async (req, res, next) => {
  try {
    const { id } = req.params;
    const clienteId = Number(id);

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Check for active hospedagens
    const hospedagemAtiva = await prisma.hospedagem.findFirst({
      where: { clienteId, status: 'ATIVA' },
    });
    if (hospedagemAtiva) {
      return res.status(409).json({ error: 'Cliente possui hospedagem ativa. Faça o checkout antes de excluir.' });
    }

    // Find all past stays of this client to clean up foreign key constraints
    const pastStays = await prisma.hospedagem.findMany({
      where: { clienteId },
      select: { id: true },
    });
    const stayIds = pastStays.map((s) => s.id);

    if (stayIds.length > 0) {
      await prisma.consumoExtra.deleteMany({
        where: { hospedagemId: { in: stayIds } },
      });
      await prisma.lancamentoFinanceiro.deleteMany({
        where: { hospedagemId: { in: stayIds } },
      });
      await prisma.hospedagem.deleteMany({
        where: { id: { in: stayIds } },
      });
    }

    // Truly delete the client
    await prisma.cliente.delete({
      where: { id: clienteId },
    });

    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscar, criar, atualizar, excluir };
