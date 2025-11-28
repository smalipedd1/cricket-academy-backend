const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    unique: true,
  },
  username: { type: String, unique: true, required: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  age: { type: Number },

  competitiveStartYear: {
    type: Number,
    min: 2010,
    max: new Date().getFullYear() + 5, // ✅ allow up to 5 years in the future
    validate: {
      validator: function (year) {
        const currentYear = new Date().getFullYear();
        const maxYear = currentYear + 5;
        return year >= 2010 && year <= maxYear;
      },
      message: function (props) {
        const maxYear = new Date().getFullYear() + 5;
        return `Competitive start year must be between 2010 and ${maxYear}`;
      },
    },
  },

  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'],
    required: true,
  },
  academyLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true,
  },
  emailAddress: {
    type: String,
    required: true,
    match: /.+\@.+\..+/,
    trim: true,
  },
  cricclubsID: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Graduated'],
    default: 'Active',
  },
  schedule: {
    type: Object,
    default: {},
  },
  performance: [
    {
      session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
      },
      rating: {
        batting: { type: Number, min: 0, max: 10, default: 0 },
        bowling: { type: Number, min: 0, max: 10, default: 0 },
        wicketkeeping: { type: Number, min: 0, max: 10, default: 0 },
        fielding: { type: Number, min: 0, max: 10, default: 0 },
      },
      notes: { type: String, trim: true },
      focusArea: {
        type: String,
        enum: ['Batting', 'Bowling', 'Fielding', 'Fitness', 'Strategy', 'Combined'],
        required: true,
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  notes: [
    {
      coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
      content: { type: String, trim: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
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
