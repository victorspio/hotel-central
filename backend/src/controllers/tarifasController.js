const prisma = require('../lib/prisma');

function parseTarifa(tarifa) {
  if (!tarifa) return null;
  let valoresPorPessoa = {};
  let opcoesValores = [];
  let descricaoTexto = tarifa.descricao || '';

  if (tarifa.descricao) {
    const trimmed = tarifa.descricao.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          if (parsed.valoresPorPessoa) {
            valoresPorPessoa = parsed.valoresPorPessoa;
            descricaoTexto = parsed.texto || '';
          } else {
            valoresPorPessoa = parsed;
          }
          if (Array.isArray(parsed.opcoesValores)) {
            opcoesValores = parsed.opcoesValores;
          }
        }
      } catch {
        // keep as string
      }
    }
  }

  // Para o Esquema, se não houver opções cadastradas, o padrão é 30 e 50 reais
  if (tarifa.tipo === 'ESQUEMA' && opcoesValores.length === 0) {
    opcoesValores = [30, 50];
  }

  // If no specific values configured yet, but valorPorPessoa > 0:
  if (Object.keys(valoresPorPessoa).length === 0 && tarifa.valorPorPessoa > 0) {
    valoresPorPessoa = { '1': tarifa.valorPorPessoa };
  }

  return {
    ...tarifa,
    descricaoTexto,
    valoresPorPessoa,
    opcoesValores,
  };
}

function getDiariaTarifa(tarifa, numHospedes = 1, fallbackValor = 0) {
  if (!tarifa) return (Number(fallbackValor) || 0) * (Number(numHospedes) || 1);

  const parsed = parseTarifa(tarifa);
  if (tarifa.tipo === 'ESQUEMA') {
    const opcoes = parsed?.opcoesValores || [30, 50];
    return Number(opcoes[0]) || 30;
  }

  const n = Number(numHospedes) || 1;
  const valores = parsed?.valoresPorPessoa || {};

  if (valores[n] !== undefined && valores[n] !== null && String(valores[n]).trim() !== '' && Number(valores[n]) > 0) {
    return Number(valores[n]);
  }

  // If specific guest count is not configured, check if 1 guest is configured
  if (valores['1'] && Number(valores['1']) > 0) {
    // If n > 1, check if the closest lower count exists
    for (let i = n - 1; i >= 1; i--) {
      if (valores[i] && Number(valores[i]) > 0) {
        return Number(valores[i]) + ((n - i) * (Number(valores['1']) * 0.5));
      }
    }
    return Number(valores['1']) * n;
  }

  const base = tarifa.valorPorPessoa || fallbackValor || 0;
  return Number(base) * n;
}

// GET /api/tarifas - listar todas
const listar = async (req, res, next) => {
  try {
    const { predio } = req.query;
    const where = {};
    if (predio) where.predio = predio.toUpperCase();

    const tarifas = await prisma.tarifaQuarto.findMany({
      where,
      orderBy: [{ predio: 'asc' }, { tipo: 'asc' }],
    });
    res.json(tarifas.map(parseTarifa));
  } catch (err) {
    next(err);
  }
};

// PUT /api/tarifas/:id - atualizar ou criar tarifa
const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { valorPorPessoa, valoresPorPessoa, opcoesValores, nome, descricao, ativo, tipo, predio } = req.body;

    let tarifa = null;
    const numId = Number(id);
    if (!isNaN(numId) && numId > 0) {
      tarifa = await prisma.tarifaQuarto.findUnique({ where: { id: numId } });
    }

    const predioNormalizado = (predio || req.query.predio || (tarifa?.predio) || 'CENTRAL').toUpperCase() === 'ANEXO' ? 'ANEXO' : 'CENTRAL';
    const tipoNormalizado = (tipo || req.query.tipo || (tarifa?.tipo) || 'SIMPLES_SEM_AR').toUpperCase();

    if (!tarifa) {
      tarifa = await prisma.tarifaQuarto.findFirst({
        where: { tipo: tipoNormalizado, predio: predioNormalizado },
      });
    }

    let newValorPorPessoa = valorPorPessoa;
    let newDescricao = descricao !== undefined ? descricao : (tarifa?.descricao || '');

    if (opcoesValores && Array.isArray(opcoesValores)) {
      const cleanOpcoes = opcoesValores
        .map((v) => Number(String(v).replace(',', '.')))
        .filter((v) => !isNaN(v) && v > 0);
      newValorPorPessoa = cleanOpcoes[0] || (tarifa?.valorPorPessoa || 30);

      const texto = typeof descricao === 'string' && !descricao.trim().startsWith('{')
        ? descricao
        : (parseTarifa(tarifa)?.descricaoTexto || nome || `${predioNormalizado === 'ANEXO' ? 'Anexo' : 'Hotel'} - ${tipoNormalizado}`);

      newDescricao = JSON.stringify({
        texto,
        opcoesValores: cleanOpcoes,
        valoresPorPessoa: { '1': newValorPorPessoa }
      });
    } else if (valoresPorPessoa && typeof valoresPorPessoa === 'object') {
      const baseValor = valoresPorPessoa['1'] !== undefined && valoresPorPessoa['1'] !== ''
        ? Number(valoresPorPessoa['1'])
        : (valorPorPessoa !== undefined ? Number(valorPorPessoa) : (tarifa?.valorPorPessoa || 0));
      newValorPorPessoa = baseValor;

      const texto = typeof descricao === 'string' && !descricao.trim().startsWith('{')
        ? descricao
        : (parseTarifa(tarifa)?.descricaoTexto || nome || `${predioNormalizado === 'ANEXO' ? 'Anexo' : 'Hotel'} - ${tipoNormalizado}`);

      newDescricao = JSON.stringify({
        texto,
        valoresPorPessoa,
      });
    } else if (newValorPorPessoa === undefined || newValorPorPessoa === null) {
      return res.status(400).json({ error: 'valorPorPessoa ou valoresPorPessoa é obrigatório' });
    }

    let result;
    if (tarifa) {
      result = await prisma.tarifaQuarto.update({
        where: { id: tarifa.id },
        data: {
          valorPorPessoa: Number(newValorPorPessoa) || 0,
          nome: nome || tarifa.nome,
          descricao: newDescricao,
          ativo: ativo !== undefined ? Boolean(ativo) : tarifa.ativo,
        },
      });
    } else {
      result = await prisma.tarifaQuarto.create({
        data: {
          tipo: tipoNormalizado,
          predio: predioNormalizado,
          nome: nome || `${predioNormalizado === 'ANEXO' ? 'Anexo' : 'Hotel'} - ${tipoNormalizado}`,
          valorPorPessoa: Number(newValorPorPessoa) || 0,
          descricao: newDescricao,
          ativo: ativo !== undefined ? Boolean(ativo) : true,
        },
      });
    }

    res.json(parseTarifa(result));
  } catch (err) {
    next(err);
  }
};

// GET /api/tarifas/por-tipo/:tipo - buscar tarifa por tipo e prédio
const buscarPorTipo = async (req, res, next) => {
  try {
    const { tipo } = req.params;
    const { predio = 'CENTRAL' } = req.query;
    const predioNormalizado = predio.toUpperCase() === 'ANEXO' ? 'ANEXO' : 'CENTRAL';
    const tarifa = await prisma.tarifaQuarto.findFirst({
      where: { tipo, predio: predioNormalizado },
    });
    if (!tarifa) return res.status(404).json({ error: 'Tarifa não encontrada' });
    res.json(parseTarifa(tarifa));
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, atualizar, buscarPorTipo, parseTarifa, getDiariaTarifa };
