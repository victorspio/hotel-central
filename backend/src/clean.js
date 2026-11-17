require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('./lib/prisma');
const bcrypt = require('bcryptjs');

async function clean() {
  console.log('🧹 Limpando todos os dados do banco...');

  // Deletar respeitando chaves estrangeiras
  await prisma.consumoExtra.deleteMany();
  console.log('   ✅ Consumos extras removidos.');

  await prisma.lancamentoFinanceiro.deleteMany();
  console.log('   ✅ Lançamentos financeiros removidos.');

  await prisma.hospedagem.deleteMany();
  console.log('   ✅ Hospedagens removidas.');

  await prisma.cliente.deleteMany();
  console.log('   ✅ Clientes removidos.');

  await prisma.quarto.deleteMany();
  console.log('   ✅ Quartos removidos.');

  await prisma.tarifaQuarto.deleteMany();
  await prisma.tarifaQuarto.createMany({
    data: [
      // Hotel
      { predio: 'CENTRAL', tipo: 'SIMPLES_SEM_AR', nome: 'Hotel - Quarto Simples', valorPorPessoa: 0, descricao: 'Hotel: Quarto simples (sem ar)' },
      { predio: 'CENTRAL', tipo: 'COMPLETO', nome: 'Hotel - Quarto Completo', valorPorPessoa: 0, descricao: 'Hotel: Quarto completo' },
      { predio: 'CENTRAL', tipo: 'ESQUEMA', nome: 'Hotel - Esquema', valorPorPessoa: 30, descricao: JSON.stringify({ texto: 'Hotel: Descanso rápido (Esquema)', opcoesValores: [30, 50], valoresPorPessoa: { '1': 30 } }) },
      // Anexo
      { predio: 'ANEXO', tipo: 'COMPLETO', nome: 'Anexo - Quarto Completo', valorPorPessoa: 0, descricao: 'Anexo: Quarto completo' },
      { predio: 'ANEXO', tipo: 'SUITE_PREMIUM', nome: 'Anexo - Suíte Premium', valorPorPessoa: 0, descricao: 'Anexo: Suíte Premium' },
    ],
  });
  console.log('   ✅ Tarifas configuradas (Hotel: Simples e Completo; Anexo: Completo e Suíte Premium).');

  // Recriar os usuários padrões de login
  await prisma.user.deleteMany();
  const senhaHashAdmin = await bcrypt.hash('admin123', 10);
  const senhaHashRecepcao = await bcrypt.hash('recepcao123', 10);

  await prisma.user.create({
    data: {
      nome: 'Administrador',
      email: 'admin@hotel.com',
      senha: senhaHashAdmin,
      perfil: 'ADMIN',
      ativo: true,
    },
  });

  await prisma.user.create({
    data: {
      nome: 'Recepcionista',
      email: 'recepcao@hotel.com',
      senha: senhaHashRecepcao,
      perfil: 'RECEPCIONISTA',
      ativo: true,
    },
  });
  console.log('   ✅ Usuários de acesso padrão configurados (admin e recepcao).');

  console.log('✨ Banco de dados 100% limpo e pronto para uso!');
}

clean()
  .catch((e) => {
    console.error('Erro ao limpar banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

