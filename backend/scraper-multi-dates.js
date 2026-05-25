import puppeteer from 'puppeteer';
import fs from 'fs';

// Configuration
const CONFIG = {
  url: 'https://www.pokeratlas.com/poker-tournaments/las-vegas',
  scrollDelay: 2000,
  maxScrolls: 20,
  outputFile: 'poker-tournaments-june.json',
  dates: {
    start: '2026-06-04',
    end: '2026-06-12'
  }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour générer les dates entre start et end
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(new Date(current).toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Fonction pour formater la date pour l'URL (format: 2026-06-04)
function formatDateForUrl(date) {
  return date; // PokerAtlas utilise le format YYYY-MM-DD
}

// Fonction pour parser le buy-in
function parseBuyIn(buyInText) {
  if (!buyInText) return null;
  const match = buyInText.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

// Fonction pour parser l'heure
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
  return await page.evaluate((date) => {
    const results = [];

    // Stratégie 1: Tables
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 3) {
          const cellTexts = Array.from(cells).map(c => c.textContent.trim());

          const timePattern = /\d{1,2}:\d{2}\s*[ap]m/i;
          const pricePattern = /\$\d+/;

          let casino = '', time = '', buyIn = '';

          cellTexts.forEach(text => {
            if (timePattern.test(text)) time = text;
            if (pricePattern.test(text) && !buyIn) buyIn = text;
            if (!time && !pricePattern.test(text) && text.length > 3 && text.length < 50) {
              casino = text;
            }
          });

          if (casino || time || buyIn) {
            results.push({ casino, time, buyIn, date, source: 'table' });
          }
        }
      });
    });

    // Stratégie 2: Divs avec classes
    const tournaments = document.querySelectorAll('[class*="tournament"], [class*="event-"]');
    tournaments.forEach(el => {
      const text = el.textContent;
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]m)/i);
      const priceMatch = text.match(/\$(\d+)/);

      const headings = el.querySelectorAll('h1, h2, h3, h4, strong, .venue-name, .casino-name');
      let casino = '';
      if (headings.length > 0) {
        casino = headings[0].textContent.trim();
      }

      if (timeMatch || priceMatch) {
        results.push({
          casino: casino || 'Unknown',
          time: timeMatch ? timeMatch[1] : '',
          buyIn: priceMatch ? priceMatch[0] : '',
          date,
          source: 'div'
        });
      }
    });

    // Stratégie 3: Liens vers venues
    const venueLinks = document.querySelectorAll('a[href*="/poker-room/"]');
    venueLinks.forEach(link => {
      const parent = link.closest('tr, div, li');
      if (parent) {
        const text = parent.textContent;
        const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]m)/i);
        const priceMatch = text.match(/\$(\d+)/);

        if (timeMatch || priceMatch) {
          results.push({
            casino: link.textContent.trim(),
            time: timeMatch ? timeMatch[1] : '',
            buyIn: priceMatch ? priceMatch[0] : '',
            date,
            source: 'link'
          });
        }
      }
    });

    return results;
  }, targetDate);
}

