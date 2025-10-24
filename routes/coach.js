const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Coach = require('../models/Coach');
const Session = require('../models/Session');
const Player = require('../models/Player');

// 🧭 COACH DASHBOARD UI
router.get('/dashboard-ui', verifyRole('coach'), async (req, res) => {
  const coach = await Coach.findById(req.userId);
  const sessions = await Session.find({ coach: req.userId }).sort({ date: -1 }).limit(5);
  const players = await Player.find();

  const recentSessions = sessions.map(s => ({
    _id: s._id,
    date: s.date,
    focusArea: s.focusArea,
    playerCount: s.players.length
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

// 🧑‍🏫 GET PENDING FEEDBACK SESSIONS
router.get('/feedback/pending', verifyRole('coach'), async (req, res) => {
  try {
    const coachId = req.userId;
    const today = new Date();

    const sessions = await Session.find({
      coach: coachId,
      date: { $lt: today },
      feedbackSubmitted: { $ne: true }
    })
    .populate('players', 'firstName lastName')
    .select('date focusArea players');

    const formatted = sessions.map(s => ({
      _id: s._id,
      date: s.date,
      focusArea: s.focusArea,
      playerCount: s.players.length
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🏫 GET SESSION DETAILS FOR FEEDBACK
router.get('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('players', 'firstName lastName role status');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionId: session._id,
      date: session.date,
      focusArea: session.focusArea,
      players: session.players
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🏫 SUBMIT FEEDBACK FOR A SESSION
router.post('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const { feedback } = req.body; // [{ playerId, rating, notes }]
    const sessionId = req.params.sessionId;

    for (const entry of feedback) {
      await Player.updateOne(
        { _id: entry.playerId },
        {
          $push: {
            performance: {
              session: sessionId,
              rating: entry.rating,
              notes: entry.notes
            }
          }
        }
      );
    }

    await Session.findByIdAndUpdate(sessionId, { feedbackSubmitted: true });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;