require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

// Ensure DATABASE_URL is resolved to absolute path if needed
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('./')) {
  const possibleDbPaths = [
    path.join(__dirname, '../prisma/hotel.db'),
    path.join(process.cwd(), 'backend/prisma/hotel.db'),
    path.join(process.cwd(), 'prisma/hotel.db'),
  ];
  const foundDb = possibleDbPaths.find(p => fs.existsSync(p));
  if (foundDb) {
    process.env.DATABASE_URL = `file:${path.resolve(foundDb).replace(/\\/g, '/')}`;
  }
}

const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/clientes');
const quartoRoutes = require('./routes/quartos');
const hospedagemRoutes = require('./routes/hospedagens');
const financeiroRoutes = require('./routes/financeiro');
const dashboardRoutes = require('./routes/dashboard');
const relatorioRoutes = require('./routes/relatorios');
const tarifaRoutes = require('./routes/tarifas');

const app = express();

// CORS
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Normalize Netlify function URLs to standard /api path
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
  }
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/quartos', quartoRoutes);
app.use('/api/hospedagens', hospedagemRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/tarifas', tarifaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static frontend in production
const possibleDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, '../public'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), 'public'),
];

const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  console.log(`📦 Servindo arquivos do frontend a partir de: ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  res.status(status).json({ error: message, ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🏨 Hotel Central Backend rodando na porta ${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
