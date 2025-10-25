const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Coach = require('../models/Coach');
const Player = require('../models/Player');
const { verifyRole } = require('../middleware/auth');

// 📅 Get sessions (accessible to coaches)
router.get('/', verifyRole('coach','admin'), async (req, res) => {
  try {
    const { focusArea, startDate, endDate } = req.query;
    const filter = {};

    if (req.user.role === 'coach') {
      filter.coach = req.user._id;
    }

    if (focusArea) filter.focusArea = focusArea;
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sessions = await Session.find(filter)
      .populate('coach')
      .populate('players')
      .populate('performance.player');

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🆕 Create session (admin only)
router.post('/', verifyRole('admin'), async (req, res) => {
  try {
    const newSession = new Session(req.body);
    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📋 Get sessions by coach ID (coach only)
router.get('/by-coach/:coachId', verifyRole('coach','admin'), async (req, res) => {
  try {
    const coach = await Coach.findOne({ coachId: req.params.coachId });
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const sessions = await Session.find({ coach: coach._id })
      .populate('players')
      .populate('performance.player');

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get sessions by player ID (coach only)
router.get('/by-player/:playerId', verifyRole('coach','admin'), async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.playerId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const sessions = await Session.find({ players: player._id })
      .populate('coach')
      .populate('performance.player');

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyRole('admin'), async (req, res) => {
  try {
    const updated = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Session not found' });
    res.json(updated);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;