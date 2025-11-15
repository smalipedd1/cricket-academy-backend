const express = require('express');
const router = express.Router();
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
    console.error('Evaluation creation error:', err);
    res.status(500).json({ error: 'Failed to create evaluation' });
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
    console.error('Fetch player evaluations error:', err);
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
    console.error('Player response error:', err);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

module.exports = router;