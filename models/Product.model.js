const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  name: {
    type:      DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le nom du produit est obligatoire' },
    },
  },
  category: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La catégorie est obligatoire' },
    },
  },
  unit: {
    type:         DataTypes.STRING(50),
    allowNull:    false,
    defaultValue: 'unité',
  },
  purchase_price: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Le prix d\'achat ne peut pas être négatif' },
    },
  },
  selling_price: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Le prix de vente ne peut pas être négatif' },
    },
  },
  stock: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Le stock ne peut pas être négatif' },
    },
  },
  min_stock: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 5,
  },
  expiry_date: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
  },
  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type:         DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull:    false,
  },
  barcode: {
    type:      DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName:  'products',
  timestamps: true,
  underscored: true,
});

module.exports = Product;
  