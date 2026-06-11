import pool from './database.js';

const TARGET_DATE = '07-juin';
const TARGET_TIME = '10:00';
const WRONG_BUYIN = 600;
const CORRECT_BUYIN = 500;

async function run() {
  try {
    const before = await pool.query(
      `SELECT t.id, t.user_id, u.name AS user_name, t.date, t.time, t.casino, t.buyin
       FROM tournaments t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.date = $1
         AND t.time = $2
         AND (t.casino ILIKE '%world series of poker%' OR t.casino ILIKE '%wsop%')
       ORDER BY t.id`,
      [TARGET_DATE, TARGET_TIME]
    );

    console.log(`\n=== WSOP ${TARGET_DATE} ${TARGET_TIME} — état avant ===`);
    console.table(before.rows);

    const result = await pool.query(
      `UPDATE tournaments
       SET buyin = $1
       WHERE date = $2
         AND time = $3
         AND (casino ILIKE '%world series of poker%' OR casino ILIKE '%wsop%')
         AND buyin = $4
       RETURNING id, user_id, date, time, casino, buyin`,
      [CORRECT_BUYIN, TARGET_DATE, TARGET_TIME, WRONG_BUYIN]
    );

    console.log(`\n=== Lignes corrigées (${WRONG_BUYIN} → ${CORRECT_BUYIN}) ===`);
    console.table(result.rows);
    console.log(`\n✓ ${result.rowCount} tournoi(s) mis à jour.`);
  } catch (err) {
    console.error('Erreur:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
