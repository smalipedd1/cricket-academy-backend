const puppeteer = require('puppeteer');

async function fetchCricclubsStats(cricclubsID) {
  const url = `https://cricclubs.com/PremierCricAcad/viewPlayer.do?playerId=${cricclubsID}`;
  console.log(`🌐 Launching Puppeteer for: ${url}`);

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    const html = await page.content();
    console.log('📄 Page HTML:\n', html); // Dump full HTML for inspection

    await page.waitForSelector('.matches-runs-wickets', { timeout: 10000 });

    const stats = await page.evaluate(() => {
      const listItems = document.querySelectorAll('.matches-runs-wickets ul.list-inline li');
      const gamesPlayed = parseInt(listItems[0]?.querySelector('span')?.textContent || '0');
      const totalRuns = parseInt(listItems[1]?.querySelector('span')?.textContent || '0');
      const totalWickets = parseInt(listItems[2]?.querySelector('span')?.textContent || '0');
      const name = document.querySelector('h3.player-name')?.textContent.trim() || 'Unknown';

      return {
        name,
        gamesPlayed,
        totalRuns,
        totalWickets,
      };
    });

    await browser.close();
    return stats;
  } catch (err) {
    console.error('❌ Puppeteer error:', err.stack || err.message || err);
    return {
      name: 'Unavailable',
      gamesPlayed: 0,
      totalRuns: 0,
      totalWickets: 0,
    };
  }
}

// CLI wrapper for direct testing
if (require.main === module) {
  const cricclubsID = process.argv[2];
  if (!cricclubsID) {
    console.error('❌ Please provide a CricClubs ID');
    process.exit(1);
  }

  fetchCricclubsStats(cricclubsID).then(stats => {
    console.log('🧪 Stats:', stats);
  });
}

module.exports = fetchCricclubsStats;