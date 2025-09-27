const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Session = require('../models/Session');



const SECRET = process.env.JWT_SECRET || 'supersecretkey';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const player = await Player.findOne({ username });
  if (!player) return res.status(401).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, player.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: player._id, role: 'player' }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

router.get('/profile', auth, async (req, res) => {
  if (req.role !== 'player') return res.status(403).json({ error: 'Access denied' });

  const player = await Player.findById(req.userId).select('-password');
  if (!player) return res.status(404).json({ error: 'Player not found' });

  res.json(player);
});

router.get('/sessions', auth, async (req, res) => {
  if (req.role !== 'player') return res.status(403).json({ error: 'Access denied' });

  const sessions = await Session.find({ players: req.userId })
    .populate('coach')
    .populate('performance.player');

  res.json(sessions);
});


module.exports = router;