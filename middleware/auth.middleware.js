const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ─── Vérifie le token JWT ─────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Non autorisé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      where: { id: decoded.id },
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Compte désactivé. Contactez un administrateur.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
  }
};

// ─── Admin uniquement ─────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
  }
  next();
};

// ─── Autorisation par rôles ───────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôles autorisés: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, adminOnly, authorize };
