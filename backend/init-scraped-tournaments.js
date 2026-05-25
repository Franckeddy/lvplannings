import Database from 'better-sqlite3';

const db = new Database('database.db');

// Créer la table pour les tournois scrapés
db.exec(`
  CREATE TABLE IF NOT EXISTS scraped_tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    casino TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    buyIn INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(casino, date, time)
  );

  CREATE INDEX IF NOT EXISTS idx_scraped_tournaments_date ON scraped_tournaments(date);
  CREATE INDEX IF NOT EXISTS idx_scraped_tournaments_casino ON scraped_tournaments(casino);
`);

console.log('✅ Table scraped_tournaments créée avec succès!');

// Afficher les statistiques
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT casino) as casinos,
    MIN(date) as min_date,
    MAX(date) as max_date
  FROM scraped_tournaments
`).get();

console.log('\n📊 Base de données:');
console.log(`   Total tournois: ${stats.total}`);
console.log(`   Casinos: ${stats.casinos}`);
if (stats.total > 0) {
  console.log(`   Période: ${stats.min_date} → ${stats.max_date}`);
}

db.close();
