const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },

  focusArea: {
    type: String,
    enum: ['Batting', 'Bowling', 'Fielding', 'Fitness', 'Combined'],
    required: true,
  },

  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true,
  },

  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
  ],

  notes: { type: String },

  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },

  performance: [
    {
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player', // ✅ Enables .populate('performance.player')
        required: true,
      },
      rating: {
        batting: Number,
        bowling: Number,
        wicketkeeping: Number,
        fielding: Number,
      },
      notes: String,
      focusArea: String,
      playerResponse: { type: String, default: '' }, // ✅ NEW FIELD
    },
  ],

  feedbackSubmitted: {
    type: Boolean,
    default: false,
  },

  isRecurring: { type: Boolean, default: false },

  recurrencePattern: {
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    time: { type: String }, // e.g. '17:00'
    durationMinutes: { type: Number },
    recurrenceGroupId: { type: String },
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', sessionSchema);