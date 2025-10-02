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

const playerRoutes = require('./routes/players');
app.use('/api/players', playerRoutes);

const coachRoutes = require('./routes/coaches');
app.use('/api/coaches', coachRoutes);

const sessionRoutes = require('./routes/sessions');
app.use('/api/sessions', sessionRoutes);

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const playerAuthRoutes = require('./routes/playerAuth');
app.use('/api/player', playerAuthRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));