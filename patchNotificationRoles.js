const mongoose = require('mongoose');
const Notification = require('./models/Notification');

const MONGO_URI = 'mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // 🎯 Update player-visible notifications
    const playerResult = await Notification.updateMany(
      { message: "Coach Update submitted feedback for your session." },
      { $set: { recipientRole: 'player' } }
    );
    console.log(`🔧 Player notifications updated: ${playerResult.modifiedCount}`);

    // 🎯 Update all others for coach
    const coachResult = await Notification.updateMany(
      { message: { $ne: "Coach Update submitted feedback for your session." } },
      { $set: { recipientRole: 'coach' } }
    );
    console.log(`🔧 Coach notifications updated: ${coachResult.modifiedCount}`);

    mongoose.disconnect();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });