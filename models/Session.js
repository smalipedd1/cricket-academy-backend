const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  focusArea: {
    type: String,
    enum: ['Batting', 'Bowling', 'Fielding', 'Fitness'],
    required: true
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  notes: { type: String }
});

module.exports = mongoose.model('Session', sessionSchema);