const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TagSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#4F46E5' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tag', TagSchema);