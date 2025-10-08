const mongoose = require('mongoose');
const Player = require('./models/Player');

mongoose.connect('mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    await Player.updateMany({}, { $set: { notes: [] } });
    console.log('✅ Notes field seeded for all players');
    mongoose.disconnect();
  })
  .catch(err => console.error('MongoDB connection error:', err));