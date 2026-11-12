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
      // Hotel (Central)
      { predio: 'CENTRAL', tipo: 'SIMPLES_SEM_AR', nome: 'Hotel - Simples Sem Ar', valorPorPessoa: 0, descricao: 'Hotel: Quarto simples sem ar condicionado' },
      { predio: 'CENTRAL', tipo: 'SIMPLES_COM_AR', nome: 'Hotel - Simples Com Ar', valorPorPessoa: 0, descricao: 'Hotel: Quarto simples com ar condicionado' },
      { predio: 'CENTRAL', tipo: 'COMPLETO', nome: 'Hotel - Completo', valorPorPessoa: 0, descricao: 'Hotel: Quarto completo' },
      // Anexo
      { predio: 'ANEXO', tipo: 'SIMPLES_SEM_AR', nome: 'Anexo - Simples Sem Ar', valorPorPessoa: 0, descricao: 'Anexo: Quarto simples sem ar condicionado' },
      { predio: 'ANEXO', tipo: 'SIMPLES_COM_AR', nome: 'Anexo - Simples Com Ar', valorPorPessoa: 0, descricao: 'Anexo: Quarto simples com ar condicionado' },
      { predio: 'ANEXO', tipo: 'COMPLETO', nome: 'Anexo - Completo', valorPorPessoa: 0, descricao: 'Anexo: Quarto completo' },
    ],
  });
  console.log('   ✅ 6 Tarifas zeradas (3 para Hotel e 3 para Anexo).');

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

