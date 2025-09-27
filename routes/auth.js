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

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ✅ Declare the admin variable
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // ✅ Include role in token payload
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

router.get('/admin', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.post('/admin', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { username, password } = req.body;
    const existing = await Admin.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const token = jwt.sign(
  { id: admin._id, role: 'admin' }, // ✅ Include role here
  SECRET,
  { expiresIn: '1h' }
);

module.exports = router;