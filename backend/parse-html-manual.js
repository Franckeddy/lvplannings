import fs from 'fs';
import { JSDOM } from 'jsdom';

function parseBuyIn(buyInText) {
  if (!buyInText) return null;
  const match = buyInText.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

function parseTime(timeText) {
  if (!timeText) return null;
  const match = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return null;

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours);

  if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  else if (period.toLowerCase() === 'am' && hours === 12) hours = 0;

  return hours.toString().padStart(2, '0') + ':' + minutes + ':00';
}

// Reformater "XX niveaux min" en "niveau de XX min"
function formatLevels(levelsText) {
  if (!levelsText) return null;

  // Pattern: "XX niveaux min" ou "Redmarrer, XX niveaux min"
  const match = levelsText.match(/(\d+)\s*niveaux?\s*min/i);
  if (match) {
    const minutes = match[1];
    // Si c'est un restart, on garde l'info
    if (levelsText.toLowerCase().includes('redémarrer') || levelsText.toLowerCase().includes('redmarrer')) {
      return `Restart - niveau de ${minutes} min`;
    }
    return `niveau de ${minutes} min`;
  }

  return levelsText;
}

// Extraire le nom du tournoi et détecter Day X ou Restart
function parseTournamentName(item) {
  const nameEl = item.querySelector('.name, span.name');
  if (!nameEl) return { name: null, day: null, isRestart: false };

  const fullText = nameEl.textContent.trim();

  // Détecter "Day X" dans le nom
  const dayMatch = fullText.match(/Day\s*(\d+)/i);
  const day = dayMatch ? parseInt(dayMatch[1]) : null;

  // Détecter Restart dans structure-info
  const restartEl = item.querySelector('.red-restart');
  const isRestart = !!restartEl;

  // Nettoyer le nom (enlever les espaces multiples)
  const name = fullText.replace(/\s+/g, ' ').trim();

  return { name, day, isRestart };
}

function parseHTML(htmlContent, date) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const results = [];
  const tournamentItems = document.querySelectorAll('li.tournament-item');

  console.log(`\n📅 ${date}`);
  console.log(`   Trouvé ${tournamentItems.length} éléments tournament-item`);

  tournamentItems.forEach((item, index) => {
    try {
      const venueNameEl = item.querySelector('.venue-name, h2.venue-name');
      const casino = venueNameEl ? venueNameEl.textContent.trim() : '';

      const timeEl = item.querySelector('.time, span.time');
      const time = timeEl ? timeEl.textContent.trim() : '';

      const buyInEl = item.querySelector('li.detail.buy-in, .detail.buy-in');
      const buyIn = buyInEl ? buyInEl.textContent.trim() : '';

      // Extraire le nom du tournoi et les infos de Day/Restart
      const { name, day, isRestart } = parseTournamentName(item);

      let structure = { chips: '', levels: '', guarantee: '' };

      const structureInfoEl = item.querySelector('.structure-info, ul.structure-info');
      if (structureInfoEl) {
        const details = structureInfoEl.querySelectorAll('.detail, li.detail');
        details.forEach(detail => {
          const text = detail.textContent.trim();

          if (text.toLowerCase().includes('chip')) {
            structure.chips = text;
          } else if (text.toLowerCase().includes('niveau') || text.toLowerCase().includes('min')) {
            structure.levels = formatLevels(text);
          } else if ((text.includes('$') || text.includes('K')) && (text.toLowerCase().includes('gtd') || text.toLowerCase().includes('guaranteed'))) {
            const abbrEl = detail.querySelector('abbr');
            structure.guarantee = abbrEl ? (abbrEl.getAttribute('title') || text) : text;
          }
        });
      }

      if (casino && (time || buyIn)) {
        results.push({
          casino,
          date,
          time: parseTime(time) || '12:00:00',
          buyIn: parseBuyIn(buyIn) || 0,
          levels: null,
          name: name || null,
          day: day,
          isRestart: isRestart,
          structure: (structure.chips || structure.levels || structure.guarantee) ? {
            chips: structure.chips || null,
            levels: structure.levels || null,
            guarantee: structure.guarantee || null
          } : undefined
        });
      }
    } catch (err) {
      console.error(`   ❌ Erreur élément ${index}:`, err.message);
    }
  });

  console.log(`   ✅ ${results.length} tournois extraits`);
  return results;
}

// Fonction pour lire les fichiers HTML et générer le JSON
function processHTMLFiles() {
  const allTournaments = [];

  // Traiter tous les jours du 4 au 12 juin
  const dates = [
    { file: 'html-2026-06-04.txt', date: '2026-06-04' },
    { file: 'html-2026-06-05.txt', date: '2026-06-05' },
    { file: 'html-2026-06-06.txt', date: '2026-06-06' },
    { file: 'html-2026-06-07.txt', date: '2026-06-07' },
    { file: 'html-2026-06-08.txt', date: '2026-06-08' },
    { file: 'html-2026-06-09.txt', date: '2026-06-09' },
    { file: 'html-2026-06-10.txt', date: '2026-06-10' },
    { file: 'html-2026-06-11.txt', date: '2026-06-11' },
    { file: 'html-2026-06-12.txt', date: '2026-06-12' }
  ];

  dates.forEach(({ file, date }) => {
    try {
      const htmlContent = fs.readFileSync(file, 'utf-8');
      const tournaments = parseHTML(htmlContent, date);
      allTournaments.push(...tournaments);
    } catch (err) {
      console.error(`❌ Erreur lecture ${file}:`, err.message);
    }
  });

  // Sauvegarder
  fs.writeFileSync('poker-tournaments.json', JSON.stringify(allTournaments, null, 2));

  console.log(`\n✅ Total: ${allTournaments.length} tournois`);
  console.log(`   Avec structure: ${allTournaments.filter(t => t.structure).length}`);

  // Statistiques par date
  const byDate = {};
  allTournaments.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = 0;
    byDate[t.date]++;
  });

  console.log('\n📊 Répartition par date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`   ${date}: ${byDate[date]} tournois`);
  });
}

// Si appelé avec un argument, parser directement le HTML passé en stdin
if (process.argv[2] === '--stdin') {
  let html = '';
  process.stdin.on('data', chunk => html += chunk);
  process.stdin.on('end', () => {
    const date = process.argv[3] || '2026-06-04';
    const tournaments = parseHTML(html, date);
    console.log(JSON.stringify(tournaments, null, 2));
  });
} else {
  processHTMLFiles();
}
