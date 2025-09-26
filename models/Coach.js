const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  coachId: {
  type: String,
  unique: true,
  },
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

coachSchema.pre('save', async function (next) {
  if (!this.coachId) {
    const count = await mongoose.model('Coach').countDocuments();
    this.coachId = `COACH${100 + count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Coach', coachSchema);