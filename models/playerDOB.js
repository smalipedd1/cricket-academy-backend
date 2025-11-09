// models/playerDOB.js
const mongoose = require('mongoose');

const playerDOBSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true
  },
  dob: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('PlayerDOB', playerDOBSchema);