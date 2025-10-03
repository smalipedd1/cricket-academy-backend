const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Coach = require('../models/Coach');
const Session = require('../models/Session');
const Player = require('../models/Player');

//
// 🧭 COACH DASHBOARD
//
router.get('/dashboard', auth, async (req, res) => {
  if (req.role !== 'coach') return res.status(403).json({ error: 'Access denied' });

  try {
    const coach = await Coach.findById(req.userId).select('-password');
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const sessions = await Session.find({ coach: coach._id });
    const playerIds = [...new Set(sessions.flatMap(s => s.players))];
    const players = await Player.find({ _id: { $in: playerIds } });

    res.json({
      coach,
      totalSessions: sessions.length,
      totalPlayers: players.length,
      sessions,
      players
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// 🗒 OVERALL PLAYER NOTE
//
router.post('/player/:playerId/note', auth, async (req, res) => {
  if (req.role !== 'coach') return res.status(403).json({ error: 'Access denied' });

  const { playerId } = req.params;
  const { content } = req.body;

  await Player.findByIdAndUpdate(playerId, {
    $push: {
      notes: {
        coachId: req.userId,
        content
      }
    }
  });

  res.json({ message: 'Player note added' });
});

//
// 📊 SESSION PERFORMANCE NOTE
//
router.post('/session/:sessionId/performance/:playerId', auth, async (req, res) => {
  if (req.role !== 'coach') return res.status(403).json({ error: 'Access denied' });

  const { sessionId, playerId } = req.params;
  const { rating, notes, focusArea } = req.body;

  try {
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const entry = session.performance.find(p => p.player.toString() === playerId);

    if (entry) {
  entry.rating = rating;
  entry.notes = notes;
  entry.focusArea = focusArea;
} else {
  session.performance.push({
    player: playerId,
    rating,
    notes,
    focusArea,
    createdAt: new Date()
  });
}

    await session.save();
    res.json({ message: 'Performance note saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// 📥 GET SESSION PERFORMANCE NOTES
//
router.get('/session/:sessionId/performance', auth, async (req, res) => {
  if (req.role !== 'coach') return res.status(403).json({ error: 'Access denied' });

  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('performance.player', 'firstName lastName')
      .select('performance');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json(session.performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// 🔐 ADMIN-ONLY: GET ALL COACHES
//
router.get('/all', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const coaches = await Coach.find().select('-password');
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//
// 🔐 ADMIN-ONLY: REGISTER NEW COACH
//
router.post('/register', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const coach = new Coach(req.body);
    await coach.save();
    res.status(201).json({ message: 'Coach registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//
// 🔐 ADMIN-ONLY: GET COACH BY coachId
//
router.get('/by-id/:coachId', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const coach = await Coach.findOne({ coachId: req.params.coachId });
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    res.json(coach);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;