require('dotenv').config();

const sequelize = require('../config/database');
const { User, Product, Sale, SaleItem, StockMovement } = require('../models');

async function clearDatabase() {
  try {
    await sequelize.authenticate();
    const [[{ db }]] = await sequelize.query('SELECT DATABASE() AS db');
    console.log(`Connexion DB OK · Base active: ${db}`);

    // Désactiver les contraintes de clés étrangères (MySQL)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Déterminer dynamiquement les noms de tables depuis les modèles (ordre sûr)
    const tables = [
      SaleItem.getTableName(),    // dépend de sales / products
      Sale.getTableName(),        // dépend de users
      StockMovement.getTableName(),
      Product.getTableName(),
      User.getTableName(),
    ].map(t => (typeof t === 'object' ? t.tableName : t));

    // Suppression + reset AUTO_INCREMENT pour limiter les besoins de privilèges
    for (const tableName of tables) {
      console.log(`DELETE FROM ${tableName} …`);
      await sequelize.query(`DELETE FROM \`${tableName}\``);
      console.log(`ALTER TABLE ${tableName} AUTO_INCREMENT=1 …`);
      await sequelize.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`);
    }

    // Réactiver les contraintes
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Vérification des compteurs
    console.log('Vérification des compteurs:');
    for (const tableName of tables) {
      const [[{ cnt }]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM \`${tableName}\``);
      console.log(`  ${tableName}: ${cnt} ligne(s)`);
    }

    console.log('Base de données vidée avec succès.');
  } catch (err) {
    console.error('Erreur lors du vidage de la base:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

clearDatabase();
