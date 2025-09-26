const express = require('express');
const router = express.Router();
const Coach = require('../models/Coach');

// GET all coaches
router.get('/', async (req, res) => {
  try {
    const coaches = await Coach.find();
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new coach
router.post('/', async (req, res) => {
  try {
    const newCoach = new Coach(req.body);
    const savedCoach = await newCoach.save();
    res.status(201).json(savedCoach);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/by-id/:coachId', async (req, res) => {
  try {
    const coach = await Coach.findOne({ coachId: req.params.coachId });
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    res.json(coach);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;