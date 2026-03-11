const express  = require('express');
const router   = express.Router();
const { sequelize, Sale, SaleItem, Product, StockMovement, User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect);

// ─── GET /api/sales ── Toutes les ventes (admin) ──────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const sales = await Sale.findAll({
      include: [
        { model: SaleItem, as: 'items' },
        { model: User, as: 'agent', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/sales/mine ── Mes ventes (agent) ────────────────────────────────
router.get('/mine', async (req, res) => {
  try {
    const sales = await Sale.findAll({
      where: { agent_id: req.user.id },
      include: [{ model: SaleItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/sales ── Créer une vente (agent) ───────────────────────────────
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { items, total_amount, payment_method, note } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'La vente doit contenir au moins un article',
      });
    }

    // ── Vérifier les stocks et calculer le total côté serveur ─────────────────
    let serverTotal = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `Produit ID ${item.product_id} introuvable`,
        });
      }
      if (parseFloat(product.stock) < parseFloat(item.quantity)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour "${product.name}" (disponible: ${product.stock} ${product.unit})`,
        });
      }
      // Calculer le total côté serveur pour éviter la manipulation
      const itemTotal = parseFloat(product.selling_price) * parseFloat(item.quantity);
      serverTotal += itemTotal;
    }

    // ── Créer la vente ───────────────────────────────────────────────────────
    const sale = await Sale.create(
      {
        agent_id:       req.user.id,
        agent_name:     req.user.name,
        total_amount:   serverTotal,
        payment_method: payment_method || 'cash',
        status:         'completed',
        note,
      },
      { transaction: t }
    );

    // ── Créer les articles et décrémenter les stocks ─────────────────────────
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      const stockBefore = parseFloat(product.stock);
      const newStock    = stockBefore - parseFloat(item.quantity);

      // Décrémenter le stock
      await product.update({ stock: newStock }, { transaction: t });

      // Créer l'article de vente
      await SaleItem.create(
        {
          sale_id:      sale.id,
          product_id:   product.id,
          product_name: product.name,
          quantity:     item.quantity,
          unit:         product.unit,
          unit_price:   item.unit_price,
          total:        item.total,
        },
        { transaction: t }
      );

      // Enregistrer le mouvement de stock
      await StockMovement.create(
        {
          product_id:   product.id,
          product_name: product.name,
          agent_id:     req.user.id,
          agent_name:   req.user.name,
          type:         'out',
          quantity:     item.quantity,
          unit:         product.unit,
          stock_before: stockBefore,
          stock_after:  newStock,
          reason:       `Vente #${sale.id}`,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Retourner la vente avec ses articles
    const fullSale = await Sale.findByPk(sale.id, {
      include: [{ model: SaleItem, as: 'items' }],
    });

    res.status(201).json({ success: true, data: fullSale });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/sales/:id/cancel ── Annuler une vente ────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, as: 'items' }],
      transaction: t,
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Vente introuvable' });
    }
    if (sale.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Vente déjà annulée' });
    }

    // ── Vérifier l'autorisation: admin ou propriétaire de la vente ───────────────
    if (req.user.role !== 'admin' && sale.agent_id !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Non autorisé à annuler cette vente' });
    }

    // Remettre les stocks
    for (const item of sale.items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (product) {
        const newStock = parseFloat(product.stock) + parseFloat(item.quantity);
        await product.update({ stock: newStock }, { transaction: t });
      }
    }

    await sale.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();

    res.json({ success: true, message: 'Vente annulée avec succès', data: sale });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
