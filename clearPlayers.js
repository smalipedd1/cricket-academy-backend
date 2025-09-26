const mongoose = require('mongoose');
const Player = require('./models/Player');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  return Player.deleteMany({});
})
.then(() => {
  console.log('All players deleted');
  mongoose.connection.close();
})
.catch(err => {
  console.error('Error deleting players:', err);
});