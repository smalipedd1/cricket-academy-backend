const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    unique: true,
  },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
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
  },
  schedule: {
    type: Object,
    default: {}
  },

  performance: [
    {
      session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
      rating: { type: Number, min: 1, max: 10 },
      notes: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  notes: [
    {
      coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
      content: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

playerSchema.pre('save', async function (next) {
  if (!this.playerId) {
    const count = await mongoose.model('Player').countDocuments();
    this.playerId = `PLR${1000 + count + 1}`;
  }
  next();
});

playerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Player', playerSchema);