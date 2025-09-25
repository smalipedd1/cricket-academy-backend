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
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));



const PORT = process.env.PORT || 5000;

const playerRoutes = require('./routes/players');
app.use('/api/players', playerRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));