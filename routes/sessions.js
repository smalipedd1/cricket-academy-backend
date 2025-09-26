const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Coach = require('../models/Coach');
const Player = require('../models/Player');

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().populate('coach').populate('players');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new session
router.post('/', async (req, res) => {
  try {
    const newSession = new Session(req.body);
    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/by-coach/:coachId', async (req, res) => {
  try {
    const coach = await Coach.findOne({ coachId: req.params.coachId });
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const sessions = await Session.find({ coach: coach._id }).populate('players');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-player/:playerId', async (req, res) => {
  try {
    // Find the player by their readable playerId
    const player = await Player.findOne({ playerId: req.params.playerId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Find sessions that include this player's ObjectId
    const sessions = await Session.find({ players: player._id })
      .populate('coach')
      .populate('players');

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;