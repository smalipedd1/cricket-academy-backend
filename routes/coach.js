const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Coach = require('../models/Coach');
const Session = require('../models/Session');
const Player = require('../models/Player');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// 🧭 COACH DASHBOARD
router.get('/dashboard', verifyRole('coach'), async (req, res) => {
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

// 🗒 OVERALL PLAYER NOTE
router.post('/player/:playerId/note', verifyRole('coach'), async (req, res) => {
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

// 📊 SESSION PERFORMANCE NOTE
router.post('/session/:sessionId/performance/:playerId', verifyRole('coach'), async (req, res) => {
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

// 📥 GET SESSION PERFORMANCE NOTES
router.get('/session/:sessionId/performance', verifyRole('coach'), async (req, res) => {
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

// 🔐 ADMIN-ONLY: GET ALL COACHES
router.get('/all', verifyRole('admin'), async (req, res) => {
  try {
    const coaches = await Coach.find().select('-password');
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔐 ADMIN-ONLY: REGISTER NEW COACH
router.post('/register', verifyRole('admin'), async (req, res) => {
  try {
    const coach = new Coach(req.body);
    await coach.save();
    res.status(201).json({ message: 'Coach registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔐 ADMIN-ONLY: GET COACH BY coachId
router.get('/by-id/:coachId', verifyRole('admin'), async (req, res) => {
  try {
    const coach = await Coach.findOne({ coachId: req.params.coachId });
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    res.json(coach);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧭 COACH DASHBOARD UI
router.get('/dashboard-ui', verifyRole('coach'), async (req, res) => {
  const coach = await Coach.findById(req.userId);
  const sessions = await Session.find({ coach: req.userId }).sort({ date: -1 }).limit(5);
  const players = await Player.find();

  const recentSessions = sessions.map(s => ({
    date: s.date,
    focusArea: s.focusArea,
    playerCount: s.performance.length
  }));

  const playerSessionCount = {};
  sessions.forEach(s => {
    s.performance.forEach(p => {
      const id = p.player.toString();
      playerSessionCount[id] = (playerSessionCount[id] || 0) + 1;
    });
  });

  const topPlayers = Object.entries(playerSessionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const player = players.find(p => p._id.toString() === id);
      return { name: `${player.firstName} ${player.lastName}`, sessions: count };
    });

  res.json({
    coachName: `${coach.firstName} ${coach.lastName}`,
    totalSessions: sessions.length,
    totalPlayers: players.length,
    recentSessions,
    topPlayers
  });
});

// 🧭 PLAYER PROFILE UI
router.get('/player/:playerId/profile-ui', verifyRole('coach'), async (req, res) => {
  try {
    const player = await Player.findById(req.params.playerId).populate('notes.coachId', 'firstName lastName');
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const sessions = await Session.find({ 'performance.player': req.params.playerId });

    const progressEntries = sessions.flatMap(session =>
      session.performance.filter(p => p.player.toString() === req.params.playerId)
    );

    const averageRating =
      progressEntries.reduce((sum, p) => sum + (p.rating || 0), 0) / (progressEntries.length || 1);

    const focusBreakdown = {};
    progressEntries.forEach(p => {
      if (p.focusArea) {
        focusBreakdown[p.focusArea] = (focusBreakdown[p.focusArea] || 0) + 1;
      }
    });

    const recentNotes = player.notes
      .slice(-5)
      .reverse()
      .map(n => ({
        coach: `${n.coachId.firstName} ${n.coachId.lastName}`,
        content: n.content,
        date: n.createdAt.toISOString().split('T')[0]
      }));

    res.json({
      name: `${player.firstName} ${player.lastName}`,
      age: player.age,
      role: player.role,
      academyLevel: player.academyLevel,
      status: player.status,
      recentNotes,
      progressSummary: {
        averageRating: Number(averageRating.toFixed(1)),
        focusBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧭 PLAYER PROGRESS UI
router.get('/player/:playerId/progress-ui', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({ 'performance.player': req.params.playerId })
      .select('date performance')
      .sort({ date: 1 });

    const timeline = sessions.flatMap(session =>
      session.performance
        .filter(p => p.player.toString() === req.params.playerId)
        .map(p => ({
          date: session.date.toISOString().split('T')[0],
          rating: p.rating,
          focusArea: p.focusArea,
          notes: p.notes
        }))
    );

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧭 COACH DASHBOARD (Simple UI)
router.get('/dashboard-lite', verifyRole('coach'), async (req, res) => {
  res.json({
    name: 'Coach Sharma',
    assignedSessions: [
      { date: '2025-10-10', focusArea: 'Batting', players: 12 },
      { date: '2025-10-12', focusArea: 'Fitness', players: 8 }
    ],
    feedbackPending: 5
  });
});

// Get all coaches (admin + coach access)
router.get('/', verifyRole('admin', 'coach'), async (req, res) => {
  try {
    const coaches = await Coach.find().select('firstName lastName _id');
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});


module.exports = router;