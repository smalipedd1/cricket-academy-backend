const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
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
app.use('/api/coach', coachRoutes); // ✅ Single mount only

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));