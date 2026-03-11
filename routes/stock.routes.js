const express = require('express');
const router  = express.Router();
const { sequelize, StockMovement, Product } = require('../models');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// ─── GET /api/stock ── Liste des mouvements de stock ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { product_id, type, limit = 200 } = req.query;
    const where = {};
    if (product_id) where.product_id = product_id;
    if (type)       where.type = type;

    const movements = await StockMovement.findAll({
      where,
      order:  [['created_at', 'DESC']],
      limit:  parseInt(limit),
    });

    res.json({ success: true, count: movements.length, data: movements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/stock ── Ajouter un mouvement de stock ────────────────────────
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { product_id, type, quantity, reason } = req.body;

    if (!product_id || !type || quantity === undefined) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'product_id, type et quantity sont obligatoires',
      });
    }

    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    const stockBefore = parseFloat(product.stock);
    let   stockAfter  = stockBefore;

    if (type === 'in') {
      stockAfter = stockBefore + parseFloat(quantity);
    } else if (type === 'out' || type === 'loss') {
      if (stockBefore < parseFloat(quantity)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant (disponible: ${product.stock} ${product.unit})`,
        });
      }
      stockAfter = stockBefore - parseFloat(quantity);
    } else if (type === 'adjustment') {
      stockAfter = parseFloat(quantity); // Ajustement direct
    }

    // Mettre à jour le stock
    await product.update({ stock: stockAfter }, { transaction: t });

    // Enregistrer le mouvement
    const movement = await StockMovement.create(
      {
        product_id:   product.id,
        product_name: product.name,
        agent_id:     req.user.id,
        agent_name:   req.user.name,
        type,
        quantity:     type === 'adjustment' ? Math.abs(stockAfter - stockBefore) : quantity,
        unit:         product.unit,
        stock_before: stockBefore,
        stock_after:  stockAfter,
        reason,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ success: true, data: movement });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
