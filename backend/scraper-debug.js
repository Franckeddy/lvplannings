import puppeteer from 'puppeteer';
import fs from 'fs';

// Configuration
const CONFIG = {
  username: 'franck.bleuzen@gmail.com',
  password: 'Pokernumber1!'
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function debugPokerAtlas() {
  console.log('🔍 Mode Debug - Inspection de PokerAtlas...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('📱 Navigation vers PokerAtlas...');
    await page.goto('https://www.pokeratlas.com/poker-tournaments/las-vegas', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await wait(3000);

    // Sauvegarder une capture d'écran
    await page.screenshot({ path: 'pokeratlas-page.png', fullPage: true });
    console.log('📸 Capture d\'écran sauvegardée: pokeratlas-page.png\n');

    // Extraire la structure HTML
    console.log('🔍 Analyse de la structure HTML...\n');

    const pageStructure = await page.evaluate(() => {
      const results = {
        title: document.title,
        url: window.location.href,
        mainContainers: [],
        tournamentElements: [],
        allClasses: new Set(),
        allIds: new Set()
      };

      // Trouver les conteneurs principaux
      const mainContainers = document.querySelectorAll('main, .main, #main, .content, .container, [role="main"]');
      results.mainContainers = Array.from(mainContainers).map(el => ({
        tag: el.tagName,
        class: el.className,
        id: el.id,
        childrenCount: el.children.length
      }));

      // Chercher des mots-clés liés aux tournois
      const keywords = ['tournament', 'venue', 'casino', 'buy', 'time', 'event'];
      const elementsWithKeywords = [];

      document.querySelectorAll('*').forEach(el => {
        const className = el.className || '';
        const id = el.id || '';

        // Collecter toutes les classes et IDs
        if (className) {
          className.split(' ').forEach(c => results.allClasses.add(c));
        }
        if (id) results.allIds.add(id);

        // Chercher les mots-clés
        keywords.forEach(keyword => {
          if (className.toLowerCase().includes(keyword) || id.toLowerCase().includes(keyword)) {
            elementsWithKeywords.push({
              tag: el.tagName,
              class: className,
              id: id,
              text: el.textContent?.substring(0, 100)
            });
          }
        });
      });

      results.tournamentElements = elementsWithKeywords.slice(0, 20); // Limiter à 20

      // Chercher des patterns de prix
      const allText = document.body.innerText;
      const priceMatches = allText.match(/\$\d+/g) || [];
      results.prices = priceMatches.slice(0, 10);

      // Chercher des patterns d'heure
      const timeMatches = allText.match(/\d{1,2}:\d{2}\s*[ap]m/gi) || [];
      results.times = timeMatches.slice(0, 10);

      return results;
    });

    console.log('📊 Structure de la page:');
    console.log('   Titre:', pageStructure.title);
    console.log('   URL:', pageStructure.url);
    console.log('   Conteneurs principaux:', pageStructure.mainContainers.length);
    console.log('   Éléments liés aux tournois:', pageStructure.tournamentElements.length);
    console.log('   Prix trouvés:', pageStructure.prices);
    console.log('   Heures trouvées:', pageStructure.times);

    console.log('\n📋 Classes pertinentes:');
    const relevantClasses = Array.from(pageStructure.allClasses)
      .filter(c => c && (
        c.includes('tournament') ||
        c.includes('venue') ||
        c.includes('casino') ||
        c.includes('event') ||
        c.includes('buy')
      ));
    relevantClasses.slice(0, 20).forEach(c => console.log('   -', c));

    console.log('\n🎯 Éléments de tournoi détectés:');
    pageStructure.tournamentElements.slice(0, 10).forEach((el, i) => {
      console.log(`\n   ${i + 1}. ${el.tag}`);
      console.log(`      Classe: ${el.class}`);
      console.log(`      ID: ${el.id}`);
      console.log(`      Texte: ${el.text?.substring(0, 80)}...`);
    });

    // Sauvegarder l'analyse complète
    fs.writeFileSync('page-structure.json', JSON.stringify(pageStructure, null, 2));
    console.log('\n💾 Analyse sauvegardée dans page-structure.json');

    // Attendre avant de fermer pour permettre l'inspection manuelle
    console.log('\n⏳ Le navigateur restera ouvert 60 secondes pour inspection...');
    console.log('   Vous pouvez naviguer manuellement et observer la structure.');
    await wait(60000);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

debugPokerAtlas()
  .then(() => {
    console.log('\n✅ Debug terminé!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
