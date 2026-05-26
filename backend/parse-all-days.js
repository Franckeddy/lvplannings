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

const dates = ['04', '05', '06', '07', '08', '09', '10', '11', '12'];
const allTournaments = [];

dates.forEach(day => {
  console.log(`📅 Parsing ${day} juin...`);
  const htmlContent = fs.readFileSync(`html-2026-06-${day}.txt`, 'utf-8');
  const tournaments = parseHTMLString(htmlContent, `2026-06-${day}`);
  console.log(`   ✅ ${tournaments.length} tournois extraits`);
  allTournaments.push(...tournaments);
});

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
