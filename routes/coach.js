const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Coach = require('../models/Coach');
const Session = require('../models/Session');
const Player = require('../models/Player');

// ✅ Coach Dashboard
router.get('/dashboard', auth, async (req, res) => {
  if (req.role !== 'coach') return res.status(403).json({ error: 'Access denied' });

  try {
    const coach = await Coach.findById(req.userId).select('-password');
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const sessions = await Session.find({ coachId: coach._id });
    const playerIds = [...new Set(sessions.flatMap(s => s.playerIds))];
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

// ✅ Add Session Note
router.post('/session/:sessionId/player/:playerId/note', auth, async (req, res) => {
  if (req.role !== 'coach') return res.status(403).json({ error: 'Access denied' });

  const { sessionId, playerId } = req.params;
  const { content } = req.body;

  await Session.findByIdAndUpdate(sessionId, {
    $push: {
      playerNotes: {
        playerId,
        coachId: req.userId,
        content
      }
    }
  });

  res.json({ message: 'Session note added' });
});

// ✅ Add Overall Player Note
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

module.exports = router;