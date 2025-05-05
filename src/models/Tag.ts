import mongoose, { Schema } from 'mongoose';

const TagSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#4F46E5' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Tag || mongoose.model('Tag', TagSchema);