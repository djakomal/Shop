const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { body, validationResult } = require('express-validator');
const { Product } = require('../models');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect);

// ─── GET /api/products ── Liste des produits ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, search, low_stock, is_active } = req.query;
    const where = {};

    // Filtre actif/inactif
    if (is_active !== 'all') {
      where.is_active = is_active === 'false' ? false : true;
    }

    // Filtre catégorie
    if (category) where.category = category;

    // Recherche par nom
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    const products = await Product.findAll({
      where,
      order: [['name', 'ASC']],
    });

    // Filtre stock bas (après récupération pour pouvoir comparer les décimaux)
    let result = products;
    if (low_stock === 'true') {
      result = products.filter(
        (p) => parseFloat(p.stock) <= parseFloat(p.min_stock)
      );
    }

    // Ajouter le flag is_low_stock
    const data = result.map((p) => ({
      ...p.toJSON(),
      is_low_stock: parseFloat(p.stock) <= parseFloat(p.min_stock),
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/products/categories ────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']],
    });
    res.json({
      success: true,
      data: categories.map((c) => c.category),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });

    res.json({
      success: true,
      data: {
        ...product.toJSON(),
        is_low_stock: parseFloat(product.stock) <= parseFloat(product.min_stock),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/products ── Créer un produit ───────────────────────────────────
router.post(
  '/',
  adminOnly,
  [
    body('name').notEmpty().withMessage('Nom requis'),
    body('category').notEmpty().withMessage('Catégorie requise'),
    body('unit').notEmpty().withMessage('Unité requise'),
    body('purchase_price').isNumeric().withMessage("Prix d'achat invalide"),
    body('selling_price').isNumeric().withMessage('Prix de vente invalide'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      // Whitelist des champs autorisés
      const { name, category, unit, purchase_price, selling_price, stock, min_stock, description, expiry_date, barcode } = req.body;
      const product = await Product.create({
        name,
        category,
        unit,
        purchase_price,
        selling_price,
        stock: stock || 0,
        min_stock: min_stock || 0,
        description,
        expiry_date,
        barcode,
        is_active: true,
      });
      res.status(201).json({
        success: true,
        message: 'Produit créé avec succès',
        data: {
          ...product.toJSON(),
          is_low_stock: parseFloat(product.stock) <= parseFloat(product.min_stock),
        },
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/products/:id ── Modifier un produit ────────────────────────────
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });

    // Whitelist des champs autorisés
    const { name, category, unit, purchase_price, selling_price, stock, min_stock, description, expiry_date, barcode, is_active } = req.body;
    await product.update({
      name,
      category,
      unit,
      purchase_price,
      selling_price,
      stock,
      min_stock,
      description,
      expiry_date,
      barcode,
      is_active,
    });
    res.json({
      success: true,
      message: 'Produit mis à jour',
      data: {
        ...product.toJSON(),
        is_low_stock: parseFloat(product.stock) <= parseFloat(product.min_stock),
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/products/:id ── Désactiver (soft delete) ────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });

    await product.update({ is_active: false });
    res.json({ success: true, message: 'Produit désactivé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
