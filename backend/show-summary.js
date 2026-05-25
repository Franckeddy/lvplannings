import Database from 'better-sqlite3';

const db = new Database('database.db');

console.log('═══════════════════════════════════════════════════════════');
console.log('   📊 RÉSUMÉ DES TOURNOIS SCRAPÉS - POKER VEGAS');
console.log('═══════════════════════════════════════════════════════════\n');

// Stats globales
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT casino) as casinos,
    COUNT(DISTINCT date) as dates,
    ROUND(AVG(buyIn), 2) as avgBuyIn,
    MIN(buyIn) as minBuyIn,
    MAX(buyIn) as maxBuyIn,
    MIN(date) as startDate,
    MAX(date) as endDate
  FROM scraped_tournaments
`).get();

console.log('📈 STATISTIQUES GLOBALES');
console.log('─────────────────────────────────────────────────────────');
console.log(`   Total tournois      : ${stats.total}`);
console.log(`   Casinos différents  : ${stats.casinos}`);
console.log(`   Dates couvertes     : ${stats.dates}`);
console.log(`   Buy-in moyen        : $${stats.avgBuyIn}`);
console.log(`   Buy-in min/max      : $${stats.minBuyIn} - $${stats.maxBuyIn}`);
console.log(`   Période             : ${stats.startDate} → ${stats.endDate}`);

// Top casinos
console.log('\n🎰 TOP CASINOS PAR NOMBRE DE TOURNOIS');
console.log('─────────────────────────────────────────────────────────');
const topCasinos = db.prepare(`
  SELECT casino, COUNT(*) as count
  FROM scraped_tournaments
  GROUP BY casino
  ORDER BY count DESC
  LIMIT 10
`).all();

topCasinos.forEach((c, i) => {
  console.log(`   ${(i + 1).toString().padStart(2)}. ${c.casino.padEnd(40)} ${c.count} tournois`);
});

// Distribution par buy-in
console.log('\n💰 DISTRIBUTION PAR BUY-IN');
console.log('─────────────────────────────────────────────────────────');
const buyInRanges = [
  { min: 0, max: 100, label: '$0 - $100' },
  { min: 101, max: 200, label: '$101 - $200' },
  { min: 201, max: 300, label: '$201 - $300' },
  { min: 301, max: 500, label: '$301 - $500' },
  { min: 501, max: 10000, label: '$500+' }
];

buyInRanges.forEach(range => {
  const count = db.prepare(`
    SELECT COUNT(*) as count
    FROM scraped_tournaments
    WHERE buyIn >= ? AND buyIn <= ?
  `).get(range.min, range.max);

  const bar = '█'.repeat(Math.floor(count.count / 5));
  console.log(`   ${range.label.padEnd(15)} : ${count.count.toString().padStart(3)} tournois ${bar}`);
});

// Tournois par heure
console.log('\n⏰ HORAIRES POPULAIRES');
console.log('─────────────────────────────────────────────────────────');
const timeSlots = db.prepare(`
  SELECT
    CASE
      WHEN CAST(substr(time, 1, 2) AS INTEGER) < 12 THEN 'Matin (avant 12h)'
      WHEN CAST(substr(time, 1, 2) AS INTEGER) < 18 THEN 'Après-midi (12h-18h)'
      ELSE 'Soir (après 18h)'
    END as period,
    COUNT(*) as count
  FROM scraped_tournaments
  GROUP BY period
  ORDER BY count DESC
`).all();

timeSlots.forEach(slot => {
  const bar = '█'.repeat(Math.floor(slot.count / 3));
  console.log(`   ${slot.period.padEnd(25)} : ${slot.count.toString().padStart(3)} tournois ${bar}`);
});

// Exemples de tournois
console.log('\n📋 EXEMPLES DE TOURNOIS');
console.log('─────────────────────────────────────────────────────────');
const examples = db.prepare(`
  SELECT casino, date, time, buyIn
  FROM scraped_tournaments
  ORDER BY buyIn DESC
  LIMIT 5
`).all();

console.log('\n   Top 5 par Buy-in:');
examples.forEach((t, i) => {
  console.log(`   ${i + 1}. $${t.buyIn.toString().padStart(4)} - ${t.casino} - ${t.time.substring(0, 5)}`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   ✅ Données prêtes à être utilisées dans l\'application');
console.log('   📡 API disponible: http://localhost:3000/api/scraped-tournaments');
console.log('═══════════════════════════════════════════════════════════\n');

db.close();
