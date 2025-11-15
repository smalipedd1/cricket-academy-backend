const mongoose = require('mongoose');

const ratingEnum = ['Beginner', 'Tenured', 'Advanced', 'N/A'];

const evaluationSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  dateOfEvaluation: { type: Date, default: Date.now },

  feedback: {
    batting: {
      score: { type: Number, min: 1, max: 10 },
      comments: String,
    },
    bowling: {
      score: { type: Number, min: 1, max: 10 },
      comments: String,
    },
    mindset: {
      score: { type: Number, min: 1, max: 10 },
      comments: String,
    },
    fitness: {
      score: { type: Number, min: 1, max: 10 },
      comments: String,
    },
  },

  categories: {
    batting: {
      straightBatShots: { type: String, enum: ratingEnum },
      shotSelection: { type: String, enum: ratingEnum },
      playingSpin: { type: String, enum: ratingEnum },
      playingFast: { type: String, enum: ratingEnum },
      power: { type: String, enum: ratingEnum },
      footMovement: { type: String, enum: ratingEnum },
    },
    bowling: {
      bowlingAction: { type: String, enum: ratingEnum },
      accuracy: { type: String, enum: ratingEnum },
      paceVariation: { type: String, enum: ratingEnum },
      swing: { type: String, enum: ratingEnum },
      bowlingVariation: { type: String, enum: ratingEnum },
    },
    mindset: {
      gameSense: { type: String, enum: ratingEnum },
      maintainsCalm: { type: String, enum: ratingEnum },
      executeStrategies: { type: String, enum: ratingEnum },
      teamPlayer: { type: String, enum: ratingEnum },
    },
    fitness: {
      stamina: { type: String, enum: ratingEnum },
      core: { type: String, enum: ratingEnum },
      power: { type: String, enum: ratingEnum },
      endurance: { type: String, enum: ratingEnum },
    },
  },

  coachComments: String,
  playerResponse: String,
  playerResponded: { type: Boolean, default: false },

  notifications: {
    coachNotified: { type: Boolean, default: false },
    playerNotified: { type: Boolean, default: false },
  }
});

module.exports = mongoose.model('Evaluation', evaluationSchema);