require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ─── LIMPAR TABELAS ────────────────────────────────────────────────────────
  console.log('🗑️  Limpando tabelas...');
  await prisma.lancamentoFinanceiro.deleteMany();
  await prisma.consumoExtra.deleteMany();
  await prisma.hospedagem.deleteMany();
  await prisma.quarto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.user.deleteMany();
  console.log('   Tabelas limpas.\n');

  // ─── USUÁRIOS ─────────────────────────────────────────────────────────────
  console.log('👤 Criando usuários...');
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const senhaRecepcao = await bcrypt.hash('recepcao123', 10);

  const admin = await prisma.user.create({
    data: { nome: 'Administrador', email: 'admin@hotel.com', senha: senhaAdmin, perfil: 'ADMIN' },
  });
  const recepcao = await prisma.user.create({
    data: { nome: 'Recepcionista', email: 'recepcao@hotel.com', senha: senhaRecepcao, perfil: 'RECEPCIONISTA' },
  });
  console.log(`   ✅ ${admin.nome} (${admin.email})`);
  console.log(`   ✅ ${recepcao.nome} (${recepcao.email})\n`);

  // ─── QUARTOS ──────────────────────────────────────────────────────────────
  console.log('🛏️  Criando quartos...');
  const quartosData = [
    // Prédio Central - Andar 1
    { numero: '101', predio: 'CENTRAL', tipo: 'SOLTEIRO', capacidade: 1, valorDiaria: 150, andar: 1, status: 'LIVRE', descricao: 'Quarto solteiro padrão com ar-condicionado e frigobar' },
    { numero: '102', predio: 'CENTRAL', tipo: 'SOLTEIRO', capacidade: 1, valorDiaria: 150, andar: 1, status: 'LIMPEZA', descricao: 'Quarto solteiro padrão com vista para o jardim' },
    { numero: '103', predio: 'CENTRAL', tipo: 'CASAL', capacidade: 2, valorDiaria: 220, andar: 1, status: 'OCUPADO', descricao: 'Quarto casal com cama queen size e banheira' },
    { numero: '104', predio: 'CENTRAL', tipo: 'CASAL', capacidade: 2, valorDiaria: 220, andar: 1, status: 'LIVRE', descricao: 'Quarto casal padrão com TV 42"' },
    // Prédio Central - Andar 2
    { numero: '201', predio: 'CENTRAL', tipo: 'SOLTEIRO', capacidade: 1, valorDiaria: 160, andar: 2, status: 'OCUPADO', descricao: 'Quarto solteiro superior com varanda' },
    { numero: '202', predio: 'CENTRAL', tipo: 'CASAL', capacidade: 2, valorDiaria: 240, andar: 2, status: 'LIVRE', descricao: 'Quarto casal superior com vista para a piscina' },
    { numero: '203', predio: 'CENTRAL', tipo: 'SUITE', capacidade: 2, valorDiaria: 380, andar: 2, status: 'OCUPADO', descricao: 'Suíte luxo com sala de estar e jacuzzi' },
    { numero: '204', predio: 'CENTRAL', tipo: 'SUITE', capacidade: 2, valorDiaria: 380, andar: 2, status: 'LIVRE', descricao: 'Suíte premium com vista panorâmica' },
    // Prédio Central - Andar 3
    { numero: '301', predio: 'CENTRAL', tipo: 'FAMILIA', capacidade: 4, valorDiaria: 320, andar: 3, status: 'LIVRE', descricao: 'Quarto família com 2 camas de casal' },
    { numero: '302', predio: 'CENTRAL', tipo: 'FAMILIA', capacidade: 4, valorDiaria: 320, andar: 3, status: 'OCUPADO', descricao: 'Quarto família espaçoso com área de lazer' },
    { numero: '303', predio: 'CENTRAL', tipo: 'CASAL', capacidade: 2, valorDiaria: 230, andar: 3, status: 'MANUTENCAO', descricao: 'Quarto casal - Em manutenção (ar-condicionado)' },
    { numero: '304', predio: 'CENTRAL', tipo: 'SUITE', capacidade: 3, valorDiaria: 420, andar: 3, status: 'LIVRE', descricao: 'Suíte presidencial com vista 360°' },
    // Prédio Anexo - Andar 1
    { numero: '101', predio: 'ANEXO', tipo: 'SOLTEIRO', capacidade: 1, valorDiaria: 130, andar: 1, status: 'LIVRE', descricao: 'Quarto solteiro Anexo' },
    { numero: '102', predio: 'ANEXO', tipo: 'CASAL', capacidade: 2, valorDiaria: 190, andar: 1, status: 'LIVRE', descricao: 'Quarto casal Anexo aconchegante' },
    { numero: '103', predio: 'ANEXO', tipo: 'CASAL', capacidade: 2, valorDiaria: 190, andar: 1, status: 'LIVRE', descricao: 'Quarto casal Anexo' },
    // Prédio Anexo - Andar 2
    { numero: '201', predio: 'ANEXO', tipo: 'CASAL', capacidade: 2, valorDiaria: 200, andar: 2, status: 'LIVRE', descricao: 'Quarto casal Anexo superior' },
    { numero: '202', predio: 'ANEXO', tipo: 'SUITE', capacidade: 2, valorDiaria: 280, andar: 2, status: 'LIVRE', descricao: 'Suíte Anexo com varanda' },
    { numero: '203', predio: 'ANEXO', tipo: 'FAMILIA', capacidade: 4, valorDiaria: 300, andar: 2, status: 'LIVRE', descricao: 'Quarto família Anexo' },
  ];

  const quartos = [];
  for (const q of quartosData) {
    const quarto = await prisma.quarto.create({ data: q });
    quartos.push(quarto);
    console.log(`   ✅ Quarto ${quarto.numero} - ${quarto.tipo} - R$${quarto.valorDiaria}/dia - ${quarto.status}`);
  }
  console.log();

  // ─── CLIENTES ─────────────────────────────────────────────────────────────
  console.log('👥 Criando clientes...');
  const clientesData = [
    { nome: 'Carlos Eduardo Souza', cpf: '12345678901', rg: '1234567', dataNascimento: new Date('1985-03-15'), telefone: '11987654321', email: 'carlos.souza@email.com', logradouro: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', cep: '01310100' },
    { nome: 'Maria Fernanda Costa', cpf: '23456789012', rg: '2345678', dataNascimento: new Date('1990-07-22'), telefone: '21976543210', email: 'maria.costa@email.com', logradouro: 'Av. Copacabana', numero: '456', bairro: 'Copacabana', cidade: 'Rio de Janeiro', estado: 'RJ', cep: '22020001' },
    { nome: 'João Paulo Almeida', cpf: '34567890123', rg: '3456789', dataNascimento: new Date('1978-11-30'), telefone: '31965432109', email: 'joao.almeida@email.com', logradouro: 'Rua da Liberdade', numero: '789', bairro: 'Savassi', cidade: 'Belo Horizonte', estado: 'MG', cep: '30112000' },
    { nome: 'Ana Lídia Rodrigues', cpf: '45678901234', rg: '4567890', dataNascimento: new Date('1992-05-18'), telefone: '41954321098', email: 'ana.rodrigues@email.com', logradouro: 'Av. Batel', numero: '321', bairro: 'Batel', cidade: 'Curitiba', estado: 'PR', cep: '80420090' },
    { nome: 'Roberto Henrique Lima', cpf: '56789012345', rg: '5678901', dataNascimento: new Date('1980-09-05'), telefone: '51943210987', email: 'roberto.lima@email.com', logradouro: 'Rua dos Andradas', numero: '654', bairro: 'Centro Histórico', cidade: 'Porto Alegre', estado: 'RS', cep: '90020005' },
    { nome: 'Juliana Pereira Santos', cpf: '67890123456', rg: '6789012', dataNascimento: new Date('1988-02-14'), telefone: '62932109876', email: 'juliana.santos@email.com', logradouro: 'Av. Goiás', numero: '987', bairro: 'Setor Central', cidade: 'Goiânia', estado: 'GO', cep: '74015010' },
    { nome: 'Marcos Antônio Ferreira', cpf: '78901234567', rg: '7890123', dataNascimento: new Date('1975-12-08'), telefone: '71921098765', email: 'marcos.ferreira@email.com', logradouro: 'Av. Sete de Setembro', numero: '147', bairro: 'Pituba', cidade: 'Salvador', estado: 'BA', cep: '41830005' },
    { nome: 'Camila Vitória Nascimento', cpf: '89012345678', rg: '8901234', dataNascimento: new Date('1995-06-25'), telefone: '85910987654', email: 'camila.nascimento@email.com', logradouro: 'Rua Clarindo de Queiroz', numero: '258', bairro: 'Centro', cidade: 'Fortaleza', estado: 'CE', cep: '60030060' },
    { nome: 'Fernando Augusto Cavalcanti', cpf: '90123456789', rg: '9012345', dataNascimento: new Date('1983-04-19'), telefone: '81900876543', email: 'fernando.cavalcanti@email.com', logradouro: 'Av. Conselheiro Aguiar', numero: '369', bairro: 'Boa Viagem', cidade: 'Recife', estado: 'PE', cep: '51011000' },
    { nome: 'Larissa Beatriz Oliveira', cpf: '01234567890', rg: '0123456', dataNascimento: new Date('1997-08-12'), telefone: '92899765432', email: 'larissa.oliveira@email.com', logradouro: 'Rua Ramos Ferreira', numero: '741', bairro: 'Centro', cidade: 'Manaus', estado: 'AM', cep: '69010020' },
    { nome: 'Alexandre Dias Monteiro', cpf: '11223344556', rg: '1122334', dataNascimento: new Date('1972-01-30'), telefone: '61888654321', email: 'alexandre.monteiro@email.com', logradouro: 'SQN 302 Bloco K', numero: '12', bairro: 'Asa Norte', cidade: 'Brasília', estado: 'DF', cep: '70736110' },
    { nome: 'Patrícia Mendes Cardoso', cpf: '22334455667', rg: '2233445', dataNascimento: new Date('1986-10-07'), telefone: '48877543210', email: 'patricia.cardoso@email.com', logradouro: 'Rua Felipe Schmidt', numero: '852', bairro: 'Centro', cidade: 'Florianópolis', estado: 'SC', cep: '88010001' },
    { nome: 'Gabriel Henrique Barbosa', cpf: '33445566778', rg: '3344556', dataNascimento: new Date('1993-03-24'), telefone: '27866432109', email: 'gabriel.barbosa@email.com', logradouro: 'Av. Nossa Senhora da Penha', numero: '963', bairro: 'Praia do Canto', cidade: 'Vitória', estado: 'ES', cep: '29055110' },
    { nome: 'Isabela Cruz Teixeira', cpf: '44556677889', rg: '4455667', dataNascimento: new Date('1991-07-16'), telefone: '79855321098', email: 'isabela.teixeira@email.com', logradouro: 'Av. Ivo do Prado', numero: '174', bairro: 'Centro', cidade: 'Aracaju', estado: 'SE', cep: '49015050' },
    { nome: 'Ricardo Lopes Vieira', cpf: '55667788990', rg: '5566778', dataNascimento: new Date('1979-11-03'), telefone: '98844210987', email: 'ricardo.vieira@email.com', logradouro: 'Rua do Giz', numero: '285', bairro: 'Centro', cidade: 'São Luís', estado: 'MA', cep: '65015030' },
  ];

  const clientes = [];
  for (const c of clientesData) {
    const cliente = await prisma.cliente.create({ data: c });
    clientes.push(cliente);
    console.log(`   ✅ ${cliente.nome} - CPF: ${cliente.cpf}`);
  }
  console.log();

  // ─── HOSPEDAGENS ──────────────────────────────────────────────────────────
  console.log('🏨 Criando hospedagens...');

  // Helper to get quarto by numero
  const getQuarto = (numero, predio = 'CENTRAL') => quartos.find(q => q.numero === numero && q.predio === predio) || quartos.find(q => q.numero === numero);
  const getCliente = (index) => clientes[index];

  const hoje = new Date();
  const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const diasFrente = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

  // HOSPEDAGENS ATIVAS (quartos já marcados como OCUPADO no seed de quartos)
  const hospedagensAtivas = [
    {
      clienteId: getCliente(0).id,
      quartoId: getQuarto('103').id,
      dataEntrada: diasAtras(2),
      previsaoSaida: diasFrente(3),
      numHospedes: 2,
      status: 'ATIVA',
      observacoes: 'Lua de mel',
    },
    {
      clienteId: getCliente(2).id,
      quartoId: getQuarto('201').id,
      dataEntrada: diasAtras(1),
      previsaoSaida: diasFrente(2),
      numHospedes: 1,
      status: 'ATIVA',
      observacoes: 'Viagem de negócios',
    },
    {
      clienteId: getCliente(4).id,
      quartoId: getQuarto('203').id,
      dataEntrada: diasAtras(3),
      previsaoSaida: diasFrente(4),
      numHospedes: 2,
      status: 'ATIVA',
      observacoes: 'Suíte para aniversário',
    },
    {
      clienteId: getCliente(6).id,
      quartoId: getQuarto('302').id,
      dataEntrada: hoje,
      previsaoSaida: diasFrente(5),
      numHospedes: 4,
      status: 'ATIVA',
      observacoes: 'Família em férias',
    },
    {
      clienteId: getCliente(8).id,
      quartoId: getQuarto('304').id,
      dataEntrada: diasAtras(1),
      previsaoSaida: diasFrente(6),
      numHospedes: 3,
      status: 'ATIVA',
      observacoes: 'Suíte presidencial para família',
    },
  ];

  // HOSPEDAGENS FINALIZADAS (histórico)
  const hospedagensFinalizadas = [
    {
      clienteId: getCliente(1).id,
      quartoId: getQuarto('101').id,
      dataEntrada: diasAtras(20),
      previsaoSaida: diasAtras(16),
      dataSaida: diasAtras(16),
      numHospedes: 1,
      status: 'FINALIZADA',
      valorTotal: 600,
      formaPagamento: 'CARTAO_CREDITO',
    },
    {
      clienteId: getCliente(3).id,
      quartoId: getQuarto('202').id,
      dataEntrada: diasAtras(15),
      previsaoSaida: diasAtras(10),
      dataSaida: diasAtras(10),
      numHospedes: 2,
      status: 'FINALIZADA',
      valorTotal: 1200,
      formaPagamento: 'PIX',
    },
    {
      clienteId: getCliente(5).id,
      quartoId: getQuarto('304').id,
      dataEntrada: diasAtras(30),
      previsaoSaida: diasAtras(25),
      dataSaida: diasAtras(25),
      numHospedes: 2,
      status: 'FINALIZADA',
      valorTotal: 2100,
      formaPagamento: 'CARTAO_DEBITO',
    },
    {
      clienteId: getCliente(7).id,
      quartoId: getQuarto('104').id,
      dataEntrada: diasAtras(10),
      previsaoSaida: diasAtras(7),
      dataSaida: diasAtras(7),
      numHospedes: 2,
      status: 'FINALIZADA',
      valorTotal: 660,
      formaPagamento: 'DINHEIRO',
    },
    {
      clienteId: getCliente(9).id,
      quartoId: getQuarto('301').id,
      dataEntrada: diasAtras(45),
      previsaoSaida: diasAtras(38),
      dataSaida: diasAtras(38),
      numHospedes: 3,
      status: 'FINALIZADA',
      valorTotal: 2240,
      formaPagamento: 'PIX',
    },
  ];

  const todasHospedagens = [...hospedagensAtivas, ...hospedagensFinalizadas];
  const hospedagens = [];

  for (const h of todasHospedagens) {
    const hospedagem = await prisma.hospedagem.create({ data: h });
    hospedagens.push(hospedagem);
    const cliente = clientes.find(c => c.id === hospedagem.clienteId);
    const quarto = quartos.find(q => q.id === hospedagem.quartoId);
    console.log(`   ✅ ${cliente.nome} → Quarto ${quarto.numero} [${hospedagem.status}]`);
  }
  console.log();

  // ─── CONSUMOS EXTRAS ──────────────────────────────────────────────────────
  console.log('🧾 Criando consumos extras...');
  const consumosData = [
    // Hospedagem 1 (ativa - quarto 103)
    { hospedagemId: hospedagens[0].id, descricao: 'Minibar - refrigerante e cerveja', categoria: 'FRIGOBRAR', valor: 45.00, data: diasAtras(1) },
    { hospedagemId: hospedagens[0].id, descricao: 'Jantar romântico no restaurante', categoria: 'RESTAURANTE', valor: 180.00, data: diasAtras(1) },
    { hospedagemId: hospedagens[0].id, descricao: 'Lavanderia - 3 peças', categoria: 'LAVANDERIA', valor: 60.00, data: hoje },
    // Hospedagem 2 (ativa - quarto 201)
    { hospedagemId: hospedagens[1].id, descricao: 'Minibar - água e suco', categoria: 'FRIGOBRAR', valor: 20.00, data: diasAtras(1) },
    { hospedagemId: hospedagens[1].id, descricao: 'Almoço executivo', categoria: 'RESTAURANTE', valor: 65.00, data: hoje },
    // Hospedagem 3 (ativa - quarto 203)
    { hospedagemId: hospedagens[2].id, descricao: 'Champagne e frutas', categoria: 'FRIGOBRAR', valor: 120.00, data: diasAtras(2) },
    { hospedagemId: hospedagens[2].id, descricao: 'Jantar especial aniversário', categoria: 'RESTAURANTE', valor: 320.00, data: diasAtras(1) },
    { hospedagemId: hospedagens[2].id, descricao: 'Lavanderia - 5 peças', categoria: 'LAVANDERIA', valor: 90.00, data: hoje },
    { hospedagemId: hospedagens[2].id, descricao: 'Ligação telefônica interurbana', categoria: 'TELEFONE', valor: 25.00, data: hoje },
    // Hospedagem 4 (ativa - quarto 302)
    { hospedagemId: hospedagens[3].id, descricao: 'Café da manhã extra para 4 pessoas', categoria: 'RESTAURANTE', valor: 160.00, data: hoje },
    { hospedagemId: hospedagens[3].id, descricao: 'Minibar - refrigerantes e snacks', categoria: 'FRIGOBRAR', valor: 85.00, data: hoje },
    // Hospedagem finalizada (quarto 101)
    { hospedagemId: hospedagens[5].id, descricao: 'Minibar', categoria: 'FRIGOBRAR', valor: 35.00, data: diasAtras(18) },
    // Hospedagem finalizada (quarto 202)
    { hospedagemId: hospedagens[6].id, descricao: 'Restaurante - 2 jantares', categoria: 'RESTAURANTE', valor: 240.00, data: diasAtras(12) },
  ];

  for (const c of consumosData) {
    const consumo = await prisma.consumoExtra.create({ data: c });
    console.log(`   ✅ Consumo: ${consumo.descricao} - R$${consumo.valor}`);
  }
  console.log();

  // ─── LANÇAMENTOS FINANCEIROS ──────────────────────────────────────────────
  console.log('💰 Criando lançamentos financeiros...');

  const lancamentosData = [
    // Receitas de hospedagens finalizadas
    { tipo: 'RECEITA', categoria: 'Hospedagem', descricao: 'Checkout - Maria Fernanda Costa - Quarto 101', valor: 600.00, data: diasAtras(16), formaPagamento: 'CARTAO_CREDITO', status: 'PAGO', hospedagemId: hospedagens[5].id },
    { tipo: 'RECEITA', categoria: 'Hospedagem', descricao: 'Checkout - Ana Lídia Rodrigues - Quarto 202', valor: 1200.00, data: diasAtras(10), formaPagamento: 'PIX', status: 'PAGO', hospedagemId: hospedagens[6].id },
    { tipo: 'RECEITA', categoria: 'Hospedagem', descricao: 'Checkout - Juliana Pereira Santos - Quarto 304', valor: 2100.00, data: diasAtras(25), formaPagamento: 'CARTAO_DEBITO', status: 'PAGO', hospedagemId: hospedagens[7].id },
    { tipo: 'RECEITA', categoria: 'Hospedagem', descricao: 'Checkout - Camila Vitória Nascimento - Quarto 104', valor: 660.00, data: diasAtras(7), formaPagamento: 'DINHEIRO', status: 'PAGO', hospedagemId: hospedagens[8].id },
    { tipo: 'RECEITA', categoria: 'Hospedagem', descricao: 'Checkout - Larissa Beatriz Oliveira - Quarto 301', valor: 2240.00, data: diasAtras(38), formaPagamento: 'PIX', status: 'PAGO', hospedagemId: hospedagens[9].id },
    // Receitas extras
    { tipo: 'RECEITA', categoria: 'Eventos', descricao: 'Aluguel do salão de eventos - Casamento Silva', valor: 3500.00, data: diasAtras(5), formaPagamento: 'PIX', status: 'PAGO' },
    { tipo: 'RECEITA', categoria: 'Restaurante', descricao: 'Receita restaurante - Outubro semana 1', valor: 4200.00, data: diasAtras(35), formaPagamento: 'CARTAO_CREDITO', status: 'PAGO' },
    { tipo: 'RECEITA', categoria: 'Estacionamento', descricao: 'Receita estacionamento - Outubro', valor: 850.00, data: diasAtras(31), formaPagamento: 'DINHEIRO', status: 'PAGO' },
    { tipo: 'RECEITA', categoria: 'Lavanderia', descricao: 'Receita lavanderia - Outubro', valor: 320.00, data: diasAtras(28), formaPagamento: 'PIX', status: 'PAGO' },
    { tipo: 'RECEITA', categoria: 'Restaurante', descricao: 'Receita restaurante - Novembro semana 1', valor: 3800.00, data: diasAtras(7), formaPagamento: 'CARTAO_CREDITO', status: 'PAGO' },
    // Despesas mensais
    { tipo: 'DESPESA', categoria: 'Energia Elétrica', descricao: 'Conta de energia elétrica - Outubro/2026', valor: 4800.00, data: diasAtras(31), formaPagamento: 'DEBITO_AUTOMATICO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Água e Esgoto', descricao: 'Conta de água e esgoto - Outubro/2026', valor: 1200.00, data: diasAtras(28), formaPagamento: 'DEBITO_AUTOMATICO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Folha de Pagamento', descricao: 'Folha de pagamento - Outubro/2026', valor: 18500.00, data: diasAtras(31), formaPagamento: 'TRANSFERENCIA', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Manutenção', descricao: 'Manutenção ar-condicionado quarto 303', valor: 650.00, data: diasAtras(5), formaPagamento: 'PIX', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Limpeza', descricao: 'Produtos de limpeza e higienização', valor: 980.00, data: diasAtras(14), formaPagamento: 'BOLETO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Alimentação', descricao: 'Compras para restaurante e café da manhã', valor: 6200.00, data: diasAtras(7), formaPagamento: 'CARTAO_CREDITO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Internet e Telefone', descricao: 'Fatura internet e telefonia corporativa', valor: 450.00, data: diasAtras(5), formaPagamento: 'DEBITO_AUTOMATICO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Seguros', descricao: 'Seguro predial e responsabilidade civil', valor: 2100.00, data: diasAtras(60), formaPagamento: 'BOLETO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Marketing', descricao: 'Anúncios online e materiais gráficos', valor: 1800.00, data: diasAtras(15), formaPagamento: 'CARTAO_CREDITO', status: 'PAGO' },
    { tipo: 'DESPESA', categoria: 'Energia Elétrica', descricao: 'Conta de energia elétrica - Novembro/2026', valor: 5100.00, data: diasAtras(1), formaPagamento: 'DEBITO_AUTOMATICO', status: 'PENDENTE' },
    { tipo: 'DESPESA', categoria: 'Folha de Pagamento', descricao: 'Folha de pagamento - Novembro/2026', valor: 18500.00, data: hoje, formaPagamento: 'TRANSFERENCIA', status: 'PENDENTE' },
    { tipo: 'DESPESA', categoria: 'Manutenção', descricao: 'Reforma banheiros andar 2 (orçamento aprovado)', valor: 12000.00, data: diasFrente(5), formaPagamento: 'BOLETO', status: 'PENDENTE' },
  ];

  for (const l of lancamentosData) {
    const lancamento = await prisma.lancamentoFinanceiro.create({ data: l });
    console.log(`   ✅ [${lancamento.tipo}] ${lancamento.categoria}: R$${lancamento.valor}`);
  }
  console.log();

  console.log('✅ Seed concluído com sucesso!\n');
  console.log('📊 Resumo:');
  console.log(`   - Usuários: 2`);
  console.log(`   - Quartos: ${quartos.length}`);
  console.log(`   - Clientes: ${clientes.length}`);
  console.log(`   - Hospedagens: ${hospedagens.length} (${hospedagensAtivas.length} ativas, ${hospedagensFinalizadas.length} finalizadas)`);
  console.log(`   - Consumos extras: ${consumosData.length}`);
  console.log(`   - Lançamentos financeiros: ${lancamentosData.length}`);
  console.log('\n🔑 Credenciais de acesso:');
  console.log('   Admin:       admin@hotel.com / admin123');
  console.log('   Recepção:    recepcao@hotel.com / recepcao123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
