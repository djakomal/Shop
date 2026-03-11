const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  agent_id: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  // Dénormalisation : nom agent au moment de la vente
  agent_name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  total_amount: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    false,
    defaultValue: 0,
  },
  // VARCHAR à la place d'ENUM pour éviter les problèmes ALTER TABLE
  payment_method: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'cash',
    validate: {
      isIn: {
        args: [['cash', 'mobile_money', 'credit']],
        msg:  'Méthode de paiement invalide',
      },
    },
  },
  status: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'completed',
    validate: {
      isIn: {
        args: [['completed', 'pending', 'cancelled']],
        msg:  'Statut invalide',
      },
    },
  },
  notes: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  'sales',
  timestamps: true,
  underscored: true,
});

module.exports = Sale;
