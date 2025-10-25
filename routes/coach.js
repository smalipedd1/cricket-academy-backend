const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Session = require('../models/Session');
const Player = require('../models/Player');

// GET all players
router.get('/players', verifyRole('coach'), async (req, res) => {
  try {
    const players = await Player.find().select('firstName lastName _id');
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard UI data
router.get('/dashboard-ui', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({ coach: req.userId }).select('performance date');
    const players = await Player.find().select('firstName lastName _id');

    const playerSessionCount = {};
    sessions.forEach(s => {
      if (Array.isArray(s.performance)) {
        s.performance.forEach(p => {
          const id = p.player?.toString();
          if (id) {
            playerSessionCount[id] = (playerSessionCount[id] || 0) + 1;
          }
        });
      }
    });

    const dashboardData = Object.entries(playerSessionCount).map(([id, count]) => {
      const player = players.find(p => p._id.toString() === id);
      return player
        ? { name: `${player.firstName} ${player.lastName}`, sessions: count }
        : { name: 'Unknown Player', sessions: count };
    });

    res.json(dashboardData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST feedback for a session
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

// PUT feedback update
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
        },
        { upsert: true }
      );
    }

    await session.save();
    res.json({ message: 'Feedback updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET feedback summary for coach
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

// GET feedback for a specific player
router.get('/feedback/player/:playerId', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({
      coach: req.userId,
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
          sessionId: session._id
        }))
    );

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET performance chart data for a player
router.get('/player/:playerId/performance', verifyRole('coach'), async (req, res) => {
  try {
    const sessions = await Session.find({
      coach: req.userId,
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

module.exports = router;