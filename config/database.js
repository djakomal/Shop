const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME    ,
  process.env.DB_USER  ,
  process.env.DB_PASSWORD ,
  {
    host:    process.env.DB_HOST ,
    port:    parseInt(process.env.DB_PORT) ,
    dialect: 'mysql',
    logging: (msg) => {
      // Log uniquement en dev et uniquement les vraies requêtes (pas les SELECT 1)
      if (process.env.NODE_ENV === 'development' && !msg.includes('SELECT 1+1')) {
        console.log('[SQL]', msg.substring(0, 200));
      }
    },
    pool: {
      max:     10,
      min:     0,
      acquire: 30000,
      idle:    10000,
    },
    define: {
      charset:     'utf8mb4',
      collate:     'utf8mb4_unicode_ci',
      underscored: true,  // snake_case en DB, camelCase en JS
      timestamps:  true,
    },
    dialectOptions: {
      charset: 'utf8mb4',
      // ✅ dateStrings: false — Sequelize gère la conversion des dates en objets Date JS
      // Ne pas mettre typeCast personnalisé : cela interfère avec la conversion Sequelize
      dateStrings: false,
    },
    timezone: '+00:00', // Stocker en UTC
  }
);

module.exports = sequelize;
