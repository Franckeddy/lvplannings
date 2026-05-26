import puppeteer from 'puppeteer';
import fs from 'fs';

// Configuration
const CONFIG = {
  username: 'franck.bleuzen@gmail.com',
  password: 'Pokernumber1!',
  targetDates: {
    start: '2026-06-04',
    end: '2026-06-12'
  }
};

// Fonction pour attendre un délai
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour parser le buy-in
function parseBuyIn(buyInText) {
  if (!buyInText) return null;
  const match = buyInText.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(',', '')) : null;
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

// Fonction pour convertir une date au format YYYY-MM-DD
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function scrapePokerAtlas() {
  console.log('🚀 Démarrage du scraper PokerAtlas...\n');

  const browser = await puppeteer.launch({
    headless: false, // Mode visible pour debug
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();

    // Configuration du user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('📱 Navigation vers PokerAtlas...');
    await page.goto('https://www.pokeratlas.com/poker-tournaments/las-vegas', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Connexion
    console.log('🔑 Connexion en cours...');

    // Chercher les différents sélecteurs possibles pour le bouton de connexion
    const loginSelectors = [
      'a[href="/signin"]',
      'a[href*="signin"]',
      'a[href*="login"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      '.login-button',
      '#login',
      '[data-test="login"]',
      'nav a:has-text("Sign In")'
    ];

    let loginButtonFound = false;
    for (const selector of loginSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Bouton de connexion trouvé: ${selector}`);
          await element.click();
          loginButtonFound = true;
          await wait(2000);
          break;
        }
      } catch (err) {
        // Continuer avec le prochain sélecteur
      }
    }

    if (!loginButtonFound) {
      // Chercher tous les liens et boutons pour debug
      console.log('⚠️  Bouton de connexion non trouvé. Inspection de la page...');
      const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        })).filter(link => link.text.toLowerCase().includes('sign') || link.text.toLowerCase().includes('log'));
      });
      console.log('Liens trouvés:', allLinks);

      // Demander à l'utilisateur de se connecter manuellement
      console.log('\n💡 Veuillez vous connecter manuellement dans la fenêtre du navigateur');
      console.log('   Le scraper attendra 30 secondes...\n');
      await wait(30000);
    } else {
      // Remplir le formulaire
      try {
        await page.waitForSelector('input[name="email"], input[type="email"], #email', { timeout: 10000 });

        // Trouver le champ email
        const emailInput = await page.$('input[name="email"]') ||
                          await page.$('input[type="email"]') ||
                          await page.$('#email');

        if (emailInput) {
          await emailInput.type(CONFIG.username);
        }

        // Trouver le champ mot de passe
        const passwordInput = await page.$('input[name="password"]') ||
                             await page.$('input[type="password"]') ||
                             await page.$('#password');

        if (passwordInput) {
          await passwordInput.type(CONFIG.password);
        }

        // Soumettre
        const submitButton = await page.$('button[type="submit"]') ||
                            await page.$('input[type="submit"]') ||
                            await page.$('button:has-text("Sign In")');

        if (submitButton) {
          await submitButton.click();
          await wait(3000);
        }

        console.log('✅ Connecté avec succès!\n');
      } catch (err) {
        console.log('⚠️  Erreur lors du remplissage du formulaire');
        console.log('   Veuillez vous connecter manuellement');
        console.log('   Le scraper attendra 30 secondes...\n');
        await wait(30000);
      }
    }

    // Retour à la page des tournois
    await page.goto('https://www.pokeratlas.com/poker-tournaments/las-vegas', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await wait(2000);

    // Chercher le sélecteur de date
    console.log('📅 Recherche du sélecteur de date...');

    // Essayer de trouver un calendrier ou date picker
    const dateSelectors = [
      'input[type="date"]',
      '.date-picker',
      '#tournament-date',
      '[aria-label*="date"]',
      '[placeholder*="date"]',
      'button[aria-label*="calendar"]'
    ];

    let dateInputFound = false;
    for (const selector of dateSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ Trouvé sélecteur de date: ${selector}`);
        dateInputFound = true;

        // Essayer de définir la date
        try {
          await page.evaluate((sel, date) => {
            const input = document.querySelector(sel);
            if (input) {
              input.value = date;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, selector, CONFIG.targetDates.start);

          await wait(2000);
          console.log(`📅 Date définie: ${CONFIG.targetDates.start}`);
        } catch (err) {
          console.log(`⚠️  Impossible de définir la date avec ${selector}`);
        }
        break;
      }
    }

    if (!dateInputFound) {
      console.log('⚠️  Aucun sélecteur de date trouvé - utilisation de la page actuelle');
      console.log('💡 Astuce: Vous pouvez naviguer manuellement vers la date souhaitée');
      console.log('   Le scraper attendra 10 secondes pour vous permettre de le faire...\n');
      await wait(10000);
    }

    // Extraction des tournois
    console.log('🎰 Extraction des tournois...\n');

    const tournaments = await page.evaluate(() => {
      const results = [];

      // Chercher tous les éléments de tournoi
      const tournamentElements = document.querySelectorAll('.tournament-row, .tournament-item, [data-tournament], .venue-container');

      console.log(`Trouvé ${tournamentElements.length} éléments potentiels`);

      tournamentElements.forEach((element, index) => {
        try {
          // Extraire le casino
          let casino = '';
          const casinoSelectors = [
            '.venue-name',
            '.casino-name',
            'h2',
            'h3',
            '[data-venue]'
          ];

          for (const selector of casinoSelectors) {
            const casinoEl = element.querySelector(selector);
            if (casinoEl && casinoEl.textContent.trim()) {
              casino = casinoEl.textContent.trim();
              break;
            }
          }

          // Extraire l'heure
          let time = '';
          const timeSelectors = [
            '.tournament-time',
            '.time',
            '[data-time]',
            '.start-time'
          ];

          for (const selector of timeSelectors) {
            const timeEl = element.querySelector(selector);
            if (timeEl && timeEl.textContent.trim()) {
              time = timeEl.textContent.trim();
              break;
            }
          }

          // Si pas trouvé, chercher un pattern d'heure dans le texte
          if (!time) {
            const text = element.textContent;
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]m)/i);
            if (timeMatch) {
              time = timeMatch[1];
            }
          }

          // Extraire le buy-in
          let buyIn = '';
          const buyInSelectors = [
            '.detail.buy-in',
            'li.buy-in',
            '.buy-in',
            '.buyin',
            '[data-buyin]',
            '.price',
            '.cost'
          ];

          for (const selector of buyInSelectors) {
            const buyInEl = element.querySelector(selector);
            if (buyInEl && buyInEl.textContent.trim()) {
              buyIn = buyInEl.textContent.trim();
              break;
            }
          }

          // Si pas trouvé, chercher un pattern de prix dans le texte
          if (!buyIn) {
            const text = element.textContent;
            const priceMatch = text.match(/\$[\d,]+/);
            if (priceMatch) {
              buyIn = priceMatch[0];
            }
          }

          // Extraire la date si disponible
          let date = '';
          const dateSelectors = [
            '.tournament-date',
            '.date',
            '[data-date]'
          ];

          for (const selector of dateSelectors) {
            const dateEl = element.querySelector(selector);
            if (dateEl && dateEl.textContent.trim()) {
              date = dateEl.textContent.trim();
              break;
            }
          }

          // Extraire la structure (chips, niveaux, garantie)
          let structure = {
            chips: '',
            levels: '',
            guarantee: ''
          };

          const structureInfoEl = element.querySelector('.structure-info');
          if (structureInfoEl) {
            const details = structureInfoEl.querySelectorAll('.detail');
            details.forEach(detail => {
              const text = detail.textContent.trim();

              // Détecter les chips (ex: "30 000 chip")
              if (text.toLowerCase().includes('chip')) {
                structure.chips = text;
              }
              // Détecter les niveaux (ex: "20 niveaux min")
              else if (text.toLowerCase().includes('niveau')) {
                structure.levels = text;
              }
              // Détecter la garantie (ex: "$15K Gtd" ou "$15,000 Guaranteed")
              else if (text.includes('$') && (text.toLowerCase().includes('gtd') || text.toLowerCase().includes('guaranteed'))) {
                // Extraire le texte de l'abbr si présent
                const abbrEl = detail.querySelector('abbr');
                structure.guarantee = abbrEl ? abbrEl.getAttribute('title') || text : text;
              }
            });
          }

          if (casino || time || buyIn) {
            results.push({
              casino,
              time,
              buyIn,
              date,
              structure,
              rawHTML: element.innerHTML.substring(0, 200) // Pour debug
            });
          }
        } catch (err) {
          console.error(`Erreur élément ${index}:`, err.message);
        }
      });

      return results;
    });

    console.log(`✅ ${tournaments.length} tournois trouvés\n`);

    // Afficher les premiers résultats
    console.log('📊 Aperçu des données extraites:\n');
    tournaments.slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. ${t.casino || 'N/A'}`);
      console.log(`   Heure: ${t.time || 'N/A'}`);
      console.log(`   Buy-in: ${t.buyIn || 'N/A'}`);
      console.log(`   Date: ${t.date || 'N/A'}`);
      if (t.structure) {
        console.log(`   Structure:`);
        if (t.structure.chips) console.log(`     - Chips: ${t.structure.chips}`);
        if (t.structure.levels) console.log(`     - Niveaux: ${t.structure.levels}`);
        if (t.structure.guarantee) console.log(`     - Garantie: ${t.structure.guarantee}`);
      }
      console.log('');
    });

    // Parser et formater les données
    const formattedTournaments = tournaments.map(t => {
      const formatted = {
        casino: t.casino || 'Unknown',
        date: formatDate(CONFIG.targetDates.start), // Pour l'instant, utiliser la date de début
        time: parseTime(t.time) || '12:00:00',
        buyIn: parseBuyIn(t.buyIn) || 0,
        rawData: t
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
    }).filter(t => t.casino !== 'Unknown' && t.buyIn > 0);

    // Sauvegarder dans un fichier JSON
    const outputFile = 'poker-tournaments.json';
    fs.writeFileSync(outputFile, JSON.stringify(formattedTournaments, null, 2));
    console.log(`💾 Données sauvegardées dans ${outputFile}\n`);

    // Afficher les statistiques
    console.log('📈 Statistiques:');
    console.log(`   Total tournois: ${formattedTournaments.length}`);
    console.log(`   Casinos uniques: ${new Set(formattedTournaments.map(t => t.casino)).size}`);
    console.log(`   Buy-in moyen: $${Math.round(formattedTournaments.reduce((sum, t) => sum + t.buyIn, 0) / formattedTournaments.length)}`);

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
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

export { scrapePokerAtlas };
