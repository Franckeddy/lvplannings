import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('poker.db');

// Fonction pour importer les tournois depuis le fichier JSON
function importTournaments(jsonFile = 'poker-tournaments.json') {
  console.log(`📂 Lecture du fichier ${jsonFile}...`);

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ Fichier ${jsonFile} non trouvé`);
    process.exit(1);
  }

  const tournaments = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`✅ ${tournaments.length} tournois trouvés dans le fichier\n`);

  // Préparer les requêtes
  const insertTournament = db.prepare(`
    INSERT OR IGNORE INTO tournaments (casino, date, time, buyIn)
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
  console.log('💾 Import en cours...');
  const inserted = insertMany(tournaments);

  console.log(`\n✅ Import terminé!`);
  console.log(`   ${inserted} nouveaux tournois ajoutés`);
  console.log(`   ${tournaments.length - inserted} doublons ignorés`);

  // Afficher les statistiques
  const stats = db.prepare('SELECT COUNT(*) as total FROM tournaments').get();
  const casinos = db.prepare('SELECT COUNT(DISTINCT casino) as count FROM tournaments').get();

  console.log('\n📊 Base de données:');
  console.log(`   Total tournois: ${stats.total}`);
  console.log(`   Casinos: ${casinos.count}`);

  db.close();
}

// Exécution
if (process.argv.length > 2) {
  importTournaments(process.argv[2]);
} else {
  importTournaments();
}
