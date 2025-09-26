const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  coachId: {
  type: String,
  unique: true,
  required: true
  }
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialty: {
    type: String,
    enum: ['Batting', 'Bowling', 'Fielding', 'Fitness'],
    required: true
  },
  experienceYears: { type: Number, required: true },
  emailAddress: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  }
});

module.exports = mongoose.model('Coach', coachSchema);