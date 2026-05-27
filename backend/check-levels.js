import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
async function checkLevels() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  try {
    const result = await pool.query(`
      SELECT DISTINCT structure_levels 
      FROM scraped_tournaments 
      WHERE structure_levels IS NOT NULL 
      ORDER BY structure_levels
    `);
    console.log('📊 Formats de niveaux dans la base:\n');
    result.rows.forEach(r => {
      console.log(`  • ${r.structure_levels}`);
    });
    // Exemples de tournois
    console.log('\n📋 Exemples de tournois:');
    const examples = await pool.query(`
      SELECT casino, date, time, buyin, structure_chips, structure_levels
      FROM scraped_tournaments
      WHERE structure_levels IS NOT NULL
      ORDER BY date, time
      LIMIT 5
    `);
    examples.rows.forEach(t => {
      console.log(`\n  ${t.casino} - ${t.date} ${t.time.substring(0,5)} - $${t.buyin}`);
      console.log(`    Chips: ${t.structure_chips}`);
      console.log(`    Niveaux: ${t.structure_levels}`);
    });
  } finally {
    await pool.end();
  }
}
checkLevels();
