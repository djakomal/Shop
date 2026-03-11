/**
 * Script de diagnostic — vérifie les données en base et les dates
 * Usage : node scripts/diagnose.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sequelize = require('../config/database');
const { Sale, SaleItem, Product, User } = require('../models');

async function diagnose() {
  try {
    console.log('\n🔍 === DIAGNOSTIC BOUTIQUE ALIMENTAIRE ===\n');

    await sequelize.authenticate();
    console.log('✅ Connexion MySQL OK\n');

    // ── 1. Ventes ──────────────────────────────────────────────────────────────
    const sales = await Sale.findAll({ limit: 5, order: [['id', 'DESC']] });
    console.log(`📦 Ventes en base : ${await Sale.count()} total`);

    if (sales.length === 0) {
      console.log('  ⚠️  Aucune vente ! Exécutez : node scripts/seed.js\n');
    } else {
      console.log('\n  Exemples de ventes (5 dernières) :');
      sales.forEach(s => {
        const raw       = s.dataValues;
        const createdAt = s.createdAt;
        const created_at = s.created_at;
        const dvCreatedAt = raw.createdAt;
        const dvCreated_at = raw.created_at;

        console.log(`  → Vente #${s.id}:`);
        console.log(`     total_amount   : ${s.total_amount}`);
        console.log(`     status         : ${s.status}`);
        console.log(`     s.createdAt    : ${createdAt} (type: ${typeof createdAt})`);
        console.log(`     s.created_at   : ${created_at} (type: ${typeof created_at})`);
        console.log(`     dv.createdAt   : ${dvCreatedAt}`);
        console.log(`     dv.created_at  : ${dvCreated_at}`);
        console.log(`     new Date(s.createdAt) : ${new Date(createdAt)}`);
        console.log('');
      });
    }

    // ── 2. Produits ────────────────────────────────────────────────────────────
    const prodCount = await Product.count();
    const lowStock  = await Product.findAll({ where: { is_active: true } });
    const critiques = lowStock.filter(p => parseFloat(p.stock) <= parseFloat(p.min_stock));
    console.log(`🥦 Produits actifs   : ${prodCount}`);
    console.log(`⚠️  Stocks critiques  : ${critiques.length}`);

    // ── 3. Agents ──────────────────────────────────────────────────────────────
    const agents = await User.findAll({ where: { role: 'agent' } });
    console.log(`\n👥 Agents en base    : ${agents.length}`);
    agents.forEach(a => console.log(`  → ${a.name} (${a.email}) — actif: ${a.is_active}`));

    // ── 4. SaleItems ───────────────────────────────────────────────────────────
    const itemCount = await SaleItem.count();
    console.log(`\n🛒 Articles de vente : ${itemCount}`);

    // ── 5. Test filtrage par date ──────────────────────────────────────────────
    console.log('\n📅 Test filtrage par date :');
    const now      = new Date();
    const today    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    console.log(`   Aujourd'hui UTC : ${today.toISOString()}`);
    console.log(`   Demain UTC      : ${tomorrow.toISOString()}`);

    const allSales = await Sale.findAll({ where: { status: 'completed' } });
    let todayCount = 0;

    allSales.forEach(s => {
      const raw = s.createdAt || s.created_at || s.dataValues?.createdAt || s.dataValues?.created_at;
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(String(raw).replace(' ', 'T') + (String(raw).includes('Z') ? '' : 'Z'));
      if (d >= today && d < tomorrow) todayCount++;
    });

    console.log(`   Ventes aujourd'hui: ${todayCount}`);

    // ── 6. Revenus par jour ────────────────────────────────────────────────────
    console.log('\n📊 Revenus 7 derniers jours :');
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const nextDay = new Date(day);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const daySales = allSales.filter(s => {
        const raw = s.createdAt || s.created_at || s.dataValues?.createdAt || s.dataValues?.created_at;
        if (!raw) return false;
        const d = raw instanceof Date ? raw : new Date(String(raw).replace(' ', 'T') + (String(raw).includes('Z') ? '' : 'Z'));
        return d >= day && d < nextDay;
      });

      const rev = daySales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      const label = day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
      console.log(`   ${label} : ${daySales.length} vente(s) — ${rev.toLocaleString('fr-FR')} FCFA`);
    }

    console.log('\n✅ Diagnostic terminé\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erreur diagnostic:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

diagnose();
