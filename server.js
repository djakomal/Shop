require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const { sequelize } = require('./models');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const productRoutes   = require('./routes/product.routes');
const saleRoutes      = require('./routes/sale.routes');
const stockRoutes     = require('./routes/stock.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// ─── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173'||'https://shop-marietou.netlify.app',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/sales',     saleRoutes);
app.use('/api/stock',     stockRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── Route racine ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success:  true,
    message:  '🏪 API Boutique Alimentaire v2.0 (MySQL)',
    database: 'MySQL + Sequelize',
    endpoints: {
      auth:      '/api/auth',
      users:     '/api/users',
      products:  '/api/products',
      sales:     '/api/sales',
      stock:     '/api/stock',
      dashboard: '/api/dashboard',
    },
  });
});

// ─── Gestion des erreurs ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur globale:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// ─── Connexion MySQL & Démarrage ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Vérification des variables d'environnement critiques
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET est obligatoire. Définissez-le dans le fichier .env');
    process.exit(1);
  }

  try {
    // Tester la connexion MySQL
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL établie');

    // En développement seulement : sync avec alter
    // En production, utiliser des migrations Sequelize
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });

    } else {
      await sequelize.sync();
 
    }

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('❌ Impossible de se connecter à MySQL:', err.message);
    console.error('💡 Vérifiez vos variables d\'environnement dans le fichier .env');
    process.exit(1);
  }
};

startServer();

module.exports = app;
