import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
async function showDayRestart() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  try {
    console.log('📅 TOURNOIS AVEC "DAY X":\n');
    const dayResult = await pool.query(`
      SELECT date, time, casino, buyin, name, day
      FROM scraped_tournaments
      WHERE day IS NOT NULL
      ORDER BY date, time
    `);
    dayResult.rows.forEach(t => {
      console.log(`  ${t.date} ${t.time.substring(0,5)} | Day ${t.day} | ${t.casino} | $${t.buyin}`);
      console.log(`    → ${t.name?.substring(0, 60) || 'N/A'}`);
    });
    console.log('\n🔄 TOURNOIS "RESTART":\n');
    const restartResult = await pool.query(`
      SELECT date, time, casino, buyin, name
      FROM scraped_tournaments
      WHERE is_restart = true
      ORDER BY date, time
    `);
    restartResult.rows.forEach(t => {
      console.log(`  ${t.date} ${t.time.substring(0,5)} | ${t.casino} | $${t.buyin}`);
      console.log(`    → ${t.name?.substring(0, 60) || 'N/A'}`);
    });
    console.log('\n📊 RÉSUMÉ PAR DATE:\n');
    const summaryResult = await pool.query(`
      SELECT 
        date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE day IS NOT NULL) as with_day,
        COUNT(*) FILTER (WHERE is_restart = true) as with_restart
      FROM scraped_tournaments
      GROUP BY date
      ORDER BY date
    `);
    summaryResult.rows.forEach(s => {
      console.log(`  ${s.date}: ${s.total} tournois | ${s.with_day} Day | ${s.with_restart} Restart`);
    });
  } finally {
    await pool.end();
  }
}
showDayRestart();
