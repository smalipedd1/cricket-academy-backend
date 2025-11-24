require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');
const notificationRoutes = require('./routes/notifications');

const app = express(); // ✅ Must be declared before app.use()

// ✅ CORS configuration to allow frontend domain
const allowedOrigins = ['https://cricket-academy-frontend-px1s.onrender.com',
'https://cricacademy.com'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Routes
app.use('/api/evaluations', require('./routes/evaluation'));
app.use('/api/coach', require('./routes/coach'));
app.use('/api/player', require('./routes/players'));
app.use('/api', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
//app.use('/api', require('./routes/admin'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/sessions',require('./routes/sessions'));



// ✅ Create HTTP server and attach Socket.IO
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ Attach io to app for access in routes
app.set('io', io);

// ✅ Handle socket connections
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
    console.log(`🔌 User connected: ${userId}`);
  }

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${userId}`);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});