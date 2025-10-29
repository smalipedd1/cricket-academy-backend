const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['feedback-submitted', 'response-submitted'],
    required: true
  },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  message: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);