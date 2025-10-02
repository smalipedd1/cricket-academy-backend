const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const coachSchema = new mongoose.Schema({
  coachId: {
    type: String,
    unique: true,
  },
  username: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
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

// ✅ Auto-generate coachId
coachSchema.pre('save', async function (next) {
  if (!this.coachId) {
    const count = await mongoose.model('Coach').countDocuments();
    this.coachId = `COACH${100 + count + 1}`;
  }

  // ✅ Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});

module.exports = mongoose.model('Coach', coachSchema);