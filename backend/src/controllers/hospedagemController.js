const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Determines the tariff type based on quarto properties.
 */
function getTipoTarifa(quarto) {
  if (quarto.tipo === 'COMPLETO') return 'COMPLETO';
  if (quarto.tipo === 'SIMPLES' && quarto.temArCondicionado) return 'SIMPLES_COM_AR';
  return 'SIMPLES_SEM_AR';
}

const listar = async (req, res, next) => {
  try {
    const { status, clienteId, quartoId, dataInicio, dataFim, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = Number(clienteId);
    if (quartoId) where.quartoId = Number(quartoId);
    if (dataInicio || dataFim) {
      where.dataEntrada = {};
      if (dataInicio) where.dataEntrada.gte = new Date(dataInicio);
      if (dataFim) where.dataEntrada.lte = new Date(dataFim);
    }

    const [hospedagens, total] = await Promise.all([
      prisma.hospedagem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
          quarto: { select: { id: true, numero: true, predio: true, tipo: true, temArCondicionado: true, valorDiaria: true } },
          _count: { select: { consumosExtras: true } },
        },
      }),
      prisma.hospedagem.count({ where }),
    ]);

    res.json({
      data: hospedagens,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const buscar = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hospedagem = await prisma.hospedagem.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        quarto: true,
        consumosExtras: { orderBy: { data: 'desc' } },
        lancamento: true,
      },
    });

    if (!hospedagem) {
      return res.status(404).json({ error: 'Hospedagem não encontrada' });
    }

    // Calculate current total if still active
    let totalConsumos = hospedagem.consumosExtras.reduce((sum, c) => sum + c.valor, 0);
    if (hospedagem.status === 'ATIVA') {
      const agora = new Date();
      const dias = Math.max(1, Math.ceil((agora - hospedagem.dataEntrada) / 86400000));
      // Busca tarifa para cálculo provisório
      const tipoTarifa = getTipoTarifa(hospedagem.quarto);
      const tarifa = await prisma.tarifaQuarto.findUnique({ where: { tipo: tipoTarifa } });
      const valorPorPessoa = tarifa ? tarifa.valorPorPessoa : (hospedagem.quarto.valorDiaria || 0);
      hospedagem._totalProvisorio = dias * valorPorPessoa * hospedagem.numHospedes + totalConsumos;
      hospedagem._valorPorPessoa = valorPorPessoa;
      hospedagem._diasProvisorio = dias;
    }

    res.json({ ...hospedagem, totalConsumos });
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { clienteId, quartoId, dataEntrada, previsaoSaida, numHospedes, observacoes } = req.body;

    if (!clienteId || !quartoId || !dataEntrada || !previsaoSaida) {
      return res.status(400).json({ error: 'clienteId, quartoId, dataEntrada e previsaoSaida são obrigatórios' });
    }

    // Validate quarto
    const quarto = await prisma.quarto.findUnique({ where: { id: Number(quartoId) } });
    if (!quarto) return res.status(404).json({ error: 'Quarto não encontrado' });
    if (quarto.status !== 'LIVRE') {
      return res.status(409).json({ error: `Quarto não está livre. Status atual: ${quarto.status}` });
    }

    // Validate cliente
    const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) } });
    if (!cliente || !cliente.ativo) return res.status(404).json({ error: 'Cliente não encontrado ou inativo' });

    // Check date conflicts
    const conflito = await prisma.hospedagem.findFirst({
      where: {
        quartoId: Number(quartoId),
        status: 'ATIVA',
        dataEntrada: { lte: new Date(previsaoSaida) },
        previsaoSaida: { gte: new Date(dataEntrada) },
      },
    });
    if (conflito) {
      return res.status(409).json({ error: 'Quarto já possui reserva no período informado' });
    }

    const hospedagem = await prisma.$transaction(async (tx) => {
      const h = await tx.hospedagem.create({
        data: {
          clienteId: Number(clienteId),
          quartoId: Number(quartoId),
          dataEntrada: new Date(dataEntrada),
          previsaoSaida: new Date(previsaoSaida),
          numHospedes: Number(numHospedes) || 1,
          observacoes,
          status: 'ATIVA',
        },
        include: {
          cliente: { select: { id: true, nome: true } },
          quarto: { select: { id: true, numero: true, predio: true, tipo: true, temArCondicionado: true, valorDiaria: true } },
        },
      });

      await tx.quarto.update({
        where: { id: Number(quartoId) },
        data: { status: 'OCUPADO' },
      });

      return h;
    });

    res.status(201).json(hospedagem);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { previsaoSaida, numHospedes, observacoes } = req.body;

    const hospedagem = await prisma.hospedagem.findUnique({ where: { id: Number(id) } });
    if (!hospedagem) return res.status(404).json({ error: 'Hospedagem não encontrada' });
    if (hospedagem.status !== 'ATIVA') {
      return res.status(409).json({ error: 'Apenas hospedagens ativas podem ser editadas' });
    }

    const updated = await prisma.hospedagem.update({
      where: { id: Number(id) },
      data: {
        previsaoSaida: previsaoSaida ? new Date(previsaoSaida) : undefined,
        numHospedes: numHospedes !== undefined ? Number(numHospedes) : undefined,
        observacoes,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        quarto: { select: { id: true, numero: true, tipo: true, temArCondicionado: true, valorDiaria: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const checkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { formaPagamento, observacoes } = req.body;

    const hospedagem = await prisma.hospedagem.findUnique({
      where: { id: Number(id) },
      include: {
        quarto: true,
        consumosExtras: true,
        lancamento: true,
      },
    });

    if (!hospedagem) return res.status(404).json({ error: 'Hospedagem não encontrada' });
    if (hospedagem.status !== 'ATIVA') {
      return res.status(409).json({ error: 'Hospedagem não está ativa' });
    }

    const dataSaida = new Date();
    const dias = Math.max(1, Math.ceil((dataSaida - hospedagem.dataEntrada) / 86400000));
    const tipoTarifa = getTipoTarifa(hospedagem.quarto);
    const tarifa = await prisma.tarifaQuarto.findUnique({ where: { tipo: tipoTarifa } });
    const valorPorPessoa = tarifa ? tarifa.valorPorPessoa : (hospedagem.quarto.valorDiaria || 0);
    const totalDiarias = dias * valorPorPessoa * hospedagem.numHospedes;
    const totalConsumos = hospedagem.consumosExtras.reduce((sum, c) => sum + c.valor, 0);
    const valorTotal = totalDiarias + totalConsumos;

    const result = await prisma.$transaction(async (tx) => {
      const h = await tx.hospedagem.update({
        where: { id: Number(id) },
        data: {
          status: 'FINALIZADA',
          dataSaida,
          valorTotal,
          formaPagamento: formaPagamento || null,
          observacoes: observacoes || hospedagem.observacoes,
        },
        include: {
          cliente: { select: { id: true, nome: true } },
          quarto: { select: { id: true, numero: true, tipo: true } },
          consumosExtras: true,
        },
      });

      await tx.quarto.update({
        where: { id: hospedagem.quartoId },
        data: { status: 'LIMPEZA' },
      });

      let lancamento;
      if (!hospedagem.lancamento) {
        lancamento = await tx.lancamentoFinanceiro.create({
          data: {
            tipo: 'RECEITA',
            categoria: 'Hospedagem',
            descricao: `Checkout - ${h.cliente.nome} - Quarto ${h.quarto.numero}`,
            valor: valorTotal,
            data: dataSaida,
            formaPagamento: formaPagamento || null,
            status: 'PAGO',
            hospedagemId: Number(id),
          },
        });
      } else {
        lancamento = await tx.lancamentoFinanceiro.update({
          where: { id: hospedagem.lancamento.id },
          data: {
            valor: valorTotal,
            status: 'PAGO',
            formaPagamento: formaPagamento || null,
            data: dataSaida,
          },
        });
      }

      return { ...h, lancamento, dias, totalDiarias, totalConsumos, valorTotal };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const adicionarConsumo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { descricao, categoria, valor, data } = req.body;

    if (!descricao || !valor) {
      return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
    }

    const hospedagem = await prisma.hospedagem.findUnique({ where: { id: Number(id) } });
    if (!hospedagem) return res.status(404).json({ error: 'Hospedagem não encontrada' });
    if (hospedagem.status !== 'ATIVA') {
      return res.status(409).json({ error: 'Só é possível adicionar consumos em hospedagens ativas' });
    }

    const consumo = await prisma.consumoExtra.create({
      data: {
        hospedagemId: Number(id),
        descricao,
        categoria: categoria || 'OUTRO',
        valor: Number(valor),
        data: data ? new Date(data) : new Date(),
      },
    });

    res.status(201).json(consumo);
  } catch (err) {
    next(err);
  }
};

const removerConsumo = async (req, res, next) => {
  try {
    const { id, consumoId } = req.params;

    const consumo = await prisma.consumoExtra.findFirst({
      where: { id: Number(consumoId), hospedagemId: Number(id) },
    });

    if (!consumo) return res.status(404).json({ error: 'Consumo não encontrado' });

    await prisma.consumoExtra.delete({ where: { id: Number(consumoId) } });

    res.json({ message: 'Consumo removido com sucesso' });
  } catch (err) {
    next(err);
  }
};

const alterarStatusQuarto = async (req, res, next) => {
  try {
    const { quartoId } = req.params;
    const { status } = req.body;

    const STATUS_VALIDOS = ['LIVRE', 'OCUPADO', 'LIMPEZA', 'MANUTENCAO'];
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    }

    const quarto = await prisma.quarto.findUnique({ where: { id: Number(quartoId) } });
    if (!quarto) return res.status(404).json({ error: 'Quarto não encontrado' });

    const updated = await prisma.quarto.update({
      where: { id: Number(quartoId) },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listar, buscar, criar, atualizar, checkout,
  adicionarConsumo, removerConsumo, alterarStatusQuarto,
};
