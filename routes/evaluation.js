const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Evaluation = require('../models/Evaluation');
const Player = require('../models/Player');
const Coach = require('../models/Coach');

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

    // ✅ Validate coach ID format
    if (!mongoose.Types.ObjectId.isValid(coach)) {
      return res.status(400).json({ error: 'Invalid coach ID format' });
    }

    // ✅ Confirm coach exists
    const coachExists = await Coach.findById(coach);
    if (!coachExists) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const evaluation = new Evaluation({
      player,
      coach,
      feedback,
      categories,
      coachComments,
      gamesPlayed,
      totalRuns,
      totalWickets,
      notifications: { playerNotified: true },
    });

    await evaluation.save();
    res.status(201).json({ message: 'Evaluation created', evaluation });
  } catch (err) {
    console.error('Evaluation creation error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});
// 🔹 Get evaluations for a player
router.get('/player/:playerId', async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ player: req.params.playerId })
      .populate('coach', 'firstName lastName')
      .sort({ dateOfEvaluation: -1 });

    res.json(evaluations);
  } catch (err) {
    console.error('Fetch player evaluations error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// 🔹 Player submits response
router.post('/:id/respond', async (req, res) => {
  try {
    const { playerResponse } = req.body;

    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });

    evaluation.playerResponse = playerResponse;
    evaluation.playerResponded = true;
    evaluation.notifications.coachNotified = true;

    await evaluation.save();
    res.json({ message: 'Response submitted', evaluation });
  } catch (err) {
    console.error('Player response error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

module.exports = router;