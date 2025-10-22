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

// ✅ Coach login route
router.post('/coach/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const coach = await Coach.findOne({ username });
    if (!coach) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, coach.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: coach._id, role: 'coach' },
      SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin profile route
router.get('/admin', verifyRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin dashboard route
router.get('/admin/dashboard', verifyRole('admin'), async (req, res) => {
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

// ✅ Admin registration route
router.post('/admin', verifyRole('admin'), async (req, res) => {
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

module.exports = router;