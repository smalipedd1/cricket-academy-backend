const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const fetchCricclubsStats = require('../utils/fetchCricclubsStats');

router.get('/:id', verifyRole('coach'), async (req, res) => {
  const cricclubsId = req.params.id;
  console.log(`🔍 Fetching CricClubs stats for ID: ${cricclubsId}`);

  try {
    const stats = await fetchCricclubsStats(cricclubsId);

    if (!stats || typeof stats !== 'object') {
      console.warn('⚠️ Invalid stats format:', stats);
      return res.status(502).json({ error: 'Invalid CricClubs response format' });
    }

    res.json(stats);
  } catch (err) {
    console.error('❌ CricClubs fetch error:', err.stack || err.message || err);
    res.status(500).json({ error: 'Failed to fetch CricClubs stats' });
  }
});

module.exports = router;