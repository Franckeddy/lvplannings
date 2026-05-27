import puppeteer from 'puppeteer';
import fs from 'fs';

// Configuration
const CONFIG = {
  baseUrl: 'https://fr.pokeratlas.com/poker-tournaments/las-vegas',
  scrollDelay: 2000,
  maxScrolls: 20,
  outputFile: 'poker-tournaments-june-6-12.json'
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour parser le buy-in
function parseBuyIn(buyInText) {
  if (!buyInText) return null;
  const match = buyInText.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

// Fonction pour parser l'heure au format HH:MM:SS
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

// Fonction pour extraire les tournois d'une page
async function extractTournamentsFromPage(page, targetDate) {
  console.log(`\n📅 Extraction pour ${targetDate}...`);

  const tournaments = await page.evaluate(() => {
    const results = [];
    const tournamentItems = document.querySelectorAll('li.tournament-item');

    tournamentItems.forEach((item) => {
      try {
        const venueNameEl = item.querySelector('.venue-name, h2.venue-name');
        const casino = venueNameEl ? venueNameEl.textContent.trim() : '';

        const timeEl = item.querySelector('.time, span.time');
        const time = timeEl ? timeEl.textContent.trim() : '';

        const buyInEl = item.querySelector('li.detail.buy-in, .detail.buy-in');
        const buyIn = buyInEl ? buyInEl.textContent.trim() : '';

        let structure = { chips: '', levels: '', guarantee: '' };

        const structureInfoEl = item.querySelector('.structure-info, ul.structure-info');
        if (structureInfoEl) {
          const details = structureInfoEl.querySelectorAll('.detail, li.detail');
          details.forEach(detail => {
            const text = detail.textContent.trim();

            if (text.toLowerCase().includes('chip')) {
              structure.chips = text;
            } else if (text.toLowerCase().includes('niveau') || text.toLowerCase().includes('min')) {
              structure.levels = text;
            } else if ((text.includes('$') || text.includes('K')) &&
                       (text.toLowerCase().includes('gtd') || text.toLowerCase().includes('guaranteed'))) {
              const abbrEl = detail.querySelector('abbr');
              structure.guarantee = abbrEl ? (abbrEl.getAttribute('title') || text) : text;
            }
          });
        }

        if (casino && (time || buyIn)) {
          results.push({ casino, time, buyIn, structure });
        }
      } catch (err) {}
    });

    return results;
  });

  // Formater les données
  return tournaments.map(t => {
    const formatted = {
      casino: t.casino,
      date: targetDate,
      time: parseTime(t.time) || '12:00:00',
      buyIn: parseBuyIn(t.buyIn) || 0,
      levels: null
    };

    if (t.structure && (t.structure.chips || t.structure.levels || t.structure.guarantee)) {
      formatted.structure = {
        chips: t.structure.chips || null,
        levels: t.structure.levels || null,
        guarantee: t.structure.guarantee || null
      };
    }

    return formatted;
  });
}

// Fonction pour naviguer vers une date spécifique
async function navigateToDate(page, dateString) {
  console.log(`\n🔍 Navigation vers ${dateString}...`);

  const url = `${CONFIG.baseUrl}?date=${dateString}`;
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await wait(3000);

  // Scroll pour charger tous les tournois
  let previousHeight = 0;
  let scrollCount = 0;
  let noNewContentCount = 0;

  while (scrollCount < CONFIG.maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await wait(CONFIG.scrollDelay);

    const newHeight = await page.evaluate(() => document.body.scrollHeight);

    if (newHeight === previousHeight) {
      noNewContentCount++;
      if (noNewContentCount >= 3) {
        break;
      }
    } else {
      noNewContentCount = 0;
    }

    previousHeight = newHeight;
    scrollCount++;
  }

  // Retour en haut
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(1000);
}

async function scrapeJune6to12() {
  console.log('🚀 Démarrage du scraper pour le 6-12 juin 2026...\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const allTournaments = [];

  try {
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Dates du 6 au 12 juin
    const dates = [
      '2026-06-06',
      '2026-06-07',
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12'
    ];

    for (const date of dates) {
      try {
        await navigateToDate(page, date);
        const tournaments = await extractTournamentsFromPage(page, date);

        console.log(`   ✅ ${tournaments.length} tournois extraits pour ${date}`);
        allTournaments.push(...tournaments);

        await wait(2000); // Pause entre les dates
      } catch (error) {
        console.error(`   ❌ Erreur pour ${date}:`, error.message);
        // Continuer avec les autres dates
      }
    }

    // Sauvegarder
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(allTournaments, null, 2));
    console.log(`\n💾 ${allTournaments.length} tournois sauvegardés dans ${CONFIG.outputFile}`);

    // Statistiques
    const byDate = {};
    allTournaments.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = 0;
      byDate[t.date]++;
    });

    console.log('\n📊 Répartition par date:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`   ${date}: ${byDate[date]} tournois`);
    });

    const withStructure = allTournaments.filter(t => t.structure).length;
    console.log(`\n✅ Total: ${allTournaments.length} tournois`);
    console.log(`   Avec structure: ${withStructure}`);

    return allTournaments;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Exécution
scrapeJune6to12()
  .then(tournaments => {
    console.log('\n✅ Scraping terminé avec succès!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error.message);
    console.log('\n⚠️  Si le scraping automatique échoue, fournissez le HTML manuellement.');
    process.exit(1);
  });
