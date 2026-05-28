import pool from './database.js';

async function addManualColumn() {
  try {
    console.log('🔧 Ajout de la colonne is_manual à scraped_tournaments...');

    // Ajouter la colonne is_manual
    await pool.query(`
      ALTER TABLE scraped_tournaments 
      ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false
    `);

    console.log('✅ Colonne is_manual ajoutée avec succès');

    // Vérifier
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'scraped_tournaments' 
      AND column_name = 'is_manual'
    `);

    if (result.rows.length > 0) {
      console.log('📋 Colonne vérifiée:', result.rows[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

addManualColumn();

