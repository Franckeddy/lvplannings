import puppeteer from 'puppeteer';
import fs from 'fs';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function scrapeDate(page, date) {
  console.log(`\n📅 ${date}`);

  // Utiliser l'URL française comme dans le HTML fourni
  await page.goto(`https://www.pokeratlas.com/fr/poker-tournaments/las-vegas?date=${date}`, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await wait(3000);

  // Scroll pour lazy-load
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await wait(2000);
  }

  const tournaments = await page.evaluate((currentDate) => {
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

            if (text.toLowerCase().includes('chip')) structure.chips = text;
            else if (text.toLowerCase().includes('niveau') || text.toLowerCase().includes('min')) structure.levels = text;
            else if ((text.includes('$') || text.includes('K')) && (text.toLowerCase().includes('gtd') || text.toLowerCase().includes('guaranteed'))) {
              const abbrEl = detail.querySelector('abbr');
              structure.guarantee = abbrEl ? (abbrEl.getAttribute('title') || text) : text;
            }
          });
        }

        if (casino && (time || buyIn)) {
          results.push({ casino, time, buyIn, date: currentDate, structure });
        }
      } catch (err) {}
    });

    return results;
  }, date);

  console.log(`   ✅ ${tournaments.length} tournois`);
  return tournaments;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const dates = ['2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12'];

    let allTournaments = [];

    for (const date of dates) {
      const tournaments = await scrapeDate(page, date);
      allTournaments.push(...tournaments);
      await wait(2000);
    }

    const formatted = allTournaments.map(t => ({
      casino: t.casino,
      date: t.date,
      time: parseTime(t.time) || '12:00:00',
      buyIn: parseBuyIn(t.buyIn) || 0,
      levels: null,
      structure: (t.structure.chips || t.structure.levels || t.structure.guarantee) ? {
        chips: t.structure.chips || null,
        levels: t.structure.levels || null,
        guarantee: t.structure.guarantee || null
      } : undefined
    }));

    const byDate = {};
    formatted.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = 0;
      byDate[t.date]++;
    });

    console.log('\n📊 Répartition par date:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`   ${date}: ${byDate[date]} tournois`);
    });

    fs.writeFileSync('poker-tournaments.json', JSON.stringify(formatted, null, 2));

    console.log(`\n✅ ${formatted.length} tournois, ${formatted.filter(t => t.structure).length} avec structure`);

  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
