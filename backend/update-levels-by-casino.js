import Database from 'better-sqlite3';

const db = new Database('database.db');

console.log('🎰 Mise à jour des niveaux par casino...\n');

// Mapping des niveaux standards par casino et buy-in
const levelsMappingByPrice = {
  // Tournois économiques ($1-$100)
  low: '15 mn',
  // Tournois moyens ($101-$300)
  medium: '20 mn',
  // Tournois élevés ($301-$500)
  high: '30 mn',
  // Tournois premium ($500+)
  premium: '40 mn'
};

const casinoSpecificLevels = {
  'World Series of Poker': (buyIn) => {
    if (buyIn >= 1000) return '60 mn';
    if (buyIn >= 500) return '40 mn';
    return '30 mn';
  },
  'Aria Casino': (buyIn) => {
    if (buyIn >= 300) return '30 mn';
    return '25 mn';
  },
  'Venetian Las Vegas': (buyIn) => {
    if (buyIn >= 500) return '40 mn';
    return '30 mn';
  },
  'Wynn Las Vegas': (buyIn) => {
    if (buyIn >= 500) return '40 mn';
    return '30 mn';
  },
  'Bellagio Casino': (buyIn) => {
    if (buyIn >= 500) return '40 mn';
    return '30 mn';
  },
  'The Orleans Casino': () => '30 mn',
  'Horseshoe Las Vegas': (buyIn) => {
    if (buyIn >= 300) return '30 mn';
    return '20 mn';
  },
  'Caesars Palace': (buyIn) => {
    if (buyIn >= 300) return '30 mn';
    return '20 mn';
  },
  'MGM Grand': (buyIn) => {
    if (buyIn >= 300) return '30 mn';
    return '20 mn';
  },
  'Mandalay Bay': (buyIn) => {
    if (buyIn >= 300) return '30 mn';
    return '20 mn';
  },
  'Westgate Las Vegas Resort & Casino': () => '20 mn',
  'South Point Casino': () => '20 mn',
  'Red Rock Casino': () => '20 mn'
};

// Fonction pour déterminer les niveaux
function determineLevels(casino, buyIn) {
  // Si mapping spécifique au casino
  if (casinoSpecificLevels[casino]) {
    return casinoSpecificLevels[casino](buyIn);
  }

  // Sinon, mapping par prix
  if (buyIn <= 100) return levelsMappingByPrice.low;
  if (buyIn <= 300) return levelsMappingByPrice.medium;
  if (buyIn <= 500) return levelsMappingByPrice.high;
  return levelsMappingByPrice.premium;
}

try {
  // Récupérer tous les tournois
  const tournaments = db.prepare(`
    SELECT id, casino, buyIn, levels
    FROM scraped_tournaments
  `).all();

  console.log(`📊 ${tournaments.length} tournois à mettre à jour\n`);

  // Préparer la requête de mise à jour
  const updateStmt = db.prepare(`
    UPDATE scraped_tournaments
    SET levels = ?
    WHERE id = ?
  `);

  // Transaction pour performances
  const updateAll = db.transaction(() => {
    let updated = 0;
    const changes = {};

    for (const tournament of tournaments) {
      const newLevels = determineLevels(tournament.casino, tournament.buyIn);

      if (newLevels !== tournament.levels) {
        updateStmt.run(newLevels, tournament.id);
        updated++;

        // Comptabiliser les changements par type
        if (!changes[newLevels]) changes[newLevels] = 0;
        changes[newLevels]++;
      }
    }

    return { updated, changes };
  });

  const result = updateAll();

  console.log(`✅ ${result.updated} tournois mis à jour\n`);

  console.log('📈 Distribution des niveaux:');
  Object.entries(result.changes).sort().forEach(([levels, count]) => {
    const bar = '█'.repeat(Math.floor(count / 10));
    console.log(`   ${levels.padEnd(10)} : ${count.toString().padStart(3)} tournois ${bar}`);
  });

  // Afficher quelques exemples par catégorie
  console.log('\n📋 Exemples par casino:\n');

  const examples = db.prepare(`
    SELECT DISTINCT casino, buyIn, levels
    FROM scraped_tournaments
    GROUP BY casino, levels
    ORDER BY casino, buyIn DESC
  `).all();

  let currentCasino = '';
  examples.forEach(ex => {
    if (ex.casino !== currentCasino) {
      currentCasino = ex.casino;
      console.log(`\n   🎰 ${ex.casino}:`);
    }
    console.log(`      $${ex.buyIn.toString().padStart(4)} → ${ex.levels}`);
  });

  // Statistiques finales
  console.log('\n\n📊 Statistiques globales:');
  const stats = db.prepare(`
    SELECT
      levels,
      COUNT(*) as count,
      AVG(buyIn) as avgBuyIn,
      MIN(buyIn) as minBuyIn,
      MAX(buyIn) as maxBuyIn
    FROM scraped_tournaments
    GROUP BY levels
    ORDER BY avgBuyIn
  `).all();

  stats.forEach(stat => {
    console.log(`\n   ${stat.levels}:`);
    console.log(`      Tournois: ${stat.count}`);
    console.log(`      Buy-in moyen: $${Math.round(stat.avgBuyIn)}`);
    console.log(`      Fourchette: $${stat.minBuyIn} - $${stat.maxBuyIn}`);
  });

  console.log('\n✅ Mise à jour des niveaux terminée!');

} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  db.close();
}
