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
    const session = await Session.findOne({}).lean();
    console.log('🔍 Sample session:', JSON.stringify(session, null, 2));
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    mongoose.disconnect();
  }
})();