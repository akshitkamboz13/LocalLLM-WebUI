import mongoose, { Schema } from 'mongoose';

const TagSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#4F46E5' },
  createdAt: { type: Date, default: Date.now }
});

// Check if the model exists before creating it to prevent overwriting
let Tag;

if (mongoose.models && mongoose.models.Tag) {
  Tag = mongoose.models.Tag;
} else if (mongoose.connection && mongoose.connection.readyState === 1) {
  // Only create the model if we have an active connection
  Tag = mongoose.model('Tag', TagSchema);
} else {
  // Default fallback when no connection yet
  Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);
}

export default Tag;