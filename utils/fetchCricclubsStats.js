const axios = require('axios');
const cheerio = require('cheerio');

async function fetchCricclubsStats(cricclubsID) {
  const url = `https://cricclubs.com/PremierCricAcad/viewPlayer.do?playerId=${cricclubsID}`;
  console.log(`🌐 Fetching CricClubs stats from: ${url}`);
  

  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(res.data);

    const name = $('h3.player-name').text().trim();
    const gamesPlayed = parseInt($('#gamesPlayed').text()) || 0;
    const totalRuns = parseInt($('#totalRuns').text()) || 0;
    const totalWickets = parseInt($('#totalWickets').text()) || 0;

    if (!name) {
      console.warn('⚠️ Player name not found on CricClubs page');
    }

    return {
      name: name || 'Unknown',
      gamesPlayed,
      totalRuns,
      totalWickets,
    };
  } catch (err) {
    console.error('❌ Error fetching CricClubs stats:', err.stack || err.message || err);
    return {
      name: 'Unavailable',
      gamesPlayed: 0,
      totalRuns: 0,
      totalWickets: 0,
    };
  }
}

module.exports = fetchCricclubsStats;