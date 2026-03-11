const sequelize = require('../config/database');
const User          = require('./User.model');
const Product       = require('./Product.model');
const Sale          = require('./Sale.model');
const SaleItem      = require('./SaleItem.model');
const StockMovement = require('./StockMovement.model');

// ─── Associations ─────────────────────────────────────────────────────────────

// User ↔ Sale (un agent peut faire plusieurs ventes)
User.hasMany(Sale, { foreignKey: 'agent_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });

// Sale ↔ SaleItem (une vente a plusieurs articles)
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Product ↔ SaleItem
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'saleItems' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ StockMovement
User.hasMany(StockMovement, { foreignKey: 'agent_id', as: 'stockMovements' });
StockMovement.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });

// Product ↔ StockMovement
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

module.exports = {
  sequelize,
  User,
  Product,
  Sale,
  SaleItem,
  StockMovement,
};
