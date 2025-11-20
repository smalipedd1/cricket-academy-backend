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
    if (io) {
      io.to(player.toString()).emit('new-evaluation', {
        message: `New evaluation from Coach ${coachExists.firstName} ${coachExists.lastName}`,
        link: `/player-dashboard?section=evaluations`,
      });
    }

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
      .sort({ createdAt: -1 });

    const formatted = evaluations.map((ev) => ({
      _id: ev._id,
      dateOfEvaluation: ev.createdAt,
      coachName: ev.coach?.firstName && ev.coach?.lastName
        ? `${ev.coach.firstName} ${ev.coach.lastName}`
        : 'Unknown',
      feedback: ev.feedback,
      categories: transformCategories(ev.categories),
      coachComments: ev.coachComments,
      gamesPlayed: ev.gamesPlayed,
      totalRuns: ev.totalRuns,
      totalWickets: ev.totalWickets,
      playerResponse: ev.playerResponse,
      playerResponded: ev.playerResponded,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch player evaluations error:', err);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// 🔹 Player submits response
router.post('/:id/respond', async (req, res) => {
  console.log('🔍 Incoming player response');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  try {
    const { playerResponse } = req.body;
    const { id } = req.params;

    if (!playerResponse || typeof playerResponse !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing response text' });
    }

    const evaluation = await Evaluation.findById(id)
      .populate('coach', 'firstName lastName')
      .populate('player', 'firstName lastName');

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

    if (evaluation.coach && evaluation.coach._id) {
      const playerName = evaluation.player
        ? `${evaluation.player.firstName} ${evaluation.player.lastName}`
        : 'A player';

      const formattedDate = evaluation.createdAt
        ? new Date(evaluation.createdAt).toLocaleDateString()
        : 'an earlier date';

      await Notification.create({
        recipient: evaluation.coach._id,
        recipientRole: 'coach',
        type: 'player-response',
        message: `${playerName} responded to your evaluation from ${formattedDate}`,
        link: `/coach/evaluations/${evaluation._id}`,
        session: evaluation._id,
        isRead: false,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(evaluation.coach._id.toString()).emit('new-player-response', {
          message: `${playerName} responded to your evaluation from ${formattedDate}`,
          link: `/coach/evaluations/${evaluation._id}`,
        });
      }
    }

    res.json({ message: 'Response submitted', evaluation });
  } catch (err) {
    console.error('❌ Player response error:', err.message);
    console.error('🧠 Stack trace:', err.stack);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// 🔹 Get all evaluations for coach dashboard
router.get('/coach-view', async (req, res) => {
  try {
    const evaluations = await Evaluation.find()
      .populate('player', 'firstName lastName')
      .populate('coach', 'firstName lastName')
      .sort({ createdAt: -1 });

    const formatted = evaluations.map((ev) => ({
      _id: ev._id,
      playerName: ev.player
        ? `${ev.player.firstName} ${ev.player.lastName}`
        : 'Unknown',
      coachName: ev.coach
        ? `${ev.coach.firstName} ${ev.coach.lastName}`
        : 'Unknown',
      feedback: ev.feedback,
      categories: transformCategories(ev.categories),
      coachComments: ev.coachComments,
      gamesPlayed: ev.gamesPlayed,
      totalRuns: ev.totalRuns,
      totalWickets: ev.totalWickets,
      playerResponded: ev.playerResponded,
      playerResponse: ev.playerResponse,
      createdAt: ev.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Coach view error:', err);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// 🔹 Helper to normalize category structure
function transformCategories(raw) {
  const output = {};
  for (const key of ['batting', 'bowling', 'mindset', 'fitness']) {
    const section = raw[key];
    if (!section) continue;

    const { score, comments, skills = {}, ...rest } = section;
    const normalizedSkills = {};

    const rawSkills = Object.keys(skills).length ? skills : rest;

    for (const [skill, value] of Object.entries(rawSkills)) {
      normalizedSkills[skill] =
        typeof value === 'object' ? value : { level: value };
    }

    output[key] = {
      score: score ?? null,
      comments: comments ?? '',
      skills: normalizedSkills,
    };
  }
  return output;
}

module.exports = router;