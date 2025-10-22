const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyRole } = require('../middleware/auth');
const Session = require('../models/Session');
const Player = require('../models/Player');
const Coach = require('../models/Coach');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ✅ Admin login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      SECRET,
      { expiresIn: '1h' }
    );

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

    const sessionsByFocus = await Session.aggregate([
      { $group: { _id: '$focusArea', count: { $sum: 1 } } }
    ]);

    res.json({
      totalPlayers,
      totalCoaches,
      totalSessions,
      sessionsByFocus
    });
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

// ✅ Update coach by ID
router.put('/coaches/:id', verifyRole('admin'), async (req, res) => {
  try {
    const updatedCoach = await Coach.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCoach) return res.status(404).json({ error: 'Coach not found' });
    res.json(updatedCoach);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ✅ Update player by ID
router.put('/players/:id', verifyRole('admin'), async (req, res) => {
  try {
    const updatedPlayer = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
    res.json(updatedPlayer);
  } catch (err) {
    console.error('Error updating player:', err);
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

module.exports = router;