const axios = require('axios');
const cheerio = require('cheerio');

async function fetchCricclubsStats(cricclubsID) {
  const url = `https://cricclubs.com/PremierCricAcad/viewPlayer.do?playerId=${cricclubsID}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const stats = {
    name: $('h3.player-name').text().trim(),
    gamesPlayed: parseInt($('#gamesPlayed').text()) || 0,
    totalRuns: parseInt($('#totalRuns').text()) || 0,
    totalWickets: parseInt($('#totalWickets').text()) || 0,
  };

  return stats;
}

module.exports = fetchCricclubsStats;