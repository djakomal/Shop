const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  product_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  product_name: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  agent_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  agent_name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  // VARCHAR au lieu d'ENUM pour éviter les problèmes ALTER TABLE
  type: {
    type:      DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: {
        args: [['in', 'out', 'adjustment', 'loss']],
        msg:  'Type de mouvement invalide',
      },
    },
  },
  quantity: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  unit: {
    type:         DataTypes.STRING(50),
    allowNull:    false,
    defaultValue: 'unité',
  },
  stock_before: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  stock_after: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName:   'stock_movements',
  timestamps:  true,
  underscored: true,
});

module.exports = StockMovement;
