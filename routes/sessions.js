const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().populate('coach').populate('players');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new session
router.post('/', async (req, res) => {
  try {
    const newSession = new Session(req.body);
    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;