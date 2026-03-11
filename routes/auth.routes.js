const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { protect } = require('../middleware/auth.middleware');

// ─── Générer un token JWT ─────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { email, password } = req.body;

      // Chercher l'utilisateur avec le mot de passe
      const user = await User.findOne({ where: { email: email.toLowerCase() } });

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect',
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Compte désactivé. Contactez un administrateur.',
        });
      }

      // Mettre à jour la dernière connexion
      await user.update({ last_login: new Date() });

      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Connexion réussie',
        token,
        user: {
          id:         user.id,
          name:       user.name,
          email:      user.email,
          role:       user.role,
          phone:      user.phone,
          last_login: user.last_login,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Le nouveau mot de passe doit avoir au moins 6 caractères'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      // Récupérer l'utilisateur avec le mot de passe
      const user = await User.findByPk(req.user.id);

      if (!(await user.comparePassword(req.body.currentPassword))) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect',
        });
      }

      await user.update({ password: req.body.newPassword });
      res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    } catch (err) {
      console.error('Change-password error:', err);
      res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
  }
);

module.exports = router;
