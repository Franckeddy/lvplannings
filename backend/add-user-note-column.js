import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addUserNoteColumn() {
  const client = await pool.connect();
  try {
    console.log('🔄 Vérification de la colonne user_note...');

    // Vérifier si la colonne existe déjà
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name = 'user_note'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✓ La colonne user_note existe déjà');
    } else {
      // Ajouter la colonne
      await client.query(`
        ALTER TABLE tournaments 
        ADD COLUMN user_note TEXT
      `);
      console.log('✓ Colonne user_note ajoutée avec succès');
    }

    // Vérifier le résultat
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Structure de la table tournaments:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addUserNoteColumn();

