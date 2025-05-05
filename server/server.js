const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AIwebUI';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/tags', require('./routes/tags'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});