const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Player = require('../models/Player');
const Session = require('../models/Session');
const Notification = require('../models/Notification'); // ✅ NEW

// ✅ GET player profile
router.get('/profile', verifyRole('player'), async (req, res) => {
  try {
    const player = await Player.findById(req.user._id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH update contact info
router.patch('/profile', verifyRole('player'), async (req, res) => {
  try {
    const updates = {};
    ['email', 'phone', 'address'].forEach((field) => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    const player = await Player.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ message: 'Profile updated', player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET upcoming sessions
router.get('/sessions/upcoming', verifyRole('player'), async (req, res) => {
  try {
    const today = new Date();
    const sessions = await Session.find({
      players: req.user._id,
      date: { $gte: today }
    })
      .sort({ date: 1 })
      .populate('coach', 'name');

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET feedback summary
router.get('/feedback', verifyRole('player'), async (req, res) => {
  console.log('✅ /api/player/profile route hit');

  try {
    const sessions = await Session.find({
      'performance.player': req.user._id
    }).select('date performance');

    const feedback = sessions.flatMap(session =>
      session.performance
        .filter(p => p.player.toString() === req.user._id.toString())
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

// ✅ GET progress chart data
router.get('/performance-chart', verifyRole('player'), async (req, res) => {
  try {
    const sessions = await Session.find({
      'performance.player': req.user._id
    }).select('date performance');

    const entries = sessions.flatMap(s =>
      s.performance
        .filter(p => p.player.toString() === req.user._id.toString())
        .map(p => ({
          date: s.date,
          rating: p.rating,
          notes: p.notes,
          focusArea: p.focusArea
        }))
    );

    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH player response to coach feedback + notify coach
router.patch('/feedback-response/:sessionId', verifyRole('player'), async (req, res) => {
  try {
    const { playerId, responseText } = req.body;

    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const entry = session.performance.find(p => p.player.toString() === playerId);
    if (!entry) return res.status(404).json({ error: 'Feedback entry not found for player' });

    entry.playerResponse = responseText;
    await session.save();

    // ✅ Notify coach
    await Notification.create({
      recipient: session.coach,
      sender: req.user._id,
      type: 'response-submitted',
      session: session._id,
      player: req.user._id,
      message: `${req.user.firstName || req.user.username} responded to feedback for session on ${new Date(session.date).toLocaleDateString()}.`,
    });

    res.json({ message: 'Response saved', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;