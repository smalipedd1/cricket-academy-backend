const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
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
router.get('/admin', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin dashboard route
router.get('/admin/dashboard', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

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
router.post('/admin', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

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

module.exports = router;