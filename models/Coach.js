const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const coachSchema = new mongoose.Schema({
  coachId: {
    type: String,
    unique: true
  },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  emailAddress: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  phoneNumber: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    enum: ['Batting', 'Bowling', 'Fitness', 'Fielding', 'Wicketkeeping'],
    required: false
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  }
});

coachSchema.pre('save', async function (next) {
  if (!this.coachId) {
    const count = await mongoose.model('Coach').countDocuments();
    this.coachId = `COACH${1000 + count + 1}`;
  }
  next();
});

coachSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Coach', coachSchema);