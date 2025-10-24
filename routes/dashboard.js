const express = require('express');
const router = express.Router();
const { verifyRole } = require('../middleware/auth');
const Coach = require('../models/Coach');
const Player = require('../models/Player');
const Session = require('../models/Session');

router.get('/', verifyRole('admin'), async (req, res) => {
  const role = req.query.role;
  const userId = req.userId;

  try {
    if (role === 'coach') {
      const coach = await Coach.findById(userId);
      const sessions = await Session.find({ coach: userId });
      const players = await Player.find();

      const recentSessions = sessions.slice(-5).map(s => ({
        date: s.date,
        focusArea: s.focusArea,
        playerCount: s.performance.length
      }));

      res.json({
        role: 'coach',
        name: `${coach.firstName} ${coach.lastName}`,
        totalSessions: sessions.length,
        totalPlayers: players.length,
        recentSessions
      });
    }

	else if (role === 'admin') {
	  const today = new Date();
	  const twoWeeksLater = new Date();
	  twoWeeksLater.setDate(today.getDate() + 14);

	  const upcomingSessions = await Session.countDocuments({
 	   date: { $gte: today, $lte: twoWeeksLater }
 	 });

	  res.json({
	    role: 'admin',
	    upcomingSessions
	  });
	}

    else if (role === 'player') {
      const player = await Player.findById(userId);
      const sessions = await Session.find({ 'performance.player': userId });

      const recentProgress = sessions.slice(-5).flatMap(s =>
        s.performance.filter(p => p.player.toString() === userId).map(p => ({
          date: s.date,
          rating: p.rating,
          focusArea: p.focusArea,
          notes: p.notes
        }))
      );

      res.json({
        role: 'player',
        name: `${player.firstName} ${player.lastName}`,
        academyLevel: player.academyLevel,
        status: player.status,
        recentProgress
      });
    }

    else {
      res.status(400).json({ error: 'Invalid role' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;