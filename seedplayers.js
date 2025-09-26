const mongoose = require('mongoose');
const Player = require('./models/Player');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');

  return Player.insertMany([
    {
      firstName: 'Ravi',
      lastName: 'Kumar',
      age: 17,
      role: 'Batsman',
      academyLevel: 'Intermediate',
      emailAddress: 'ravi.kumar@example.com',
      cricclubsID: 'CC1001',
      status: 'Active'
    },
    {
      firstName: 'Aman',
      lastName: 'Singh',
      age: 19,
      role: 'Bowler',
      academyLevel: 'Advanced',
      emailAddress: 'aman.singh@example.com',
      cricclubsID: 'CC1002',
      status: 'Suspended'
    },
    {
      firstName: 'Neha',
      lastName: 'Patel',
      age: 16,
      role: 'All-Rounder',
      academyLevel: 'Beginner',
      emailAddress: 'neha.patel@example.com',
      cricclubsID: 'CC1003',
      status: 'Inactive'
    },
    {
      firstName: 'Karan',
      lastName: 'Mehta',
      age: 18,
      role: 'Wicketkeeper',
      academyLevel: 'Intermediate',
      emailAddress: 'karan.mehta@example.com',
      cricclubsID: 'CC1004',
      status: 'Graduated'
    }
  ]);
})
.then(() => {
  console.log('Player data seeded');
  mongoose.connection.close();
})
.catch(err => {
  console.error('Seeding error:', err);
});