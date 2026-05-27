import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testStructureInsert() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧪 Test d\'insertion de données avec structure...\n');

    // Sélectionner quelques tournois au hasard pour leur ajouter de la structure
    const tournamentsResult = await pool.query(`
      SELECT id, casino, date, time, buyin
      FROM scraped_tournaments
      WHERE buyin >= 200
      ORDER BY RANDOM()
      LIMIT 5
    `);

    const testStructures = [
      { chips: '20,000', levels: '30 min', guarantee: '$10,000 Guaranteed' },
      { chips: '25,000', levels: '20 min', guarantee: '$5,000 Guaranteed' },
      { chips: '30,000', levels: '40 min', guarantee: '$15,000 Guaranteed' },
      { chips: '15,000', levels: '25 min', guarantee: null },
      { chips: '50,000', levels: '30 min', guarantee: '$25,000 Guaranteed' }
    ];

    console.log(`Mise à jour de ${tournamentsResult.rows.length} tournois...\n`);

    for (let i = 0; i < tournamentsResult.rows.length; i++) {
      const tournament = tournamentsResult.rows[i];
      const structure = testStructures[i];

      await pool.query(`
        UPDATE scraped_tournaments
        SET
          structure_chips = $1,
          structure_levels = $2,
          structure_guarantee = $3
        WHERE id = $4
      `, [structure.chips, structure.levels, structure.guarantee, tournament.id]);

      console.log(`✅ ${tournament.casino} - ${tournament.date}`);
      console.log(`   Chips: ${structure.chips}`);
      console.log(`   Niveaux: ${structure.levels}`);
      if (structure.guarantee) console.log(`   Garantie: ${structure.guarantee}`);
      console.log('');
    }

    // Vérifier les modifications
    const checkResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE structure_chips IS NOT NULL) as with_chips,
        COUNT(*) FILTER (WHERE structure_levels IS NOT NULL) as with_levels,
        COUNT(*) FILTER (WHERE structure_guarantee IS NOT NULL) as with_guarantee
      FROM scraped_tournaments
    `);

    console.log('📊 Statistiques après insertion:');
    console.log(`   Avec chips: ${checkResult.rows[0].with_chips}`);
    console.log(`   Avec niveaux: ${checkResult.rows[0].with_levels}`);
    console.log(`   Avec garantie: ${checkResult.rows[0].with_guarantee}`);

    await pool.end();
    console.log('\n✅ Test terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

testStructureInsert();
