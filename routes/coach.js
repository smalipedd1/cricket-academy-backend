const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Session = require('../models/Session');
const Player = require('../models/Player');
const Notification = require('../models/Notification');

// ✅ GET all players (full list for coach)
router.get('/player-list', verifyRole('coach'), async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET single player profile
router.get('/player/:id', verifyRole('coach'), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH update player profile
router.patch('/player/:id', verifyRole('coach'), async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      const bcrypt = require('bcrypt');
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const player = await Player.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player updated successfully', player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET dashboard UI data
router.get('/dashboard-ui', verifyRole('coach'), async (req, res) => {
  try {
    const coachId = req.user._id;
    const sessions = await Session.find({ coach: coachId })
      .sort({ date: -1 })
      .populate('players')
      .populate('performance.player');

    const recentSessions = sessions.map((s) => {
      const totalPlayers = s.players.length;
      const feedbackGiven = Array.isArray(s.performance) ? s.performance.length : 0;
      const isComplete = feedbackGiven === totalPlayers;

      return {
        _id: s._id,
        date: s.date,
        focusArea: s.focusArea,
        playerCount: totalPlayers,
        feedbackStatus: isComplete ? 'Complete' : 'Pending'
      };
    });

    res.json({
      coachName: req.user.name || req.user.username,
      recentSessions,
    });
  } catch (err) {
    console.error('Coach dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST feedback for a session
router.post('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const { feedback } = req.body;

    if (!Array.isArray(feedback) || feedback.length === 0) {
      return res.status(400).json({ error: 'Feedback array is missing or empty' });
    }

    const session = await Session.findOne({ _id: sessionId, coach: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found or unauthorized' });

    for (const entry of feedback) {
      if (!entry.playerId || !entry.rating) {
        return res.status(400).json({ error: 'Missing playerId or rating in feedback entry' });
      }

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

    session.feedbackSubmitted = true;
    session.performance = feedback.map(f => ({
      player: f.playerId,
      rating: f.rating,
      notes: f.notes,
      focusArea: f.focusArea || 'Combined'
    }));

    await session.save();
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH feedback overwrite + notify players
router.patch('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const { feedback } = req.body;

    const updatedPerformance = feedback.map((entry) => ({
      player: entry.playerId,
      rating: entry.rating,
      notes: entry.notes,
      focusArea: entry.focusArea,
    }));

    const session = await Session.findByIdAndUpdate(
      req.params.sessionId,
      { performance: updatedPerformance },
      { new: true }
    );

    // ✅ Notify each player
    for (const entry of feedback) {
      await Notification.create({
        recipient: entry.playerId,
        recipientRole: 'player', // ✅ PATCHED
        sender: req.user._id,
        type: 'feedback-submitted',
        session: session._id,
        player: entry.playerId,
        message: `Coach ${req.user.firstName || req.user.username} submitted feedback for your session.`,
      });
    }

    res.json({ message: 'Feedback saved', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET feedback summary for coach
router.get('/feedback/summary', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({ coach: req.user._id })
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
        playerResponse: entry.playerResponse || '',
        sessionId: session._id
      }))
    );

    res.json(allFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET a specific session for feedback logging
router.get('/feedback/:sessionId', verifyRole('coach'), async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      coach: req.user._id
    })
      .populate('players')
      .populate('performance.player', 'firstName lastName username');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const feedbackEntries = session.performance.map((entry) => ({
      player: entry.player,
      rating: entry.rating,
      notes: entry.notes,
      focusArea: entry.focusArea || session.focusArea,
      playerResponse: entry.playerResponse || '',
    }));

    res.json({
      sessionId: session._id,
      date: session.date,
      focusArea: session.focusArea,
      coach: session.coach,
      feedbackEntries,
    });
  } catch (err) {
    console.error('Session fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET feedback for a specific player
router.get('/feedback/player/:playerId', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({
      coach: req.user._id,
      'performance.player': req.params.playerId
    }).select('date performance');

    const feedback = sessions.flatMap(session =>
      session.performance
        .filter(p => p.player.toString() === req.params.playerId)
        .map(p => ({
          sessionDate: session.date,
          rating: p.rating,
          notes: p.notes,
          focusArea: p.focusArea,
          playerResponse: p.playerResponse || '',
          sessionId: session._id
        }))
    );

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET performance chart data for a player
router.get('/player/:playerId/performance', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({
      coach: req.user._id,
      'performance.player': req.params.playerId
    }).select('date performance');

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

    const avg = {
      batting: 0,
      bowling: 0,
      wicketkeeping: 0,
      fielding: 0
    };

    entries.forEach(e => {
      avg.batting += e.rating.batting || 0;
      avg.bowling += e.rating.bowling || 0;
      avg.wicketkeeping += e.rating.wicketkeeping || 0;
      avg.fielding += e.rating.fielding || 0;
    });

    const count = entries.length;
    const averageRating = count
      ? {
          batting: (avg.batting / count).toFixed(2),
          bowling: (avg.bowling / count).toFixed(2),
          wicketkeeping: (avg.wicketkeeping / count).toFixed(2),
          fielding: (avg.fielding / count).toFixed(2)
        }
      : null;

    res.json({ averageRating, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET active players for dropdown filter
router.get('/players', verifyRole('coach'), async (req, res) => {
  try {
    const statusFilter = req.query.status || 'Active';
    const players = await Player.find({ status: statusFilter }).select('firstName lastName _id');
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;