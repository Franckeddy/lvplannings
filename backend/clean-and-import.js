import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('database.db');

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

function cleanAndImportTournaments(jsonFile = 'poker-tournaments.json') {
  console.log(`📂 Lecture du fichier ${jsonFile}...`);

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ Fichier ${jsonFile} non trouvé`);
    process.exit(1);
  }

  const rawTournaments = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`✅ ${rawTournaments.length} tournois bruts trouvés\n`);

  // Nettoyer les données
  console.log('🧹 Nettoyage des données...');

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

  console.log(`✅ ${cleanedTournaments.length} tournois valides après nettoyage\n`);

  // Afficher les casinos uniques
  const uniqueCasinos = [...new Set(cleanedTournaments.map(t => t.casino))];
  console.log('🎰 Casinos détectés:');
  uniqueCasinos.forEach((casino, i) => {
    const count = cleanedTournaments.filter(t => t.casino === casino).length;
    console.log(`   ${i + 1}. ${casino} (${count} tournois)`);
  });

  // Préparer les requêtes
  const insertTournament = db.prepare(`
    INSERT OR IGNORE INTO scraped_tournaments (casino, date, time, buyIn)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((tournaments) => {
    let inserted = 0;
    for (const t of tournaments) {
      try {
        const result = insertTournament.run(t.casino, t.date, t.time, t.buyIn);
        if (result.changes > 0) inserted++;
      } catch (err) {
        console.error(`⚠️  Erreur pour ${t.casino} - ${t.date}:`, err.message);
      }
    }
    return inserted;
  });

  // Exécuter l'import
  console.log('\n💾 Import dans la base de données...');
  const inserted = insertMany(cleanedTournaments);

  console.log(`\n✅ Import terminé!`);
  console.log(`   ${inserted} nouveaux tournois ajoutés`);
  console.log(`   ${cleanedTournaments.length - inserted} doublons ignorés`);

  // Afficher les statistiques finales
  const stats = db.prepare('SELECT COUNT(*) as total FROM scraped_tournaments').get();
  const casinosCount = db.prepare('SELECT COUNT(DISTINCT casino) as count FROM scraped_tournaments').get();
  const dateRange = db.prepare('SELECT MIN(date) as min, MAX(date) as max FROM scraped_tournaments').get();

  console.log('\n📊 Base de données:');
  console.log(`   Total tournois: ${stats.total}`);
  console.log(`   Casinos: ${casinosCount.count}`);
  console.log(`   Période: ${dateRange.min} → ${dateRange.max}`);

  // Afficher quelques exemples
  console.log('\n📋 Exemples de tournois dans la DB:');
  const examples = db.prepare(`
    SELECT casino, date, time, buyIn
    FROM scraped_tournaments
    ORDER BY date, time
    LIMIT 10
  `).all();

  examples.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.casino}`);
    console.log(`      ${t.date} à ${t.time} - $${t.buyIn}`);
  });

  db.close();
}

// Exécution
if (process.argv.length > 2) {
  cleanAndImportTournaments(process.argv[2]);
} else {
  cleanAndImportTournaments();
}
