import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function addStructureColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('=Ê Ajout des colonnes structure à la table scraped_tournaments...\n');

    // Ajouter les colonnes structure
    await pool.query(`
      ALTER TABLE scraped_tournaments
      ADD COLUMN IF NOT EXISTS structure_chips TEXT,
      ADD COLUMN IF NOT EXISTS structure_levels TEXT,
      ADD COLUMN IF NOT EXISTS structure_guarantee TEXT;
    `);

    console.log(' Colonnes structure ajoutées avec succès!\n');

    // Vérifier la structure de la table
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'scraped_tournaments'
      ORDER BY ordinal_position;
    `);

    console.log('=Ë Structure de la table scraped_tournaments:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('L Erreur:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addStructureColumns();
