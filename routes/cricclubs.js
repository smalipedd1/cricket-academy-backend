const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const fetchCricclubsStats = require('../utils/fetchCricclubsStats');


router.get('/:id', verifyRole('coach'), async (req, res) => {
  try {
    const stats = await fetchCricclubsStats(req.params.id);
    res.json(stats);
  } catch (err) {
    console.error('CricClubs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch CricClubs stats' });
  }
});

module.exports = router;