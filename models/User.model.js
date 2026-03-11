const { DataTypes } = require('sequelize');
const bcrypt        = require('bcryptjs');
const sequelize     = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le nom est obligatoire' },
      len:      { args: [2, 100], msg: 'Le nom doit avoir entre 2 et 100 caractères' },
    },
  },
  email: {
    type:      DataTypes.STRING(150),
    allowNull: false,
    unique:    true,
    validate: {
      isEmail: { msg: 'Email invalide' },
    },
  },
  password: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  // ⚠️  On stocke le rôle en VARCHAR pour éviter les problèmes d'ALTER TABLE ENUM
  role: {
    type:         DataTypes.STRING(10),
    allowNull:    false,
    defaultValue: 'agent',
    validate: {
      isIn: {
        args:  [['admin', 'agent']],
        msg:   'Le rôle doit être "admin" ou "agent"',
      },
    },
  },
  phone: {
    type:      DataTypes.STRING(30),
    allowNull: true,
  },
  is_active: {
    type:         DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull:    false,
  },
  last_login: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName:   'users',
  timestamps:  true,
  underscored: true,
  hooks: {
    // Hash du mot de passe avant création
    beforeCreate: async (user) => {
      if (user.password) {
        const salt    = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // Hash du mot de passe avant mise à jour si modifié
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt    = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// ─── Comparer le mot de passe ─────────────────────────────────────────────────
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── JSON sans mot de passe ───────────────────────────────────────────────────
User.prototype.toSafeJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
