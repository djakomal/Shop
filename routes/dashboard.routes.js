const express    = require('express');
const router     = express.Router();
const { QueryTypes } = require('sequelize');
const { sequelize, Sale, SaleItem, Product, User } = require('../models');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

/**
 * Helper robuste : extraire la date d'une instance Sequelize
 * Gère tous les cas : Date JS, string MySQL "YYYY-MM-DD HH:MM:SS", undefined
 */
function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  // "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SSZ"
  const d = new Date(s.replace(' ', 'T') + (s.includes('T') ? '' : 'Z'));
  return isNaN(d.getTime()) ? null : d;
}

function getSaleDate(sale) {
  return (
    toDate(sale.createdAt)           ||
    toDate(sale.created_at)          ||
    toDate(sale.dataValues?.createdAt)  ||
    toDate(sale.dataValues?.created_at) ||
    new Date(0)
  );
}

// ─── GET /api/dashboard ── Stats globales (admin) ─────────────────────────────
router.get('/', async (req, res) => {
  try {

    // ── Totaux globaux ────────────────────────────────────────────────────────
    const [totals] = await sequelize.query(`
      SELECT
        COUNT(*)                           AS total_sales,
        COALESCE(SUM(total_amount), 0)     AS total_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0) AS revenue_today,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END)  AS sales_today
      FROM sales
      WHERE status = 'completed'
    `, { type: QueryTypes.SELECT, raw: true });

    // ── Produits & stock critique ─────────────────────────────────────────────
    const [stockInfo] = await sequelize.query(`
      SELECT
        COUNT(*)                                               AS total_products,
        COUNT(CASE WHEN stock <= min_stock THEN 1 END)         AS low_stock_count
      FROM products
      WHERE is_active = 1
    `, { type: QueryTypes.SELECT, raw: true });

    // ── Agents actifs ─────────────────────────────────────────────────────────
    const [agentInfo] = await sequelize.query(`
      SELECT COUNT(*) AS agents_count
      FROM users
      WHERE role = 'agent' AND is_active = 1
    `, { type: QueryTypes.SELECT, raw: true });

    // ── Revenus des 7 derniers jours (SQL GROUP BY DATE) ──────────────────────
    const rawByDay = await sequelize.query(`
      SELECT
        DATE(created_at)               AS day,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*)                       AS sales
      FROM sales
      WHERE status = 'completed'
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `, { type: QueryTypes.SELECT, raw: true });

    // Remplir les jours manquants (0 vente ce jour-là)
    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const lbl = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      const found = rawByDay.find(r => {
        const rDay = r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day).slice(0, 10);
        return rDay === iso;
      });

      revenueByDay.push({
        date:    lbl,
        revenue: found ? parseFloat(found.revenue) : 0,
        sales:   found ? parseInt(found.sales)     : 0,
      });
    }

    // ── Top produits ──────────────────────────────────────────────────────────
    const topProducts = await sequelize.query(`
      SELECT
        si.product_name          AS name,
        SUM(si.quantity)         AS quantity,
        SUM(si.total)            AS revenue
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.sale_id AND s.status = 'completed'
      GROUP BY si.product_name
      ORDER BY revenue DESC
      LIMIT 5
    `, { type: QueryTypes.SELECT, raw: true });

    res.json({
      success: true,
      data: {
        total_revenue:   parseFloat(totals[0]?.total_revenue)   || 0,
        total_sales:     parseInt(totals[0]?.total_sales)        || 0,
        revenue_today:   parseFloat(totals[0]?.revenue_today)   || 0,
        sales_today:     parseInt(totals[0]?.sales_today)        || 0,
        low_stock_count: parseInt(stockInfo[0]?.low_stock_count) || 0,
        total_products:  parseInt(stockInfo[0]?.total_products)  || 0,
        agents_count:    parseInt(agentInfo[0]?.agents_count)    || 0,
        revenue_by_day:  revenueByDay,
        top_products:    topProducts.map(p => ({
          name:     p.name,
          quantity: parseFloat(p.quantity) || 0,
          revenue:  parseFloat(p.revenue)  || 0,
        })),
      },
    });

  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/dashboard/agent ── Stats de l'agent connecté ───────────────────
router.get('/agent', async (req, res) => {
  try {
    const agentId = req.user.id;

    // ── Totaux de l'agent ─────────────────────────────────────────────────────
    const [totals] = await sequelize.query(`
      SELECT
        COUNT(*)                           AS total_sales,
        COALESCE(SUM(total_amount), 0)     AS total_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0) AS revenue_today,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS sales_today
      FROM sales
      WHERE agent_id = :agentId AND status = 'completed'
    `, { replacements: { agentId }, type: QueryTypes.SELECT, raw: true });

    // ── Produits disponibles ──────────────────────────────────────────────────
    const [prodInfo] = await sequelize.query(`
      SELECT COUNT(*) AS total_products FROM products WHERE is_active = 1
    `, { type: QueryTypes.SELECT, raw: true });

    // ── Revenus 7 jours (agent) ───────────────────────────────────────────────
    const rawByDay = await sequelize.query(`
      SELECT
        DATE(created_at)               AS day,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*)                       AS sales
      FROM sales
      WHERE agent_id = :agentId
        AND status = 'completed'
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `, { replacements: { agentId }, type: QueryTypes.SELECT, raw: true });

    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const lbl = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      const found = rawByDay.find(r => {
        const rDay = r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day).slice(0, 10);
        return rDay === iso;
      });

      revenueByDay.push({
        date:    lbl,
        revenue: found ? parseFloat(found.revenue) : 0,
        sales:   found ? parseInt(found.sales)     : 0,
      });
    }

    // ── Top produits de l'agent ───────────────────────────────────────────────
    const topProducts = await sequelize.query(`
      SELECT
        si.product_name  AS name,
        SUM(si.quantity) AS quantity,
        SUM(si.total)    AS revenue
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.sale_id AND s.agent_id = :agentId AND s.status = 'completed'
      GROUP BY si.product_name
      ORDER BY revenue DESC
      LIMIT 5
    `, { replacements: { agentId }, type: QueryTypes.SELECT, raw: true });

    res.json({
      success: true,
      data: {
        total_revenue:  parseFloat(totals[0]?.total_revenue)  || 0,
        total_sales:    parseInt(totals[0]?.total_sales)       || 0,
        revenue_today:  parseFloat(totals[0]?.revenue_today)  || 0,
        sales_today:    parseInt(totals[0]?.sales_today)       || 0,
        total_products: parseInt(prodInfo[0]?.total_products)  || 0,
        revenue_by_day: revenueByDay,
        top_products:   topProducts.map(p => ({
          name:     p.name,
          quantity: parseFloat(p.quantity) || 0,
          revenue:  parseFloat(p.revenue)  || 0,
        })),
      },
    });

  } catch (err) {
    console.error('❌ Dashboard agent error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
