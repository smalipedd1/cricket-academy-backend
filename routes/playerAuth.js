const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyRole } = require('../middleware/auth');
const Session = require('../models/Session');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// 🔐 PLAYER LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const player = await Player.findOne({ username });
  if (!player) return res.status(401).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, player.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: player._id, role: 'player' }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// 🧭 PLAYER PROFILE
router.get('/profile', verifyRole('player'), async (req, res) => {
  const player = await Player.findById(req.userId).select('-password');
  if (!player) return res.status(404).json({ error: 'Player not found' });

  res.json(player);
});

// 📅 PLAYER SESSIONS
router.get('/sessions', verifyRole('player'), async (req, res) => {
  const sessions = await Session.find({ players: req.userId })
    .populate('coach')
    .populate('performance.player');

  res.json(sessions);
});

// 🧭 PLAYER DASHBOARD (Simple UI)
router.get('/dashboard', verifyRole('player'), async (req, res) => {
  res.json({
    name: 'Player One',
    progress: {
      fitness: 'Good',
      batting: 'Improving',
      bowling: 'Excellent'
    },
    upcomingSessions: [
      { date: '2025-10-10', focusArea: 'Batting' },
      { date: '2025-10-12', focusArea: 'Fitness' }
    ]
  });
});

module.exports = router;