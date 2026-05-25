import Database from 'better-sqlite3';

const db = new Database('database.db');

console.log('🔧 Ajout de la colonne "levels" à la table scraped_tournaments...\n');

try {
  // Vérifier si la colonne existe déjà
  const tableInfo = db.prepare("PRAGMA table_info(scraped_tournaments)").all();
  const hasLevels = tableInfo.some(col => col.name === 'levels');

  if (hasLevels) {
    console.log('✅ La colonne "levels" existe déjà.');
  } else {
    // Ajouter la colonne levels
    db.prepare(`
      ALTER TABLE scraped_tournaments
      ADD COLUMN levels TEXT DEFAULT '15 mn'
    `).run();

    console.log('✅ Colonne "levels" ajoutée avec succès!');
    console.log('   Valeur par défaut: "15 mn"');
  }

  // Afficher la nouvelle structure
  console.log('\n📋 Structure de la table:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(scraped_tournaments)").all();
  updatedTableInfo.forEach(col => {
    console.log(`   - ${col.name} (${col.type})${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
  });

  // Afficher quelques exemples
  console.log('\n📊 Exemples de tournois avec niveaux:');
  const examples = db.prepare(`
    SELECT casino, date, time, buyIn, levels
    FROM scraped_tournaments
    LIMIT 5
  `).all();

  examples.forEach((t, i) => {
    console.log(`\n   ${i + 1}. ${t.casino}`);
    console.log(`      ${t.date} à ${t.time}`);
    console.log(`      Buy-in: $${t.buyIn}`);
    console.log(`      Niveaux: ${t.levels}`);
  });

  console.log('\n✅ Migration terminée!');

} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  db.close();
}
