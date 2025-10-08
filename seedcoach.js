const mongoose = require('mongoose');
const Coach = require('./models/Coach');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

async function seedCoach() {
  try {
    const existing = await Coach.findOne({ username: 'coach1' });
    if (existing) {
      console.log('Coach already exists');
      return mongoose.disconnect();
    }

    const coach = new Coach({
      username: 'coach1',
      password: 'securepass',
      firstName: 'Ravi',
      lastName: 'Kumar',
      specialty: 'Bowling',
      experienceYears: 8,
      emailAddress: 'ravi.kumar@academy.com'
    });

    await coach.save();
    console.log('Coach seeded successfully');
  } catch (err) {
    console.error('Error seeding coach:', err);
  } finally {
    mongoose.disconnect();
  }
}

seedCoach();