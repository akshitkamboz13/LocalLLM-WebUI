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

// Check if the model exists before creating it to prevent overwriting
let Conversation;

if (mongoose.models && mongoose.models.Conversation) {
  Conversation = mongoose.models.Conversation;
} else if (mongoose.connection && mongoose.connection.readyState === 1) {
  // Only create the model if we have an active connection
  Conversation = mongoose.model('Conversation', ConversationSchema);
} else {
  // Default fallback when no connection yet
  Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
}

export default Conversation;