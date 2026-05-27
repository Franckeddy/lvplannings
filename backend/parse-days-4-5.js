import { JSDOM } from 'jsdom';
import fs from 'fs';

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

const htmlDay4 = fs.readFileSync('html-2026-06-04.txt', 'utf-8');
const htmlDay5 = fs.readFileSync('html-2026-06-05.txt', 'utf-8');

function parseHTMLString(htmlContent, date) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

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
          structure: (structure.chips || structure.levels || structure.guarantee) ? {
            chips: structure.chips || null,
            levels: structure.levels || null,
            guarantee: structure.guarantee || null
          } : undefined
        });
      }
    } catch (err) {}
  });

  return results;
}

console.log('📅 Parsing 4 juin...');
const day4 = parseHTMLString(htmlDay4, '2026-06-04');
console.log(`   ✅ ${day4.length} tournois extraits`);

console.log('\n📅 Parsing 5 juin...');
const day5 = parseHTMLString(htmlDay5, '2026-06-05');
console.log(`   ✅ ${day5.length} tournois extraits`);

const allTournaments = [...day4, ...day5];

fs.writeFileSync('poker-tournaments.json', JSON.stringify(allTournaments, null, 2));

console.log(`\n✅ Total: ${allTournaments.length} tournois`);
console.log(`   Avec structure: ${allTournaments.filter(t => t.structure).length}`);

const byDate = {};
allTournaments.forEach(t => {
  if (!byDate[t.date]) byDate[t.date] = 0;
  byDate[t.date]++;
});

console.log('\n📊 Répartition par date:');
Object.keys(byDate).sort().forEach(date => {
  console.log(`   ${date}: ${byDate[date]} tournois`);
});

console.log('\n📋 Exemples (premiers 3 tournois):');
allTournaments.slice(0, 3).forEach((t, i) => {
  console.log(`\n${i + 1}. ${t.casino}`);
  console.log(`   ${t.date} à ${t.time} - $${t.buyIn}`);
  if (t.structure) {
    if (t.structure.chips) console.log(`   Chips: ${t.structure.chips}`);
    if (t.structure.levels) console.log(`   Niveaux: ${t.structure.levels}`);
    if (t.structure.guarantee) console.log(`   Garantie: ${t.structure.guarantee}`);
  }
});
