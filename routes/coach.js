const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Coach = require('../models/Coach');
const Session = require('../models/Session');
const Player = require('../models/Player');

// 🧭 COACH DASHBOARD UI
router.get('/dashboard-ui', verifyRole('coach'), async (req, res) => {
  const coach = await Coach.findById(req.userId);
  const sessions = await Session.find({ coach: req.userId })
    .populate('players')
    .sort({ date: -1 })
    .limit(5);

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

// ✅ FIXED: Place this BEFORE /feedback/:sessionId
router.get('/feedback/summary', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({ coach: req.userId })
      .populate('performance.player', 'firstName lastName')
      .select('date performance');

    const allFeedback = sessions.flatMap(session =>
      session.performance.map(entry => ({
        sessionDate: session.date,
        playerId: entry.player._id,
        playerName: `${entry.player.firstName} ${entry.player.lastName}`,
        rating: entry.rating,
        notes: entry.notes,
        focusArea: entry.focusArea,
        sessionId: session._id
      }))
    );

    res.json(allFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🏫 GET SESSION DETAILS FOR FEEDBACK
router.get('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('players', 'firstName lastName role status')
      .populate('performance.player', 'firstName lastName');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionId: session._id,
      date: session.date,
      focusArea: session.focusArea,
      players: session.players,
      performance: session.performance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🏫 SUBMIT FEEDBACK FOR A SESSION
router.post('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const { feedback } = req.body;
    const sessionId = req.params.sessionId;

    for (const entry of feedback) {
      await Player.updateOne(
        { _id: entry.playerId },
        {
          $push: {
            performance: {
              session: sessionId,
              rating: entry.rating,
              notes: entry.notes,
              focusArea: entry.focusArea || 'Combined'
            }
          }
        }
      );
    }

    await Session.findByIdAndUpdate(sessionId, {
      feedbackSubmitted: true,
      $set: {
        performance: feedback.map(f => ({
          player: f.playerId,
          rating: f.rating,
          notes: f.notes,
          focusArea: f.focusArea || 'Combined'
        }))
      }
    });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🏫 GET PLAYER PERFORMANCE
router.get('/player/:playerId/performance', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({ coach: req.userId, 'performance.player': req.params.playerId })
      .select('date performance');

    const entries = sessions.flatMap(s =>
      s.performance
        .filter(p => p.player.toString() === req.params.playerId)
        .map(p => ({
          date: s.date,
          rating: p.rating,
          notes: p.notes,
          focusArea: p.focusArea
        }))
    );

    const avgRating = entries.length
      ? (entries.reduce((sum, e) => sum + e.rating, 0) / entries.length).toFixed(2)
      : null;

    res.json({ averageRating: avgRating, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🏫 EDIT FEEDBACK FOR A SESSION
router.put('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const { feedback } = req.body;
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    for (const entry of feedback) {
      const index = session.performance.findIndex(p => p.player.toString() === entry.playerId);
      if (index !== -1) {
        session.performance[index].rating = entry.rating;
        session.performance[index].notes = entry.notes;
        session.performance[index].focusArea = entry.focusArea;
      } else {
        session.performance.push({
          player: entry.playerId,
          rating: entry.rating,
          notes: entry.notes,
          focusArea: entry.focusArea
        });
      }

      await Player.updateOne(
        { _id: entry.playerId, 'performance.session': req.params.sessionId },
        {
          $set: {
            'performance.$.rating': entry.rating,
            'performance.$.notes': entry.notes,
            'performance.$.focusArea': entry.focusArea
          }
        }
      );
    }

    await session.save();
    res.json({ message: 'Feedback updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;