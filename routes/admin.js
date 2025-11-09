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


const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ✅ Admin login route
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

// ✅ Admin dashboard route
router.get('/dashboard', verifyRole('admin'), async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments();
    const totalCoaches = await Coach.countDocuments();
    const totalSessions = await Session.countDocuments();
    const sessionsByFocus = await Session.aggregate([{ $group: { _id: '$focusArea', count: { $sum: 1 } } }]);

    res.json({ totalPlayers, totalCoaches, totalSessions, sessionsByFocus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin profile route
router.get('/', verifyRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin registration route
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

// ✅ Get all coaches
router.get('/coaches', verifyRole('admin'), async (req, res) => {
  try {
    const coaches = await Coach.find();
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update coach by ID (with password hashing)
router.put('/coaches/:id', verifyRole('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
	console.log('Incoming coach update payload:', req.body);

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
    console.error('Coach update error:', err);
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

// ✅ Get all players
router.get('/players', verifyRole('admin'), async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// ✅ Update player by ID (with password hashing)
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
    console.error('Player update error:', err);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// ✅ Create new coach
router.post('/coaches', verifyRole('admin'), async (req, res) => {
  try {
    const newCoach = new Coach(req.body);
    await newCoach.save();
    res.status(201).json(newCoach);
  } catch (err) {
    console.error('Error creating coach:', err);
    res.status(500).json({ error: 'Failed to create coach' });
  }
});

// ✅ Create new player
router.post('/players', verifyRole('admin'), async (req, res) => {
  try {
    const newPlayer = new Player(req.body);
    await newPlayer.save();
    res.status(201).json(newPlayer);
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// ✅ Create sessions (including recurring)
router.post('/sessions', verifyRole('admin'), async (req, res) => {
  const {
    date,
    focusArea,
    coach,
    players,
    notes,
    status,
    isRecurring,
    recurrencePattern,
  } = req.body;

  try {
    if (!isRecurring) {
      const session = new Session({ date, focusArea, coach, players, notes, status });
      await session.save();
      return res.status(201).json(session);
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
        isRecurring: true,
        recurrencePattern,
        recurrenceGroupId,
      });

      await session.save();
      sessions.push(session);
    }

    return res.status(201).json(sessions);
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get sessions with filters
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
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;