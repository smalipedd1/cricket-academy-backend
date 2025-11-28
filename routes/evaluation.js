const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Evaluation = require('../models/Evaluation');
const Player = require('../models/Player');
const Coach = require('../models/Coach');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');

// 🔹 Create a new evaluation (Draft or Submitted)
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
      status = 'Submitted', // default if not provided
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(coach)) {
      return res.status(400).json({ error: 'Invalid coach ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(player)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    const coachExists = await Coach.findById(coach);
    if (!coachExists) return res.status(404).json({ error: 'Coach not found' });

    const playerExists = await Player.findById(player);
    if (!playerExists) return res.status(404).json({ error: 'Player not found' });

    // For submitted evaluations, enforce required fields
    if (status === 'Submitted' && (!feedback || !categories || !coachComments)) {
      return res.status(400).json({ error: 'Missing required evaluation fields' });
    }

    const evaluation = new Evaluation({
      player,
      coach,
      feedback,
      categories,
      coachComments: coachComments?.trim() || '',
      gamesPlayed: Number(gamesPlayed) || 0,
      totalRuns: Number(totalRuns) || 0,
      totalWickets: Number(totalWickets) || 0,
      status,
      notifications: {
        playerNotified: status === 'Submitted',
        coachNotified: false,
      },
    });

    await evaluation.save();

    // 🔹 Only send notifications/emails if submitted
    if (status === 'Submitted') {
      await Notification.create({
        recipient: player,
        recipientRole: 'player',
        type: 'evaluation',
        message: `New evaluation from Coach ${coachExists.firstName} ${coachExists.lastName}`,
        link: `/player/session/${evaluation._id}`,
        session: evaluation._id,
        isRead: false,
      });

      if (playerExists?.emailAddress) {
        await sendMail(
          playerExists.emailAddress,
          'New Evaluation Submitted',
          `Coach ${coachExists.firstName} ${coachExists.lastName} has submitted an evaluation.`,
          `<p>Coach <strong>${coachExists.firstName} ${coachExists.lastName}</strong> has submitted an evaluation for you on <em>${new Date().toLocaleDateString()}</em>.<br/>Login to view: <a href="https://cricket-academy-frontend-px1s.onrender.com">Academy Portal</a></p>`
        );
      }

      const io = req.app.get('io');
      if (io) {
        io.to(player.toString()).emit('new-evaluation', {
          message: `New evaluation from Coach ${coachExists.firstName} ${coachExists.lastName}`,
          link: `/player-dashboard?section=evaluations`,
        });
      }
    }

    res.status(201).json({ message: `Evaluation ${status.toLowerCase()} successfully`, evaluation });
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
      status: ev.status,
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

    if (!playerResponse || typeof playerResponse !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing response text' });
    }

    const evaluation = await Evaluation.findById(id)
      .populate('coach', 'firstName lastName')
      .populate('player', 'firstName lastName');

    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    if (evaluation.playerResponded) return res.status(400).json({ error: 'Response already submitted' });

    evaluation.playerResponse = playerResponse.trim();
    evaluation.playerResponded = true;
    evaluation.notifications = { ...evaluation.notifications, coachNotified: true };

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

      const coachDoc = await Coach.findById(evaluation.coach._id);
      if (coachDoc?.emailAddress) {
        await sendMail(
          coachDoc.emailAddress,
          'Evaluation Response',
          `${playerName} responded to your evaluation from ${formattedDate}`,
          `<p>Player <strong>${playerName}</strong> responded to your evaluation from <em>${formattedDate}</em>.<br/>Login to view: <a href="https://cricket-academy-frontend-px1s.onrender.com">Academy Portal</a></p>`
        );
      }

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
      playerName: ev.player ? `${ev.player.firstName} ${ev.player.lastName}` : 'Unknown',
      coachName: ev.coach ? `${ev.coach.firstName} ${ev.coach.lastName}` : 'Unknown',
      feedback: ev.feedback,
      categories: transformCategories(ev.categories),
      coachComments: ev.coachComments,
      gamesPlayed: ev.gamesPlayed,
      totalRuns: ev.totalRuns,
      totalWickets: ev.totalWickets,
      playerResponded: ev.playerResponded,
      playerResponse: ev.playerResponse,
      createdAt: ev.createdAt,
      status: ev.status,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Coach view error:', err);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// 🔹 Get a single evaluation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid evaluation ID format' });
    }

    const evaluation = await Evaluation.findById(id)
      .populate('coach', 'firstName lastName')
      .populate('player', 'firstName lastName');

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const formatted = {
      _id: evaluation._id,
      createdAt: evaluation.createdAt,
      coachName: evaluation.coach
        ? `${evaluation.coach.firstName} ${evaluation.coach.lastName}`
        : 'Unknown',
      feedback: evaluation.feedback,
      categories: transformCategories(evaluation.categories),
      coachComments: evaluation.coachComments,
      gamesPlayed: evaluation.gamesPlayed,
      totalRuns: evaluation.totalRuns,
      totalWickets: evaluation.totalWickets,
      playerResponse: evaluation.playerResponse,
      playerResponded: evaluation.playerResponded,
      status: evaluation.status,
    };

    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching evaluation by ID:', err);
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
});

// Get all draft evaluations for a coach
router.get('/coach-drafts/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(coachId)) {
      return res.status(400).json({ error: 'Invalid coach ID format' });
    }

    const drafts = await Evaluation.find({ coach: coachId, status: 'Draft' })
      .populate('player', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(drafts);
  } catch (err) {
    console.error('❌ Error fetching drafts:', err);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// Update a draft evaluation to Submitted
router.put('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid evaluation ID format' });
    }

    const evaluation = await Evaluation.findById(id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
    if (evaluation.status !== 'Draft') return res.status(400).json({ error: 'Evaluation is not a draft' });

    // Update fields from request body
    evaluation.feedback = req.body.feedback || evaluation.feedback;
    evaluation.categories = req.body.categories || evaluation.categories;
    evaluation.coachComments = req.body.coachComments || evaluation.coachComments;
    evaluation.gamesPlayed = Number(req.body.gamesPlayed) || evaluation.gamesPlayed;
    evaluation.totalRuns = Number(req.body.totalRuns) || evaluation.totalRuns;
    evaluation.totalWickets = Number(req.body.totalWickets) || evaluation.totalWickets;

    evaluation.status = 'Submitted';
    evaluation.notifications = { playerNotified: true, coachNotified: false };

    await evaluation.save();

    res.json({ message: 'Draft submitted successfully', evaluation });
  } catch (err) {
    console.error('❌ Error submitting draft:', err);
    res.status(500).json({ error: 'Failed to submit draft' });
  }
});

// Get latest evaluation for a player
router.get('/player/:playerId/latest', async (req, res) => {
  try {
    const { playerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    const latest = await Evaluation.findOne({ player: playerId })
      .sort({ createdAt: -1 })
      .populate('coach', 'firstName lastName')
      .populate('player', 'firstName lastName');

    if (!latest) return res.json(null);

    res.json(latest);
  } catch (err) {
    console.error('❌ Error fetching latest evaluation:', err);
    res.status(500).json({ error: 'Failed to fetch latest evaluation' });
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