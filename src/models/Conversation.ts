import mongoose, { Schema } from 'mongoose';

const ConversationSchema = new Schema({
  title: { type: String, required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  model: { type: String, required: true },
  systemPrompt: { type: String },
  parameters: { type: Map, of: Schema.Types.Mixed },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  isShared: { type: Boolean, default: false },
  shareLink: { type: String },
  shareSettings: {
    isPublic: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: false },
    expiresAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);