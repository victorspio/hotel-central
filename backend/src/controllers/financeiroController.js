const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { tipo, categoria, status, dataInicio, dataFim, formaPagamento, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = { contains: categoria };
    if (status) where.status = status;
    if (formaPagamento) where.formaPagamento = formaPagamento;
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio);
      if (dataFim) where.data.lte = new Date(dataFim);
    }

    const [lancamentos, total] = await Promise.all([
      prisma.lancamentoFinanceiro.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { data: 'desc' },
        include: {
          hospedagem: {
            select: { id: true, cliente: { select: { nome: true } } },
          },
        },
      }),
      prisma.lancamentoFinanceiro.count({ where }),
    ]);

    res.json({
      data: lancamentos,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const buscar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lancamento = await prisma.lancamentoFinanceiro.findUnique({
      where: { id: Number(id) },
      include: { hospedagem: { include: { cliente: { select: { nome: true } }, quarto: { select: { numero: true } } } } },
    });
    if (!lancamento) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json(lancamento);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { tipo, categoria, descricao, valor, data, formaPagamento, status, observacoes, hospedagemId } = req.body;

    if (!tipo || !categoria || !descricao || !valor || !data) {
      return res.status(400).json({ error: 'tipo, categoria, descricao, valor e data são obrigatórios' });
    }

    if (!['RECEITA', 'DESPESA'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo deve ser RECEITA ou DESPESA' });
    }

    const lancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        tipo,
        categoria,
        descricao,
        valor: Number(valor),
        data: new Date(data),
        formaPagamento: formaPagamento || null,
        status: status || 'PENDENTE',
        observacoes,
        hospedagemId: hospedagemId ? Number(hospedagemId) : null,
      },
    });

    res.status(201).json(lancamento);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tipo, categoria, descricao, valor, data, formaPagamento, status, observacoes } = req.body;

    const existente = await prisma.lancamentoFinanceiro.findUnique({ where: { id: Number(id) } });
    if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const lancamento = await prisma.lancamentoFinanceiro.update({
      where: { id: Number(id) },
      data: {
        tipo,
        categoria,
        descricao,
        valor: valor !== undefined ? Number(valor) : undefined,
        data: data ? new Date(data) : undefined,
        formaPagamento,
        status,
        observacoes,
      },
    });

    res.json(lancamento);
  } catch (err) {
    next(err);
  }
};

const excluir = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lancamento = await prisma.lancamentoFinanceiro.findUnique({ where: { id: Number(id) } });
    if (!lancamento) return res.status(404).json({ error: 'Lançamento não encontrado' });

    if (lancamento.hospedagemId) {
      return res.status(409).json({ error: 'Não é possível excluir lançamentos vinculados a hospedagens' });
    }

    await prisma.lancamentoFinanceiro.delete({ where: { id: Number(id) } });

    res.json({ message: 'Lançamento excluído com sucesso' });
  } catch (err) {
    next(err);
  }
};

const resumo = async (req, res, next) => {
  try {
    const { dataInicio, dataFim } = req.query;

    const where = {};
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio);
      if (dataFim) where.data.lte = new Date(dataFim);
    }

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({ where });

    const totalReceitas = lancamentos
      .filter(l => l.tipo === 'RECEITA')
      .reduce((sum, l) => sum + l.valor, 0);

    const totalDespesas = lancamentos
      .filter(l => l.tipo === 'DESPESA')
      .reduce((sum, l) => sum + l.valor, 0);

    const saldo = totalReceitas - totalDespesas;

    // Grouped by category
    const porCategoria = lancamentos.reduce((acc, l) => {
      const key = `${l.tipo}:${l.categoria}`;
      if (!acc[key]) acc[key] = { tipo: l.tipo, categoria: l.categoria, total: 0, count: 0 };
      acc[key].total += l.valor;
      acc[key].count += 1;
      return acc;
    }, {});

    const pendentes = lancamentos.filter(l => l.status === 'PENDENTE').reduce((sum, l) => sum + l.valor, 0);
    const atrasados = lancamentos.filter(l => l.status === 'ATRASADO').reduce((sum, l) => sum + l.valor, 0);

    res.json({
      totalReceitas,
      totalDespesas,
      saldo,
      pendentes,
      atrasados,
      porCategoria: Object.values(porCategoria),
      periodo: { dataInicio: dataInicio || null, dataFim: dataFim || null },
    });
  } catch (err) {
    next(err);
  }
};

const fluxoCaixa = async (req, res, next) => {
  try {
    const { meses = 12 } = req.query;
    const numMeses = Number(meses);

    // Get lancamentos from last N months
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - numMeses + 1);
    dataInicio.setDate(1);
    dataInicio.setHours(0, 0, 0, 0);

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: { data: { gte: dataInicio } },
      orderBy: { data: 'asc' },
    });

    // Group by month
    const byMonth = {};
    lancamentos.forEach(l => {
      const d = new Date(l.data);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { mes: key, receita: 0, despesa: 0, saldo: 0 };
      if (l.tipo === 'RECEITA') byMonth[key].receita += l.valor;
      else byMonth[key].despesa += l.valor;
    });

    // Fill missing months and calculate saldo
    const result = [];
    for (let i = 0; i < numMeses; i++) {
      const d = new Date(dataInicio);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const item = byMonth[key] || { mes: key, receita: 0, despesa: 0 };
      item.saldo = item.receita - item.despesa;
      result.push(item);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscar, criar, atualizar, excluir, resumo, fluxoCaixa };
