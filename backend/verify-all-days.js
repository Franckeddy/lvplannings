import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
async function verifyAllDays() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  try {
    console.log('📊 VÉRIFICATION COMPLÈTE (4-12 juin 2026)\n');
    console.log('='.repeat(70));
    const result = await pool.query(`
      SELECT 
        date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE structure_chips IS NOT NULL) as with_chips,
        COUNT(*) FILTER (WHERE structure_levels IS NOT NULL) as with_levels,
        COUNT(*) FILTER (WHERE day IS NOT NULL) as with_day,
        COUNT(*) FILTER (WHERE is_restart = true) as with_restart,
        COUNT(*) FILTER (WHERE name IS NOT NULL) as with_name
      FROM scraped_tournaments
      GROUP BY date
      ORDER BY date
    `);
    console.log('\n📅 DÉTAIL PAR JOUR:\n');
    let totalTournaments = 0;
    let totalWithChips = 0;
    let totalWithLevels = 0;
    let totalWithDay = 0;
    let totalWithRestart = 0;
    result.rows.forEach(r => {
      totalTournaments += parseInt(r.total);
      totalWithChips += parseInt(r.with_chips);
      totalWithLevels += parseInt(r.with_levels);
      totalWithDay += parseInt(r.with_day);
      totalWithRestart += parseInt(r.with_restart);
      console.log(`  ${r.date}:`);
      console.log(`    • ${r.total} tournois total`);
      console.log(`    • ${r.with_chips} avec chips | ${r.with_levels} avec niveaux`);
      console.log(`    • ${r.with_day} avec Day | ${r.with_restart} avec Restart`);
      console.log('');
    });
    console.log('='.repeat(70));
    console.log('\n📈 TOTAUX:');
    console.log(`   Total tournois: ${totalTournaments}`);
    console.log(`   Avec chips: ${totalWithChips}`);
    console.log(`   Avec niveaux: ${totalWithLevels} (format "niveau de XX min")`);
    console.log(`   Avec Day: ${totalWithDay}`);
    console.log(`   Avec Restart: ${totalWithRestart}`);
    // Exemple de tournoi par jour
    console.log('\n📋 EXEMPLE PAR JOUR:');
    for (const r of result.rows) {
      const example = await pool.query(`
        SELECT casino, time, buyin, structure_chips, structure_levels, day, is_restart, name
        FROM scraped_tournaments
        WHERE date = $1
        ORDER BY time
        LIMIT 1
      `, [r.date]);
      if (example.rows[0]) {
        const t = example.rows[0];
        console.log(`\n  ${r.date} - ${t.casino} - $${t.buyin}`);
        console.log(`    Chips: ${t.structure_chips || '-'}`);
        console.log(`    Niveaux: ${t.structure_levels || '-'}`);
        if (t.day) console.log(`    Day: ${t.day}`);
        if (t.is_restart) console.log(`    Restart: Oui`);
      }
    }
  } finally {
    await pool.end();
  }
}
verifyAllDays();
