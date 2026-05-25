import puppeteer from 'puppeteer';
import fs from 'fs';

// Configuration
const CONFIG = {
  url: 'https://www.pokeratlas.com/poker-tournaments/las-vegas',
  scrollDelay: 2000, // Temps d'attente après chaque scroll
  maxScrolls: 20, // Nombre maximum de scrolls
  outputFile: 'poker-tournaments.json'
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

// Fonction pour parser la date
function parseDate(dateText) {
  if (!dateText) return null;

  try {
    // Format attendu: "May 24" ou "Jun 4" etc.
    const match = dateText.match(/([A-Za-z]+)\s+(\d+)/);
    if (!match) return null;

    const [_, month, day] = match;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    const monthNum = monthMap[month.toLowerCase().substring(0, 3)];
    if (!monthNum) return null;

    // Utiliser l'année 2026
    return `2026-${monthNum}-${day.padStart(2, '0')}`;
  } catch (err) {
    return null;
  }
}

async function scrapePokerAtlasWithScroll() {
  console.log('🚀 Démarrage du scraper PokerAtlas avec scroll...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();

    // Configuration pour éviter la détection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('📱 Navigation vers PokerAtlas...');
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('✅ Page chargée!\n');
    await wait(3000);

    // Prendre une capture d'écran initiale
    await page.screenshot({ path: 'pokeratlas-initial.png' });
    console.log('📸 Capture d\'écran initiale: pokeratlas-initial.png\n');

    // Fonction de scroll progressif
    console.log('📜 Début du scroll progressif...\n');

    let previousHeight = 0;
    let scrollCount = 0;
    let noNewContentCount = 0;

    while (scrollCount < CONFIG.maxScrolls) {
      // Obtenir la hauteur actuelle
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);

      console.log(`Scroll ${scrollCount + 1}/${CONFIG.maxScrolls} - Hauteur: ${currentHeight}px`);

      // Scroll vers le bas
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      // Attendre le chargement
      await wait(CONFIG.scrollDelay);

      // Vérifier si de nouveau contenu a été chargé
      const newHeight = await page.evaluate(() => document.body.scrollHeight);

      if (newHeight === previousHeight) {
        noNewContentCount++;
        console.log(`⚠️  Pas de nouveau contenu (${noNewContentCount}/3)`);

        if (noNewContentCount >= 3) {
          console.log('✅ Fin de la page atteinte\n');
          break;
        }
      } else {
        noNewContentCount = 0;
      }

      previousHeight = newHeight;
      scrollCount++;

      // Vérifier le nombre de tournois chargés
      const tournamentsCount = await page.evaluate(() => {
        return document.querySelectorAll('[class*="tournament"], [class*="event"], .venue-container, tr').length;
      });
      console.log(`   → ${tournamentsCount} éléments détectés\n`);
    }

    // Retour en haut de la page
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(1000);

    console.log('🎯 Extraction des données...\n');

    // Extraire tous les tournois
    const tournaments = await page.evaluate(() => {
      const results = [];

      // Stratégie 1: Chercher des tables
      const tables = document.querySelectorAll('table');
      console.log(`Trouvé ${tables.length} tables`);

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 3) {
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());

            // Chercher des patterns
            const timePattern = /\d{1,2}:\d{2}\s*[ap]m/i;
            const pricePattern = /\$\d+/;
            const datePattern = /[A-Za-z]+\s+\d{1,2}/;

            let casino = '', time = '', buyIn = '', date = '';

            cellTexts.forEach(text => {
              if (timePattern.test(text)) time = text;
              if (pricePattern.test(text) && !buyIn) buyIn = text;
              if (datePattern.test(text)) date = text;
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

      // Stratégie 2: Chercher des divs avec classes spécifiques
      const tournaments = document.querySelectorAll('[class*="tournament"], [class*="event-"], .venue-container');
      console.log(`Trouvé ${tournaments.length} éléments avec classes tournament/event`);

      tournaments.forEach(el => {
        const text = el.textContent;
        const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]m)/i);
        const priceMatch = text.match(/\$(\d+)/);
        const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2})/);

        // Chercher le nom du casino
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
            date: dateMatch ? dateMatch[1] : '',
            source: 'div'
          });
        }
      });

      // Stratégie 3: Extraction par structure de liens
      const venueLinks = document.querySelectorAll('a[href*="/poker-room/"]');
      console.log(`Trouvé ${venueLinks.length} liens vers des venues`);

      venueLinks.forEach(link => {
        const parent = link.closest('tr, div, li');
        if (parent) {
          const text = parent.textContent;
          const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]m)/i);
          const priceMatch = text.match(/\$(\d+)/);
          const dateMatch = text.match(/([A-Za-z]+\s+\d{1,2})/);

          if (timeMatch || priceMatch) {
            results.push({
              casino: link.textContent.trim(),
              time: timeMatch ? timeMatch[1] : '',
              buyIn: priceMatch ? priceMatch[0] : '',
              date: dateMatch ? dateMatch[1] : '',
              source: 'link'
            });
          }
        }
      });

      return results;
    });

    console.log(`✅ ${tournaments.length} tournois bruts extraits\n`);

    // Filtrer et formater les données
    const formattedTournaments = tournaments
      .filter(t => t.casino && (t.time || t.buyIn))
      .map(t => {
        const parsedTime = parseTime(t.time);
        const parsedBuyIn = parseBuyIn(t.buyIn);
        const parsedDate = parseDate(t.date);

        return {
          casino: t.casino,
          date: parsedDate || '2026-06-04', // Date par défaut
          time: parsedTime || '12:00:00',
          buyIn: parsedBuyIn || 0,
          source: t.source,
          raw: t
        };
      })
      .filter((t, index, self) =>
        // Éviter les doublons
        index === self.findIndex(other =>
          other.casino === t.casino &&
          other.date === t.date &&
          other.time === t.time
        )
      );

    console.log(`📊 ${formattedTournaments.length} tournois uniques formatés\n`);

    // Afficher un aperçu
    console.log('📋 Aperçu des tournois:');
    formattedTournaments.slice(0, 10).forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.casino}`);
      console.log(`   Date: ${t.date}`);
      console.log(`   Heure: ${t.time}`);
      console.log(`   Buy-in: $${t.buyIn}`);
      console.log(`   Source: ${t.source}`);
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

    console.log('\n📈 Statistiques:');
    console.log(`   Total tournois: ${stats.total}`);
    console.log(`   Casinos uniques: ${stats.casinos}`);
    console.log(`   Dates différentes: ${stats.dates}`);
    console.log(`   Buy-in moyen: $${stats.avgBuyIn}`);

    // Capture d'écran finale
    await page.screenshot({ path: 'pokeratlas-final.png', fullPage: true });
    console.log('\n📸 Capture finale: pokeratlas-final.png');

    // Attendre avant de fermer pour inspection
    console.log('\n⏳ Navigateur ouvert 10 secondes pour inspection...');
    await wait(10000);

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
scrapePokerAtlasWithScroll()
  .then(tournaments => {
    console.log('\n✅ Scraping terminé avec succès!');
    console.log(`${tournaments.length} tournois extraits`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
  });

export { scrapePokerAtlasWithScroll };
