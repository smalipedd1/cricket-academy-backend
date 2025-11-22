const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Player = require('../models/Player');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const PlayerDOB = require('../models/playerDOB');
const { sendMail } = require('../utils/mailer');
const Coach = require('../models/Coach');

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
    const { responseText } = req.body;
    const playerId = req.user._id;

    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const entry = session.performance.find(p => p.player.equals(playerId));
    if (!entry) return res.status(404).json({ error: 'Feedback entry not found for player' });

    entry.playerResponse = responseText;
    await session.save();

 //   res.json({ message: 'Response saved', session });
 // } catch (err) {
 //   console.error('Error in feedback-response:', err);
 //   res.status(500).json({ error: err.message });
 // }
//});


    // ✅ Notify coach
    await Notification.create({
      recipient: session.coach,
      recipientRole: 'coach', // ✅ PATCHED
      sender: req.user._id,
      type: 'response-submitted',
      session: session._id,
      player: req.user._id,
      message: `${req.user.firstName || req.user.username} responded to feedback for session on ${new Date(session.date).toLocaleDateString()}.`,
    });

//email notification

// 🔹 Email notification to coach
const coachDoc = await Coach.findById(session.coach);
if (coachDoc?.emailaddress) {
  await sendMail(
    coachDoc.emailaddress,
    'Session Feedback Response',
    `${req.user.firstName || req.user.username} responded to your feedback.`,
    `<p>Player <strong>${req.user.firstName || req.user.username}</strong> responded to your feedback for the session on <em>${new Date(session.date).toLocaleDateString()}</em>.<br/>Login to view: <a href="https://cricket-academy-frontend-px1s.onrender.com/login">Academy Portal</a></p>`
  );
}
//end email notification

    res.json({ message: 'Response saved', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/session/:id', verifyRole('player'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('performance.player', 'firstName lastName username');

    if (!session) return res.status(404).json({ error: 'Session not found' });

    console.log('🔍 session.performance:', session.performance);
    console.log('🔍 req.user._id:', req.user._id);

    const feedback = session.performance.filter((p) =>
      p.player && p.player._id?.toString() === req.user._id.toString()
    );

    if (feedback.length === 0) {
      return res.status(200).json({
        sessionId: session._id,
        date: session.date,
        focusArea: session.focusArea,
        feedback: [],
        message: 'No feedback found for this player',
      });
    }

    res.json({
      sessionId: session._id,
      date: session.date,
      focusArea: session.focusArea,
      feedback,
    });
  } catch (err) {
    console.error('❌ Error in /player/session/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/dob', verifyRole('player'), async (req, res) => {
  try {
    const record = await PlayerDOB.findOne({ playerId: req.user.id });
    res.json({ dob: record?.dob || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DOB' });
  }
});

router.post('/dob', verifyRole('player'), async (req, res) => {
  const { dob } = req.body;
  if (!dob) return res.status(400).json({ error: 'DOB is required' });

  try {
    await PlayerDOB.findOneAndUpdate(
      { playerId: req.user.id },
      { dob },
      { upsert: true, new: true }
    );
    res.json({ message: 'DOB saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save DOB' });
  }
});

router.post('/update-age', verifyRole('player'), async (req, res) => {
  try {
    const record = await PlayerDOB.findOne({ playerId: req.user.id });
    if (!record?.dob) return res.status(400).json({ error: 'DOB not found' });

    const dob = new Date(record.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

    await Player.findByIdAndUpdate(req.user.id, { age });
    res.json({ message: 'Age updated', age });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update age' });
  }
});

// ✅ GET player by ID (for coach view)
router.get('/:id', verifyRole('coach'), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;