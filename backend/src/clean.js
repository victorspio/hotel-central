const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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
      { tipo: 'SIMPLES_SEM_AR', nome: 'Simples - Sem Ar Condicionado', valorPorPessoa: 0, descricao: 'Quarto simples sem ar condicionado' },
      { tipo: 'SIMPLES_COM_AR', nome: 'Simples - Com Ar Condicionado', valorPorPessoa: 0, descricao: 'Quarto simples com ar condicionado' },
      { tipo: 'COMPLETO', nome: 'Completo', valorPorPessoa: 0, descricao: 'Quarto completo com todos os recursos' },
    ],
  });
  console.log('   ✅ Tarifas zeradas (prontas para você configurar os valores).');

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

