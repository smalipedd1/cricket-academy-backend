const mongoose = require('mongoose');
const Player = require('./models/Player'); // Adjust path if needed

// 🔧 Replace with your actual MongoDB connection string
const MONGO_URI = 'mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedPlayer = async () => {
  try {
    const existing = await Player.findOne({ username: 'shasi' });
    if (existing) {
      console.log('Player already exists');
      return mongoose.disconnect();
    }

    const player = new Player({
      username: 'shasi',
      password: 'securepass', // 🔐 Will be hashed automatically
      firstName: 'Shasi',
      lastName: 'Ramesh',
      age: 25,
      role: 'All-Rounder',
      academyLevel: 'Intermediate',
      emailAddress: 'shasi@example.com',
      cricclubsID: 'CRIC12345',
      status: 'Active'
      // playerId will be auto-generated
    });

    await player.save();
    console.log('✅ Player created successfully');
  } catch (err) {
    console.error('❌ Error seeding player:', err.message);
  } finally {
    mongoose.disconnect();
  }
};

seedPlayer();