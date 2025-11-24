const express = require('express');
const router = express.Router();
const Coach = require('../models/Coach');
const Player = require('../models/Player');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { verifyRole } = require('../middleware/auth');

// 🧑‍🏫 Coach login
router.post('/coach/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const coach = await Coach.findOne({ username });
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    const isMatch = await bcrypt.compare(password, coach.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: coach._id, role: 'coach' }, // ✅ use `id` for consistency
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { ...coach.toObject(), role: 'coach' } }); // ✅ normalized role
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧑‍🎓 Player login
router.post('/player/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const player = await Player.findOne({ username });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const isMatch = await bcrypt.compare(password, player.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: player._id, role: 'player' }, // ✅ use `id` for consistency
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { ...player.toObject(), role: 'player' } }); // ✅ normalized role
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🛡️ Admin-only test route
router.get('/admin/test', verifyRole('admin'), async (req, res) => {
  res.json({ message: 'Admin route working' });
});

// 🧑‍🏫 Coach-only test route
router.get('/coach/test', verifyRole('coach'), async (req, res) => {
  res.json({ message: 'Coach route working' });
});

// 🧑‍🎓 Player-only test route
router.get('/player/test', verifyRole('player'), async (req, res) => {
  res.json({ message: 'Player route working' });
});

// 🔑 Change password (for coach or player)
router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, role } = decoded;

    // Pick correct model
    const Model = role === 'coach' ? Coach : Player;
    const user = await Model.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Old password incorrect' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;