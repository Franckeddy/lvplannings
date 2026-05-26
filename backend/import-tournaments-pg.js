import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Liste des casinos invalides à ignorer
const INVALID_CASINOS = [
  'Las Vegas Tournois à venir',
  'Unknown',
  'aujourd\'hui',
  'demain',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche'
];

async function cleanAndImportTournaments(jsonFile = 'poker-tournaments.json') {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log(`=Â Lecture du fichier ${jsonFile}...`);

    if (!fs.existsSync(jsonFile)) {
      console.error(`L Fichier ${jsonFile} non trouvé`);
      process.exit(1);
    }

    const rawTournaments = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(` ${rawTournaments.length} tournois bruts trouvés\n`);

    // Nettoyer les données
    console.log('>ù Nettoyage des données...');

    const cleanedTournaments = rawTournaments.filter(t => {
      // Filtrer les casinos invalides
      const casinoLower = t.casino.toLowerCase();

      if (INVALID_CASINOS.some(invalid => casinoLower.includes(invalid.toLowerCase()))) {
        return false;
      }

      // Filtrer les entrées avec date invalide dans le texte du casino
      if (casinoLower.match(/\d{1,2}\s+(mai|juin|jan|fev|mar|avr|jul|aou|sep|oct|nov|dec)/)) {
        return false;
      }

      // Garder seulement les vrais casinos avec buy-in > 0
      return t.buyIn > 0 && t.casino.length > 3 && t.casino.length < 100;
    });

    console.log(` ${cleanedTournaments.length} tournois valides après nettoyage\n`);

    // Afficher les casinos uniques
    const uniqueCasinos = [...new Set(cleanedTournaments.map(t => t.casino))];
    console.log('<° Casinos détectés:');
    uniqueCasinos.forEach((casino, i) => {
      const count = cleanedTournaments.filter(t => t.casino === casino).length;
      console.log(`   ${i + 1}. ${casino} (${count} tournois)`);
    });

    // Import dans PostgreSQL
    console.log('\n=¾ Import dans la base de données...');

    let inserted = 0;
    let duplicates = 0;

    for (const t of cleanedTournaments) {
      try {
        await pool.query(
          `INSERT INTO scraped_tournaments (casino, date, time, buyIn, levels)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [t.casino, t.date, t.time, t.buyIn, t.levels || null]
        );
        inserted++;
      } catch (err) {
        if (err.code === '23505') { // Code PostgreSQL pour violation de contrainte UNIQUE
          duplicates++;
        } else {
          console.error(`   Erreur pour ${t.casino} - ${t.date}:`, err.message);
        }
      }
    }

    console.log(`\n Import terminé!`);
    console.log(`   ${inserted} tournois traités`);
    if (duplicates > 0) {
      console.log(`   ${duplicates} doublons ignorés`);
    }

    // Afficher les statistiques finales
    const statsResult = await pool.query('SELECT COUNT(*) as total FROM scraped_tournaments');
    const casinosResult = await pool.query('SELECT COUNT(DISTINCT casino) as count FROM scraped_tournaments');
    const dateRangeResult = await pool.query('SELECT MIN(date) as min, MAX(date) as max FROM scraped_tournaments');

    const stats = statsResult.rows[0];
    const casinosCount = casinosResult.rows[0];
    const dateRange = dateRangeResult.rows[0];

    console.log('\n=Ê Base de données:');
    console.log(`   Total tournois: ${stats.total}`);
    console.log(`   Casinos: ${casinosCount.count}`);
    console.log(`   Période: ${dateRange.min} ’ ${dateRange.max}`);

    // Afficher quelques exemples
    console.log('\n=Ë Exemples de tournois dans la DB:');
    const examplesResult = await pool.query(`
      SELECT casino, date, time, buyIn
      FROM scraped_tournaments
      ORDER BY date, time
      LIMIT 10
    `);

    examplesResult.rows.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.casino}`);
      console.log(`      ${t.date} à ${t.time} - $${t.buyin}`);
    });

  } catch (error) {
    console.error('L Erreur:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécution
const jsonFile = process.argv[2] || 'poker-tournaments.json';
cleanAndImportTournaments(jsonFile);
