const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const diario = async (req, res, next) => {
  try {
    const { data, dataInicio, dataFim } = req.query;

    let inicio, fim;
    if (data) {
      inicio = new Date(data);
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(data);
      fim.setHours(23, 59, 59, 999);
    } else if (dataInicio && dataFim) {
      inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      fim = new Date();
      fim.setHours(23, 59, 59, 999);
    }

    const [checkinsNoPeriodo, checkoutsNoPeriodo, hospedagensAtivas, lancamentos] = await Promise.all([
      prisma.hospedagem.findMany({
        where: { dataEntrada: { gte: inicio, lte: fim } },
        include: {
          cliente: { select: { nome: true, cpf: true } },
          quarto: { select: { numero: true, tipo: true, valorDiaria: true } },
        },
      }),
      prisma.hospedagem.findMany({
        where: { dataSaida: { gte: inicio, lte: fim }, status: 'FINALIZADA' },
        include: {
          cliente: { select: { nome: true, cpf: true } },
          quarto: { select: { numero: true, tipo: true } },
        },
      }),
      prisma.hospedagem.count({
        where: {
          status: 'ATIVA',
          dataEntrada: { lte: fim },
        },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: { data: { gte: inicio, lte: fim } },
        orderBy: { data: 'asc' },
      }),
    ]);

    const receitaDia = lancamentos
      .filter(l => l.tipo === 'RECEITA')
      .reduce((sum, l) => sum + l.valor, 0);
    const despesaDia = lancamentos
      .filter(l => l.tipo === 'DESPESA')
      .reduce((sum, l) => sum + l.valor, 0);

    // Build day-by-day if range
    const diasDiff = Math.ceil((fim - inicio) / 86400000);
    const porDia = [];
    if (diasDiff > 1) {
      for (let i = 0; i < diasDiff; i++) {
        const d = new Date(inicio);
        d.setDate(d.getDate() + i);
        const dFim = new Date(d);
        dFim.setHours(23, 59, 59, 999);

        const checkinsD = checkinsNoPeriodo.filter(h => {
          const he = new Date(h.dataEntrada);
          return he >= d && he <= dFim;
        }).length;

        const checkoutsD = checkoutsNoPeriodo.filter(h => {
          const hs = new Date(h.dataSaida);
          return hs >= d && hs <= dFim;
        }).length;

        const receitaD = lancamentos
          .filter(l => { const ld = new Date(l.data); return ld >= d && ld <= dFim && l.tipo === 'RECEITA'; })
          .reduce((s, l) => s + l.valor, 0);

        porDia.push({
          data: d.toISOString().split('T')[0],
          checkins: checkinsD,
          checkouts: checkoutsD,
          receita: receitaD,
        });
      }
    }

    res.json({
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      checkins: checkinsNoPeriodo.length,
      checkouts: checkoutsNoPeriodo.length,
      hospedagensAtivas,
      receitaDia,
      despesaDia,
      saldoDia: receitaDia - despesaDia,
      checkinsDetalhes: checkinsNoPeriodo,
      checkoutsDetalhes: checkoutsNoPeriodo,
      lancamentos,
      porDia: diasDiff > 1 ? porDia : undefined,
    });
  } catch (err) {
    next(err);
  }
};

