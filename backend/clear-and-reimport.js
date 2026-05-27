import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
async function clearAndReimport() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  try {
    console.log('🗑️  Suppression des anciens tournois scrapés...');
    await pool.query('DELETE FROM scraped_tournaments');
    console.log('✅ Table nettoyée\n');
    console.log('📂 Lecture du fichier poker-tournaments.json...');
    const rawTournaments = JSON.parse(fs.readFileSync('poker-tournaments.json', 'utf8'));
    console.log(`✅ ${rawTournaments.length} tournois à importer\n`);
    console.log('💾 Import dans la base de données...');
    let inserted = 0;
    let withDay = 0;
    let withRestart = 0;
    for (const t of rawTournaments) {
      const structureChips = t.structure?.chips || null;
      const structureLevels = t.structure?.levels || null;
      const structureGuarantee = t.structure?.guarantee || null;
      if (t.day) withDay++;
      if (t.isRestart) withRestart++;
      await pool.query(
        `INSERT INTO scraped_tournaments (
          casino, date, time, buyin, levels,
          structure_chips, structure_levels, structure_guarantee,
          name, day, is_restart
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          t.casino, t.date, t.time, t.buyIn, t.levels || null,
          structureChips, structureLevels, structureGuarantee,
          t.name || null, t.day || null, t.isRestart || false
        ]
      );
      inserted++;
    }
    console.log(`\n✅ Import terminé!`);
    console.log(`   ${inserted} tournois importés`);
    console.log(`   ${withDay} avec "Day X"`);
    console.log(`   ${withRestart} avec "Restart"`);
    // Statistiques
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE day IS NOT NULL) as with_day,
        COUNT(*) FILTER (WHERE is_restart = true) as with_restart,
        COUNT(DISTINCT date) as dates
      FROM scraped_tournaments
    `);
    console.log('\n📊 Statistiques finales:');
    console.log(`   Total: ${stats.rows[0].total} tournois`);
    console.log(`   Avec Day: ${stats.rows[0].with_day}`);
    console.log(`   Avec Restart: ${stats.rows[0].with_restart}`);
    console.log(`   Dates: ${stats.rows[0].dates}`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
clearAndReimport();
