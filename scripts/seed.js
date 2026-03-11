

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize, User } = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();


    if (!process.env.ADMIN_PASSWORD) {
      console.error(' La variable ADMIN_PASSWORD est obligatoire dans le fichier .env');
      console.error('   Exemple : ADMIN_PASSWORD=MonMotDePasse@2024');
      process.exit(1);
    }


    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(' Tables créées avec succÃ¨s\n');

    console.log(' Création du compte administrateur...');
    const admin = await User.create({
      name:      process.env.ADMIN_NAME  || 'Administrateur',
      email:     (process.env.ADMIN_EMAIL || 'admin@boutique.com').toLowerCase(),
      password:  process.env.ADMIN_PASSWORD||'admin123',
      role:      'admin',
      is_active: true,
    }, {
      individualHooks: true, // Déclenche beforeCreate pour hasher le mot de passe
    });



    process.exit(0);
  } catch (err) {
    console.error('\nErreur lors de l\'initialisation :', err.message);
    if (err.name === 'SequelizeUniqueConstraintError') {
      console.error(' Un compte avec cet email existe déjÃ . Modifiez ADMIN_EMAIL dans .env');
    }
    process.exit(1);
  }
};

seed();
