import puppeteer from 'puppeteer';
import fs from 'fs';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseBuyIn(buyInText) {
  if (!buyInText) return null;
  // Retirer le $ et toutes les virgules
  const match = buyInText.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

function parseTime(timeText) {
  if (!timeText) return null;
  const match = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return null;

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours);

  if (period.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

function parseDate(dateText) {
  if (!dateText) return '2026-06-04';

  try {
    const match = dateText.match(/\((\d{1,2})\/(\d{1,2})\)/);
    if (match) {
      const [_, month, day] = match;
      return `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (err) {
    // Ignorer
  }

  return '2026-06-04';
}

async function scrapePokerAtlas() {
  console.log('🚀 Démarrage du scraper PokerAtlas ciblé...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('📱 Navigation vers PokerAtlas...');

    // Naviguer avec une plage de dates dans l'URL si possible
    const startDate = '2026-06-04';
    const endDate = '2026-06-12';

    await page.goto(`https://www.pokeratlas.com/poker-tournaments/las-vegas?date=${startDate}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('✅ Page chargée!\n');
    console.log(`📅 Recherche de tournois du ${startDate} au ${endDate}\n`);
    await wait(3000);

    // Cliquer sur "Afficher plus" ou "Load more" si présent
    try {
      const loadMoreButton = await page.$('button:has-text("Load"), button:has-text("More"), button:has-text("Afficher"), .load-more, #load-more');
      if (loadMoreButton) {
        console.log('🔘 Bouton "Afficher plus" trouvé, clic...\n');
        for (let i = 0; i < 20; i++) {
          await loadMoreButton.click();
          await wait(2000);
          const itemsCount = await page.evaluate(() => document.querySelectorAll('li.tournament-item').length);
          console.log(`   Clic ${i + 1} - ${itemsCount} tournois chargés`);
        }
      }
    } catch (err) {
      console.log('ℹ️  Pas de bouton "Afficher plus" trouvé\n');
    }

    // Scroll intensif pour charger TOUS les tournois (toutes les dates)
    console.log('📜 Scroll intensif pour charger TOUS les tournois de TOUTES les dates...\n');

    let previousItemsCount = 0;
    let scrollCount = 0;
    let noNewItemsCount = 0;
    const maxScrolls = 100; // Beaucoup plus de scrolls

    while (scrollCount < maxScrolls) {
      // Compter les tournois AVANT le scroll
      const itemsBeforeScroll = await page.evaluate(() => {
        return document.querySelectorAll('li.tournament-item, .tournament-item').length;
      });

      // Scroll vers le bas
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 2); // Scroll plus grand
      });

      // Attendre le chargement du contenu lazy-loaded
      await wait(3000);

      // Compter les tournois APRÈS le scroll
      const itemsAfterScroll = await page.evaluate(() => {
        return document.querySelectorAll('li.tournament-item, .tournament-item').length;
      });

      if (itemsAfterScroll === previousItemsCount) {
        noNewItemsCount++;
        console.log(`   Scroll ${scrollCount + 1} - Aucun nouveau tournoi chargé (${noNewItemsCount}/10) - Total: ${itemsAfterScroll}`);

        if (noNewItemsCount >= 10) {
          console.log('✅ Tous les tournois ont été chargés !\n');
          break;
        }
      } else {
        const newItems = itemsAfterScroll - previousItemsCount;
        noNewItemsCount = 0;
        console.log(`   Scroll ${scrollCount + 1} - +${newItems} nouveaux tournois - Total: ${itemsAfterScroll}`);
      }

      previousItemsCount = itemsAfterScroll;
      scrollCount++;
    }

    console.log(`\n✅ Scroll terminé après ${scrollCount} itérations - ${previousItemsCount} tournois chargés\n`);

    console.log('🎯 Extraction des tournois avec la structure HTML spécifique...\n');

    const tournaments = await page.evaluate(() => {
      const results = [];

      // Cibler spécifiquement les <li class="tournament-item">
      const tournamentItems = document.querySelectorAll('li.tournament-item, .tournament-item');

      console.log(`Trouvé ${tournamentItems.length} tournament-item`);

      tournamentItems.forEach((item, index) => {
        try {
          // Casino name
          const venueNameEl = item.querySelector('.venue-name, h2.venue-name');
          const casino = venueNameEl ? venueNameEl.textContent.trim() : '';

          // Time - dans <span class="time">
          const timeEl = item.querySelector('.time, span.time, li.detail.start .time');
          const time = timeEl ? timeEl.textContent.trim() : '';

          // Date - dans <span class="date">
          const dateEl = item.querySelector('.date, span.date, li.detail.start .date');
          const date = dateEl ? dateEl.textContent.trim() : '';

          // Buy-in - CIBLE SPÉCIFIQUE: <li class="detail buy-in">
          const buyInEl = item.querySelector('li.detail.buy-in, .detail.buy-in');
          const buyIn = buyInEl ? buyInEl.textContent.trim() : '';

          // Structure - <ul class="details structure-info">
          let structure = {
            chips: '',
            levels: '',
            guarantee: ''
          };

          const structureInfoEl = item.querySelector('.structure-info, ul.structure-info');
          if (structureInfoEl) {
            const details = structureInfoEl.querySelectorAll('.detail, li.detail');
            details.forEach(detail => {
              const text = detail.textContent.trim();

              // Détecter les chips
              if (text.toLowerCase().includes('chip')) {
                structure.chips = text;
              }
              // Détecter les niveaux
              else if (text.toLowerCase().includes('niveau') || text.toLowerCase().includes('min')) {
                structure.levels = text;
              }
              // Détecter la garantie
              else if ((text.includes('$') || text.includes('K')) && (text.toLowerCase().includes('gtd') || text.toLowerCase().includes('guaranteed'))) {
                // Extraire le titre de l'abbr si présent
                const abbrEl = detail.querySelector('abbr');
                structure.guarantee = abbrEl ? (abbrEl.getAttribute('title') || text) : text;
              }
            });
          }

          if (casino && (time || buyIn)) {
            results.push({
              casino,
              time,
              buyIn,
              date,
              structure,
              source: 'tournament-item',
              hasStructure: !!(structure.chips || structure.levels || structure.guarantee)
            });
          }
        } catch (err) {
          console.error(`Erreur élément ${index}:`, err.message);
        }
      });

      return results;
    });

    console.log(`✅ ${tournaments.length} tournois extraits\n`);

    // Formater les données
    const formattedTournaments = tournaments.map(t => {
      const formatted = {
        casino: t.casino,
        date: parseDate(t.date),
        time: parseTime(t.time) || '12:00:00',
        buyIn: parseBuyIn(t.buyIn) || 0,
        levels: null
      };

      // Ajouter la structure si disponible
      if (t.structure && (t.structure.chips || t.structure.levels || t.structure.guarantee)) {
        formatted.structure = {
          chips: t.structure.chips || null,
          levels: t.structure.levels || null,
          guarantee: t.structure.guarantee || null
        };
      }

      return formatted;
    });

    // Afficher un aperçu
    console.log('📋 Aperçu des tournois:');
    formattedTournaments.slice(0, 10).forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.casino}`);
      console.log(`   Date: ${t.date}`);
      console.log(`   Heure: ${t.time}`);
      console.log(`   Buy-in: $${t.buyIn}`);
      if (t.structure) {
        console.log(`   Structure:`);
        if (t.structure.chips) console.log(`     - Chips: ${t.structure.chips}`);
        if (t.structure.levels) console.log(`     - Niveaux: ${t.structure.levels}`);
        if (t.structure.guarantee) console.log(`     - Garantie: ${t.structure.guarantee}`);
      }
    });

    // Sauvegarder
    fs.writeFileSync('poker-tournaments.json', JSON.stringify(formattedTournaments, null, 2));
    console.log(`\n💾 Données sauvegardées dans poker-tournaments.json`);

    // Statistiques
    const withStructure = formattedTournaments.filter(t => t.structure).length;
    const uniqueCasinos = new Set(formattedTournaments.map(t => t.casino)).size;
    const avgBuyIn = Math.round(
      formattedTournaments.reduce((sum, t) => sum + t.buyIn, 0) / formattedTournaments.length
    );

    console.log('\n📈 Statistiques:');
    console.log(`   Total tournois: ${formattedTournaments.length}`);
    console.log(`   Avec structure: ${withStructure}`);
    console.log(`   Casinos uniques: ${uniqueCasinos}`);
    console.log(`   Buy-in moyen: $${avgBuyIn}`);

    return formattedTournaments;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    console.log('\n🔚 Fermeture du navigateur...');
    await browser.close();
  }
}

// Exécution
scrapePokerAtlas()
  .then(tournaments => {
    console.log('\n✅ Scraping terminé avec succès!');
    console.log(`${tournaments.length} tournois extraits`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
