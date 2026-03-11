const express       = require('express');
const router        = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, User, Sale, SaleItem } = require('../models');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Toutes les routes nécessitent d'être admin
router.use(protect, adminOnly);

// ─── GET /api/users/agents ── Liste des agents ────────────────────────────────
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.findAll({
      where: { role: 'agent' },
      attributes: {
        exclude: ['password'],
        include: [
          [
            literal(`(
              SELECT COUNT(*) FROM sales
              WHERE sales.agent_id = User.id AND sales.status = 'completed'
            )`),
            'total_sales',
          ],
          [
            literal(`(
              SELECT COALESCE(SUM(total_amount), 0) FROM sales
              WHERE sales.agent_id = User.id AND sales.status = 'completed'
            )`),
            'total_revenue',
          ],
        ],
      },
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: agents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/users/agents ── Créer un agent ─────────────────────────────────
router.post('/agents', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email et mot de passe sont obligatoires',
      });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    }

    const agent = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: 'agent',
    });

    res.status(201).json({
      success: true,
      message: 'Agent créé avec succès',
      data: agent.toSafeJSON(),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/users/agents/:id ── Supprimer un agent ──────────────────────
router.delete('/agents/:id', async (req, res) => {
  try {
    const agent = await User.findByPk(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent introuvable' });
    }
    if (agent.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer un administrateur',
      });
    }

    await agent.destroy();
    res.json({ success: true, message: 'Agent supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/users/agents/:id/toggle ── Activer/désactiver ────────────────
router.patch('/agents/:id/toggle', async (req, res) => {
  try {
    const agent = await User.findByPk(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent introuvable' });
    }

    await agent.update({ is_active: !agent.is_active });

    res.json({
      success: true,
      message: `Agent ${agent.is_active ? 'activé' : 'désactivé'}`,
      data: agent.toSafeJSON(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/users/agents/:id/sales ── Ventes d'un agent ────────────────────
router.get('/agents/:id/sales', async (req, res) => {
  try {
    const agent = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent introuvable' });
    }

    const sales = await Sale.findAll({
      where: { agent_id: req.params.id },
      include: [{ model: SaleItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      agent: agent.toSafeJSON(),
      data: sales,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