// Fonction pour naviguer vers une date spécifique
async function navigateToDate(page, date) {
  try {
    // Option 1: URL directe avec paramètre de date
    const urlWithDate = `${CONFIG.url}?date=${date}`;
    console.log(`   Tentative navigation vers: ${urlWithDate}`);

    await page.goto(urlWithDate, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await wait(2000);

    // Vérifier si on a bien la bonne date
    const pageDate = await page.evaluate(() => {
      // Chercher la date affichée sur la page
      const dateElements = document.querySelectorAll('[class*="date"], h1, h2');
      for (const el of dateElements) {
        const text = el.textContent;
        if (text.match(/\d{1,2}.*?(juin|june)/i)) {
          return text;
        }
      }
      return null;
    });

    console.log(`   Date détectée sur la page: ${pageDate || 'non trouvée'}`);
    return true;

  } catch (error) {
    console.error(`   ⚠️  Erreur navigation: ${error.message}`);
    return false;
  }
}

// Fonction de scroll avec chargement progressif
async function scrollAndLoad(page) {
  let previousHeight = 0;
  let scrollCount = 0;
  let noNewContentCount = 0;

  while (scrollCount < CONFIG.maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
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

async function scrapeMultipleDates() {
  console.log('🚀 Démarrage du scraper multi-dates PokerAtlas...');
  console.log(`📅 Période: ${CONFIG.dates.start} → ${CONFIG.dates.end}\n`);

  const dates = generateDateRange(CONFIG.dates.start, CONFIG.dates.end);
  console.log(`📋 ${dates.length} dates à scraper: ${dates.join(', ')}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  let allTournaments = [];

  try {
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Parcourir chaque date
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      console.log(`\n[${ i + 1}/${dates.length}] 📅 Scraping du ${date}...`);
      console.log('─────────────────────────────────────────────────────');

      // Naviguer vers cette date
      const success = await navigateToDate(page, date);

      if (!success) {
        console.log(`   ⚠️  Impossible d'accéder à cette date, passage à la suivante`);
        continue;
      }

      // Scroll pour charger tous les tournois
      console.log('   📜 Scroll en cours...');
      await scrollAndLoad(page);

      // Extraire les tournois
      console.log('   🎯 Extraction des données...');
      const tournaments = await extractTournamentsFromPage(page, date);

      console.log(`   ✅ ${tournaments.length} tournois bruts extraits`);

      allTournaments = allTournaments.concat(tournaments);

      // Capture d'écran pour cette date
      await page.screenshot({ path: `pokeratlas-${date}.png` });
      console.log(`   📸 Capture: pokeratlas-${date}.png`);

      // Pause entre les dates pour éviter la détection
      if (i < dates.length - 1) {
        console.log('   ⏳ Pause de 3 secondes...');
        await wait(3000);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`✅ ${allTournaments.length} tournois bruts extraits au total`);

    // Nettoyer et formater
    const formattedTournaments = allTournaments
      .filter(t => t.casino && (t.time || t.buyIn))
      .map(t => ({
        casino: t.casino,
        date: t.date,
        time: parseTime(t.time) || '12:00:00',
        buyIn: parseBuyIn(t.buyIn) || 0,
        source: t.source,
        raw: t
      }))
      .filter((t, index, self) =>
        // Éviter les doublons
        index === self.findIndex(other =>
          other.casino === t.casino &&
          other.date === t.date &&
          other.time === t.time
        )
      );

    console.log(`📊 ${formattedTournaments.length} tournois uniques formatés\n`);

    // Grouper par date
    const byDate = {};
    formattedTournaments.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });

    console.log('📅 Répartition par date:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`   ${date}: ${byDate[date].length} tournois`);
    });

    // Sauvegarder
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(formattedTournaments, null, 2));
    console.log(`\n💾 Données sauvegardées dans ${CONFIG.outputFile}`);

    // Statistiques
    const stats = {
      total: formattedTournaments.length,
      casinos: new Set(formattedTournaments.map(t => t.casino)).size,
      dates: new Set(formattedTournaments.map(t => t.date)).size,
      avgBuyIn: Math.round(
        formattedTournaments.reduce((sum, t) => sum + t.buyIn, 0) / formattedTournaments.length
      )
    };

    console.log('\n📈 Statistiques finales:');
    console.log(`   Total tournois: ${stats.total}`);
    console.log(`   Casinos uniques: ${stats.casinos}`);
    console.log(`   Dates différentes: ${stats.dates}`);
    console.log(`   Buy-in moyen: $${stats.avgBuyIn}`);

    return formattedTournaments;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    console.log('\n🔚 Fermeture du navigateur...');
    await browser.close();
  }
}

// Exécution
scrapeMultipleDates()
  .then(tournaments => {
    console.log('\n✅ Scraping multi-dates terminé avec succès!');
    console.log(`${tournaments.length} tournois extraits pour la période ${CONFIG.dates.start} - ${CONFIG.dates.end}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
  });

export { scrapeMultipleDates };
