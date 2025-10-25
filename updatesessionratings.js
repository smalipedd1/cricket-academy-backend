const mongoose = require('mongoose');
const Session = require('./models/Session');
const Player = require('./models/Player');


// 🔧 Replace with your actual MongoDB connection string
const MONGO_URI = 'mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

(async () => {
  try {
    const sessions = await Session.find({});
    let updatedCount = 0;

    for (const session of sessions) {
      let modified = false;

      for (let i = 0; i < session.performance.length; i++) {
        const entry = session.performance[i];
        const rating = entry.rating;

        const isOldFormat = typeof rating === 'number';

        if (isOldFormat) {
          const numericRating = rating;
          session.performance[i].rating = {
            batting: numericRating,
            bowling: 0,
            wicketkeeping: 0,
            fielding: 0
          };
          modified = true;
        }
      }

      if (modified) {
        session.markModified('performance');
        await session.save();
        console.log(`✅ Patched session ${session._id}`);
        updatedCount++;
      }
    }

    console.log(`✅ Migration complete. Updated ${updatedCount} sessions.`);
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    mongoose.disconnect();
  }
})();