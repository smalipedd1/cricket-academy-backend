const express = require('express');
const allowedOrigins = ['https://cricket-academy-frontend-px1s.onrender.com'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // 🔌 Create HTTP server for Socket.IO

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 🔗 Attach io to app so routes can access it via req.app.get('io')
app.set('io', io);

// 🔐 Optional: join userId room from frontend socket.js
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Cricket Academy API is running');
});

// Disable command buffering to avoid silent timeouts
mongoose.set('bufferCommands', false);

// Connect to MongoDB with recommended options
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

// ✅ Player routes
const playerRoutes = require('./routes/players');
app.use('/api/player', playerRoutes);

const playerAuthRoutes = require('./routes/playerAuth');
app.use('/api/player', playerAuthRoutes);

// ✅ Coach routes
const coachRoutes = require('./routes/coach');
app.use('/api/coach', coachRoutes);

// ✅ Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// ✅ Session routes
const sessionRoutes = require('./routes/sessions');
app.use('/api/sessions', sessionRoutes);

// ✅ Auth routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// ✅ Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// ✅ Evaluation routes
const evaluationRoutes = require('./routes/evaluation');
app.use('/api/evaluations', evaluationRoutes);

// ✅ CricClubs routes
const cricclubsRoutes = require('./routes/cricclubs');
app.use('/api/cricclubs', cricclubsRoutes);

// ✅ Notification routes
app.use('/api/notifications', require('./routes/notifications'));

// ✅ Start server with Socket.IO
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));