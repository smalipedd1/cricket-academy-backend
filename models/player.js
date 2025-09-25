const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  ageGroup: String,
  evaluations: [
    {
      skillName: String,
      level: Number,
      date: Date,
      coachId: String
    }
  ],
  notes: [String]
});

module.exports = mongoose.model('Player', playerSchema);