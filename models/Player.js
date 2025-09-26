const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  playerId: {
  type: String,
  unique: true,
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'],
    required: true
  },
  academyLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  emailAddress: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  cricclubsID: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Graduated'],
    default: 'Active'
  }
});

playerSchema.pre('save', async function (next) {
  if (!this.playerId) {
    const count = await mongoose.model('Player').countDocuments();
    this.playerId = `PLR${1000 + count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Player', playerSchema);