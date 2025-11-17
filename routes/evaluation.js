const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Evaluation = require('../models/Evaluation');
const Player = require('../models/Player');
const Coach = require('../models/Coach');
const Notification = require('../models/Notification');

// 🔹 Create a new evaluation
router.post('/', async (req, res) => {
  try {
    const {
      player,
      coach,
      feedback,
      categories,
      coachComments,
      gamesPlayed,
      totalRuns,
      totalWickets,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(coach)) {
      return res.status(400).json({ error: 'Invalid coach ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(player)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    const coachExists = await Coach.findById(coach);
    if (!coachExists) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const playerExists = await Player.findById(player);
    if (!playerExists) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!feedback || !categories || !coachComments) {
      return res.status(400).json({ error: 'Missing required evaluation fields' });
    }

    const evaluation = new Evaluation({
      player,
      coach,
      feedback,
      categories,
      coachComments: coachComments.trim(),
      gamesPlayed: Number(gamesPlayed) || 0,
      totalRuns: Number(totalRuns) || 0,
      totalWickets: Number(totalWickets) || 0,
      notifications: {
        playerNotified: true,
        coachNotified: false,
      },
    });

    await evaluation.save();

    await Notification.create({
      recipient: player,
      recipientRole: 'player',
      type: 'evaluation',
      message: `New evaluation from Coach ${coachExists.firstName} ${coachExists.lastName}`,
      link: `/player/session/${evaluation._id}`,
      session: evaluation._id,
      isRead: false,
    });

    const io = req.app.get('io');
    io.to(player.toString()).emit('new-evaluation', {
      message: `New evaluation from Coach ${coachExists.firstName} ${coachExists.lastName}`,
      link: `/player-dashboard?section=evaluations`,
    });

    res.status(201).json({ message: 'Evaluation created', evaluation });
  } catch (err) {
    console.error('Evaluation creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get evaluations for a player
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    const evaluations = await Evaluation.find({ player: playerId })
      .populate('coach', 'firstName lastName')
      .sort({ dateOfEvaluation: -1 });

    const formatted = evaluations.map((ev) => ({
      _id: ev._id,
      dateOfEvaluation: ev.dateOfEvaluation,
      coachName: ev.coach?.firstName && ev.coach?.lastName
        ? `${ev.coach.firstName} ${ev.coach.lastName}`
        : 'Unknown',
      feedback: ev.feedback,
      categories: ev.categories,
      coachComments: ev.coachComments,
      gamesPlayed: ev.gamesPlayed,
      totalRuns: ev.totalRuns,
      totalWickets: ev.totalWickets,
      playerResponse: ev.playerResponse,
      playerResponded: ev.playerResponded, // ✅ critical for frontend sync
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch player evaluations error:', err);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// 🔹 Player submits response
router.post('/:id/respond', async (req, res) => {
  try {
    const { playerResponse } = req.body;
    const { id } = req.params;

    console.log('🔍 Incoming response:', { id, playerResponse });

    if (!playerResponse || typeof playerResponse !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing response text' });
    }

    const evaluation = await Evaluation.findById(id).populate('coach', 'firstName lastName');
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (evaluation.playerResponded) {
      return res.status(400).json({ error: 'Response already submitted' });
    }

    evaluation.playerResponse = playerResponse.trim();
    evaluation.playerResponded = true;
    evaluation.notifications = {
      ...evaluation.notifications,
      coachNotified: true,
    };

    await evaluation.save();

    await Notification.create({
      userId: evaluation.coach._id,
      type: 'player-response',
      message: `Player responded to your evaluation`,
      link: `/coach-dashboard?section=evaluations`,
      read: false,
      createdAt: new Date(),
    });

    const io = req.app.get('io');
    io.to(evaluation.coach._id.toString()).emit('new-player-response', {
      message: `Player responded to your evaluation`,
      link: `/coach-dashboard?section=evaluations`,
    });

    res.json({ message: 'Response submitted', evaluation });
  } catch (err) {
    console.error('❌ Player response error:', err);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

module.exports = router;