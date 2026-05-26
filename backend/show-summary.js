import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function showSummary() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   📊 RÉSUMÉ DES TOURNOIS SCRAPÉS - POKER VEGAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Stats globales
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT casino) as casinos,
        COUNT(DISTINCT date) as dates,
        ROUND(AVG(buyin), 2) as "avgBuyIn",
        MIN(buyin) as "minBuyIn",
        MAX(buyin) as "maxBuyIn",
        MIN(date) as "startDate",
        MAX(date) as "endDate"
      FROM scraped_tournaments
    `);

    console.log('📈 STATISTIQUES GLOBALES');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   Total tournois      : ${stats.total}`);
    console.log(`   Casinos différents  : ${stats.casinos}`);
    console.log(`   Dates couvertes     : ${stats.dates}`);
    console.log(`   Buy-in moyen        : $${stats.avgBuyIn}`);
    console.log(`   Buy-in min/max      : $${stats.minBuyIn} - $${stats.maxBuyIn}`);
    console.log(`   Période             : ${stats.startDate} → ${stats.endDate}`);

    // Top casinos
    console.log('\n🎰 TOP CASINOS PAR NOMBRE DE TOURNOIS');
    console.log('─────────────────────────────────────────────────────────');
    const { rows: topCasinos } = await pool.query(`
      SELECT casino, COUNT(*) as count
      FROM scraped_tournaments
      GROUP BY casino
      ORDER BY count DESC
      LIMIT 10
    `);

    topCasinos.forEach((c, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${c.casino.padEnd(40)} ${c.count} tournois`);
    });

    // Distribution par buy-in
    console.log('\n💰 DISTRIBUTION PAR BUY-IN');
    console.log('─────────────────────────────────────────────────────────');
    const buyInRanges = [
      { min: 0, max: 100, label: '$0 - $100' },
      { min: 101, max: 200, label: '$101 - $200' },
      { min: 201, max: 300, label: '$201 - $300' },
      { min: 301, max: 500, label: '$301 - $500' },
      { min: 501, max: 10000, label: '$500+' }
    ];

    for (const range of buyInRanges) {
      const { rows: [{ count }] } = await pool.query(`
        SELECT COUNT(*) as count
        FROM scraped_tournaments
        WHERE buyin >= $1 AND buyin <= $2
      `, [range.min, range.max]);

      const bar = '█'.repeat(Math.floor(count / 5));
      console.log(`   ${range.label.padEnd(15)} : ${count.toString().padStart(3)} tournois ${bar}`);
    }

    // Tournois par heure
    console.log('\n⏰ HORAIRES POPULAIRES');
    console.log('─────────────────────────────────────────────────────────');
    const { rows: timeSlots } = await pool.query(`
      SELECT
        CASE
          WHEN CAST(substring(time, 1, 2) AS INTEGER) < 12 THEN 'Matin (avant 12h)'
          WHEN CAST(substring(time, 1, 2) AS INTEGER) < 18 THEN 'Après-midi (12h-18h)'
          ELSE 'Soir (après 18h)'
        END as period,
        COUNT(*) as count
      FROM scraped_tournaments
      GROUP BY period
      ORDER BY count DESC
    `);

    timeSlots.forEach(slot => {
      const bar = '█'.repeat(Math.floor(slot.count / 3));
      console.log(`   ${slot.period.padEnd(25)} : ${slot.count.toString().padStart(3)} tournois ${bar}`);
    });

    // Exemples de tournois
    console.log('\n📋 EXEMPLES DE TOURNOIS');
    console.log('─────────────────────────────────────────────────────────');
    const { rows: examples } = await pool.query(`
      SELECT casino, date, time, buyin
      FROM scraped_tournaments
      ORDER BY buyin DESC
      LIMIT 5
    `);

    console.log('\n   Top 5 par Buy-in:');
    examples.forEach((t, i) => {
      console.log(`   ${i + 1}. $${t.buyin.toString().padStart(4)} - ${t.casino} - ${t.time.substring(0, 5)}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ✅ Données prêtes à être utilisées dans l\'application');
    console.log('   📡 API disponible: http://localhost:3000/api/scraped-tournaments');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

showSummary();