const periodo = async (req, res, next) => {
  try {
    const { dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios' });
    }

    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const [hospedagens, lancamentos, totalQuartos] = await Promise.all([
      prisma.hospedagem.findMany({
        where: {
          OR: [
            { dataEntrada: { gte: inicio, lte: fim } },
            { dataSaida: { gte: inicio, lte: fim } },
            { status: 'ATIVA', dataEntrada: { lte: fim } },
          ],
        },
        include: {
          cliente: { select: { nome: true } },
          quarto: { select: { numero: true, tipo: true, valorDiaria: true } },
          consumosExtras: true,
        },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: { data: { gte: inicio, lte: fim } },
      }),
      prisma.quarto.count(),
    ]);

    const totalHospedes = hospedagens.reduce((sum, h) => sum + h.numHospedes, 0);
    const receitaTotal = lancamentos
      .filter(l => l.tipo === 'RECEITA')
      .reduce((sum, l) => sum + l.valor, 0);
    const despesaTotal = lancamentos
      .filter(l => l.tipo === 'DESPESA')
      .reduce((sum, l) => sum + l.valor, 0);
    const hospedagensFinalizadas = hospedagens.filter(h => h.status === 'FINALIZADA');
    const ticketMedio = hospedagensFinalizadas.length > 0
      ? receitaTotal / hospedagensFinalizadas.length
      : 0;

    // Ocupação média: average daily occupancy
    const dias = Math.max(1, Math.ceil((fim - inicio) / 86400000));
    const totalDiasOcupados = hospedagens.reduce((sum, h) => {
      const entrada = new Date(Math.max(h.dataEntrada, inicio));
      const saida = h.dataSaida ? new Date(Math.min(h.dataSaida, fim)) : new Date(Math.min(fim, new Date()));
      const diasH = Math.max(0, Math.ceil((saida - entrada) / 86400000));
      return sum + diasH;
    }, 0);

    const ocupacaoMedia = totalQuartos > 0
      ? Math.round((totalDiasOcupados / (totalQuartos * dias)) * 100)
      : 0;

    res.json({
      periodo: { dataInicio: inicio.toISOString(), dataFim: fim.toISOString(), dias },
      totalHospedagens: hospedagens.length,
      totalHospedes,
      ocupacaoMedia,
      receitaTotal,
      despesaTotal,
      saldo: receitaTotal - despesaTotal,
      ticketMedio,
      hospedagens: hospedagens.map(h => ({
        id: h.id,
        cliente: h.cliente.nome,
        quarto: h.quarto.numero,
        tipo: h.quarto.tipo,
        dataEntrada: h.dataEntrada,
        dataSaida: h.dataSaida,
        status: h.status,
        valorTotal: h.valorTotal,
        numHospedes: h.numHospedes,
        consumos: h.consumosExtras.length,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const exportar = async (req, res, next) => {
  try {
    const { tipo = 'hospedagens', dataInicio, dataFim } = req.query;

    const where = {};
    if (dataInicio || dataFim) {
      const dateField = tipo === 'lancamentos' ? 'data' : 'dataEntrada';
      where[dateField] = {};
      if (dataInicio) where[dateField].gte = new Date(dataInicio);
      if (dataFim) where[dateField].lte = new Date(dataFim);
    }

    let csvContent = '';
    let filename = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;

    if (tipo === 'hospedagens') {
      const hospedagens = await prisma.hospedagem.findMany({
        where,
        include: {
          cliente: { select: { nome: true, cpf: true, telefone: true } },
          quarto: { select: { numero: true, tipo: true, valorDiaria: true } },
        },
        orderBy: { dataEntrada: 'desc' },
      });

      const headers = ['ID', 'Cliente', 'CPF', 'Telefone', 'Quarto', 'Tipo', 'Valor Diária', 'Data Entrada', 'Previsão Saída', 'Data Saída', 'Nº Hóspedes', 'Status', 'Valor Total', 'Forma Pagamento'];
      const rows = hospedagens.map(h => [
        h.id,
        `"${h.cliente.nome}"`,
        h.cliente.cpf,
        h.cliente.telefone || '',
        h.quarto.numero,
        h.quarto.tipo,
        h.quarto.valorDiaria,
        h.dataEntrada ? new Date(h.dataEntrada).toLocaleDateString('pt-BR') : '',
        h.previsaoSaida ? new Date(h.previsaoSaida).toLocaleDateString('pt-BR') : '',
        h.dataSaida ? new Date(h.dataSaida).toLocaleDateString('pt-BR') : '',
        h.numHospedes,
        h.status,
        h.valorTotal || '',
        h.formaPagamento || '',
      ]);
      csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    } else if (tipo === 'lancamentos') {
      const lancamentos = await prisma.lancamentoFinanceiro.findMany({
        where,
        orderBy: { data: 'desc' },
      });

      const headers = ['ID', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Data', 'Forma Pagamento', 'Status'];
      const rows = lancamentos.map(l => [
        l.id,
        l.tipo,
        `"${l.categoria}"`,
        `"${l.descricao}"`,
        l.valor,
        new Date(l.data).toLocaleDateString('pt-BR'),
        l.formaPagamento || '',
        l.status,
      ]);
      csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    } else if (tipo === 'clientes') {
      const clientes = await prisma.cliente.findMany({
        orderBy: { nome: 'asc' },
        select: {
          id: true, nome: true, cpf: true, rg: true, telefone: true, email: true,
          cidade: true, estado: true, ativo: true, createdAt: true,
          _count: { select: { hospedagens: true } },
        },
      });

      const headers = ['ID', 'Nome', 'CPF', 'RG', 'Telefone', 'E-mail', 'Cidade', 'Estado', 'Ativo', 'Total Hospedagens', 'Cadastrado em'];
      const rows = clientes.map(c => [
        c.id,
        `"${c.nome}"`,
        c.cpf,
        c.rg || '',
        c.telefone || '',
        c.email || '',
        c.cidade || '',
        c.estado || '',
        c.ativo ? 'Sim' : 'Não',
        c._count.hospedagens,
        new Date(c.createdAt).toLocaleDateString('pt-BR'),
      ]);
      csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    } else {
      return res.status(400).json({ error: 'Tipo inválido. Use: hospedagens, lancamentos ou clientes' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent); // BOM for Excel
  } catch (err) {
    next(err);
  }
};

module.exports = { diario, periodo, exportar };
