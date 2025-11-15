const puppeteer = require('puppeteer');

async function fetchCricclubsStats(cricclubsID) {
  const url = `https://cricclubs.com/PremierCricAcad/viewPlayer.do?playerId=${cricclubsID}`;
  console.log(`🌐 Launching Puppeteer for: ${url}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  const stats = await page.evaluate(() => {
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : '0';
    };

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
}

module.exports = fetchCricclubsStats;	