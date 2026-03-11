const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  sale_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  // Dénormalisation : nom du produit au moment de la vente
  product_name: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  quantity: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'La quantité doit être au moins 1' },
    },
  },
  unit: {
    type:         DataTypes.STRING(50),
    allowNull:    false,
    defaultValue: 'unité',
  },
  unit_price: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  total: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
}, {
  tableName:   'sale_items',
  timestamps:  true,
  underscored: true,
});

module.exports = SaleItem;
