const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Player = require('../models/Player');
const Session = require('../models/Session');

// ✅ GET player profile
router.get('/profile', verifyRole('player'), async (req, res) => {
  try {
    const player = await Player.findById(req.user._id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH update contact info
router.patch('/profile', verifyRole('player'), async (req, res) => {
  try {
    const updates = {};
    ['email', 'phone', 'address'].forEach((field) => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    const player = await Player.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ message: 'Profile updated', player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET upcoming sessions
router.get('/sessions/upcoming', verifyRole('player'), async (req, res) => {
  try {
    const today = new Date();
    const sessions = await Session.find({
      players: req.user._id,
      date: { $gte: today }
    })
      .sort({ date: 1 })
      .populate('coach', 'name');

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET feedback summary
router.get('/feedback', verifyRole('player'), async (req, res) => {
console.log('✅ /api/player/profile route hit');
  
try {
    const sessions = await Session.find({
      'performance.player': req.user._id
    }).select('date performance');

    const feedback = sessions.flatMap(session =>
      session.performance
        .filter(p => p.player.toString() === req.user._id.toString())
        .map(p => ({
          sessionDate: session.date,
          rating: p.rating,
          notes: p.notes,
          focusArea: p.focusArea,
          sessionId: session._id
        }))
    );

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET progress chart data
router.get('/performance-chart', verifyRole('player'), async (req, res) => {
  try {
    const sessions = await Session.find({
      'performance.player': req.user._id
    }).select('date performance');

    const entries = sessions.flatMap(s =>
      s.performance
        .filter(p => p.player.toString() === req.user._id.toString())
        .map(p => ({
          date: s.date,
          rating: p.rating,
          notes: p.notes,
          focusArea: p.focusArea
        }))
    );

    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;