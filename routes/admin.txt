const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyRole } = require('../middleware/auth');
const Session = require('../models/Session');
const Player = require('../models/Player');
const Coach = require('../models/Coach');
const PlayerDOB = require('../models/playerDOB');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin dashboard
router.get('/dashboard', verifyRole('admin'), async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments();
    const totalCoaches = await Coach.countDocuments();
    const totalSessions = await Session.countDocuments();
    const sessionsByFocus = await Session.aggregate([
      { $group: { _id: '$focusArea', count: { $sum: 1 } } },
    ]);

    res.json({ totalPlayers, totalCoaches, totalSessions, sessionsByFocus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin profile
router.get('/', verifyRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin registration
router.post('/', verifyRole('admin'), async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await Admin.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });

    await newAdmin.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update all player ages
router.post('/update-all-ages', verifyRole('admin'), async (req, res) => {
  try {
    const records = await PlayerDOB.find({});
    let updatedCount = 0;

    for (const record of records) {
      const dob = new Date(record.dob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

      await Player.findByIdAndUpdate(record.playerId, { age });
      updatedCount++;
    }

    res.json({ message: `Updated ${updatedCount} player ages.` });
  } catch (err) {
    console.error('Bulk age update error:', err);
    res.status(500).json({ error: 'Failed to update player ages.' });
  }
});

// Get all coaches
router.get('/coaches', verifyRole('admin'), async (req, res) => {
  try {
    const coaches = await Coach.find();
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update coach
router.put('/coaches/:id', verifyRole('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedCoach = await Coach.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCoach) return res.status(404).json({ error: 'Coach not found' });
    res.json(updatedCoach);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

// Create coach
router.post('/coaches', verifyRole('admin'), async (req, res) => {
  try {
    const newCoach = new Coach(req.body);
    await newCoach.save();
    res.status(201).json(newCoach);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create coach' });
  }
});

// Get all players
router.get('/players', verifyRole('admin'), async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Update player
router.put('/players/:id', verifyRole('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
    res.json(updatedPlayer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Create player
router.post('/players', verifyRole('admin'), async (req, res) => {
  try {
    const newPlayer = new Player(req.body);
    await newPlayer.save();
    res.status(201).json(newPlayer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Create session(s)
router.post('/sessions', verifyRole('admin'), async (req, res) => {
  const {
    date,
    focusArea,
    coach,
    players,
    notes = '',
    status = 'Active',
    isRecurring,
    recurrencePattern,
  } = req.body;

  try {
    const performance = players.map(playerId => ({
      player: playerId,
      rating: {},
      notes: '',
      focusArea,
      playerResponse: '',
    }));

    if (!isRecurring) {
      const session = new Session({
        date,
        focusArea,
        coach,
        players,
        notes,
        status,
        performance,
      });
      await session.save();
      return res.status(201).json(session);
    }

    if (!recurrencePattern) {
      return res.status(400).json({ error: 'Missing recurrencePattern for recurring session' });
    }

    const { dayOfWeek, time, durationMinutes, recurrenceGroupId } = recurrencePattern;

    const sessions = [];
    const startDate = new Date(date);

    for (let i = 0; i < 12; i++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + i * 7);

      const session = new Session({
        date: nextDate,
        focusArea,
        coach,
        players,
        notes,
        status,
        performance,
        isRecurring: true,
        recurrencePattern,
        recurrenceGroupId,
      });

      await session.save();
      sessions.push(session);
    }

    return res.status(201).json(sessions);
  } catch (err) {
    console.error('❌ Session creation error:', err.message, err.errors);
    res.status(500).json({ error: err.message });
  }
});

// Get sessions with filters
router.get('/sessions', verifyRole('admin'), async (req, res) => {
  const { coachId, startDate, endDate, academyLevel } = req.query;
  const query = {};

  if (coachId) query.coach = coachId;
  if (academyLevel) query.academyLevel = academyLevel;
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  try {
    const sessions = await Session.find(query).populate('coach').populate('players');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;