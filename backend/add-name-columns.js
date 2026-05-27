import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function addNameColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Ajout des colonnes name, day, is_restart...\n');

    // Ajouter la colonne name
    await pool.query(`
      ALTER TABLE scraped_tournaments 
      ADD COLUMN IF NOT EXISTS name TEXT
    `);
    console.log('✅ Colonne "name" ajoutée');

    // Ajouter la colonne day (pour Day 2, Day 3, etc.)
    await pool.query(`
      ALTER TABLE scraped_tournaments 
      ADD COLUMN IF NOT EXISTS day INTEGER
    `);
    console.log('✅ Colonne "day" ajoutée');

    // Ajouter la colonne is_restart
    await pool.query(`
      ALTER TABLE scraped_tournaments 
      ADD COLUMN IF NOT EXISTS is_restart BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Colonne "is_restart" ajoutée');

    // Ajouter aussi sur la table tournaments
    await pool.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS name TEXT
    `);
    console.log('✅ Colonne "name" ajoutée à tournaments');

    await pool.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS day INTEGER
    `);
    console.log('✅ Colonne "day" ajoutée à tournaments');

    await pool.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS is_restart BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Colonne "is_restart" ajoutée à tournaments');

    console.log('\n✅ Migration terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addNameColumns();

