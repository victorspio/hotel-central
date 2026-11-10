const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getDashboard = async (req, res, next) => {
  try {
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    // Quartos status
    const [totalQuartos, quartosOcupados, quartosLimpeza, quartosManutencao] = await Promise.all([
      prisma.quarto.count(),
      prisma.quarto.count({ where: { status: 'OCUPADO' } }),
      prisma.quarto.count({ where: { status: 'LIMPEZA' } }),
      prisma.quarto.count({ where: { status: 'MANUTENCAO' } }),
    ]);
    const quartosLivres = totalQuartos - quartosOcupados - quartosLimpeza - quartosManutencao;
    const taxaOcupacao = totalQuartos > 0 ? Math.round((quartosOcupados / totalQuartos) * 100) : 0;

    // Check-ins e checkouts de hoje
    const [checkinsHoje, checkoutsHoje] = await Promise.all([
      prisma.hospedagem.count({
        where: { dataEntrada: { gte: inicioDia, lte: fimDia } },
      }),
      prisma.hospedagem.count({
        where: { dataSaida: { gte: inicioDia, lte: fimDia }, status: 'FINALIZADA' },
      }),
    ]);

    // Receita hoje e mês
    const receitasHoje = await prisma.lancamentoFinanceiro.aggregate({
      where: { tipo: 'RECEITA', data: { gte: inicioDia, lte: fimDia } },
      _sum: { valor: true },
    });
    const receitasMes = await prisma.lancamentoFinanceiro.aggregate({
      where: { tipo: 'RECEITA', data: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
    });

    const receitaHoje = receitasHoje._sum.valor || 0;
    const receitaMes = receitasMes._sum.valor || 0;

    // Próximos checkouts (previsão)
    const proximosCheckouts = await prisma.hospedagem.findMany({
      where: {
        status: 'ATIVA',
        previsaoSaida: { gte: hoje },
      },
      orderBy: { previsaoSaida: 'asc' },
      take: 5,
      include: {
        cliente: { select: { nome: true } },
        quarto: { select: { numero: true, predio: true, tipo: true } },
      },
    });

    // Últimas hospedagens
    const ultimasHospedagens = await prisma.hospedagem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        cliente: { select: { nome: true } },
        quarto: { select: { numero: true, predio: true, tipo: true } },
      },
    });

    // Ocupação últimos 30 dias
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 29);
    trintaDiasAtras.setHours(0, 0, 0, 0);

    const hospedagensRecentes = await prisma.hospedagem.findMany({
      where: {
        OR: [
          { status: 'ATIVA' },
          { dataSaida: { gte: trintaDiasAtras } },
          { dataEntrada: { gte: trintaDiasAtras } },
        ],
      },
      select: { dataEntrada: true, dataSaida: true, status: true, quartoId: true },
    });

    const ocupacaoUltimos30Dias = [];
    for (let i = 29; i >= 0; i--) {
      const dia = new Date();
      dia.setDate(dia.getDate() - i);
      dia.setHours(0, 0, 0, 0);
      const diaFim = new Date(dia);
      diaFim.setHours(23, 59, 59);

      const ocupados = hospedagensRecentes.filter(h => {
        const entrada = new Date(h.dataEntrada);
        const saida = h.dataSaida ? new Date(h.dataSaida) : new Date();
        return entrada <= diaFim && saida >= dia;
      }).length;

      ocupacaoUltimos30Dias.push({
        data: dia.toISOString().split('T')[0],
        ocupados,
        total: totalQuartos,
      });
    }

    // Receita mensal últimos 12 meses
    const dozeAtras = new Date();
    dozeAtras.setMonth(dozeAtras.getMonth() - 11);
    dozeAtras.setDate(1);
    dozeAtras.setHours(0, 0, 0, 0);

    const lancamentosAnuais = await prisma.lancamentoFinanceiro.findMany({
      where: { data: { gte: dozeAtras } },
      select: { tipo: true, valor: true, data: true },
    });

    const receitaMensal = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mes = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });

      const lancamentosDoMes = lancamentosAnuais.filter(l => {
        const ld = new Date(l.data);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      });

      const receita = lancamentosDoMes.filter(l => l.tipo === 'RECEITA').reduce((sum, l) => sum + l.valor, 0);
      const despesa = lancamentosDoMes.filter(l => l.tipo === 'DESPESA').reduce((sum, l) => sum + l.valor, 0);

      receitaMensal.push({ mes: mesKey, mesLabel: mes, receita, despesa });
    }

    const resumo = {
      taxaOcupacao,
      quartosLivres,
      quartosOcupados,
      quartosLimpeza,
      quartosManutencao,
      totalQuartos,
      checkinsHoje,
      checkoutsHoje,
      receitaHoje,
      receitaMes,
    };

    res.json({
      ...resumo,
      resumo,
      taxaOcupacao,
      quartosLivres,
      quartosOcupados,
      quartosLimpeza,
      quartosManutencao,
      totalQuartos,
      checkinsHoje,
      checkoutsHoje,
      receitaHoje,
      receitaMes,
      proximasSaidas: proximosCheckouts,
      proximosCheckouts,
      ultimasHospedagens,
      ocupacaoUltimos30Dias,
      fluxoCaixa: receitaMensal,
      receitaMensal,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
