import mongoose, { Schema } from 'mongoose';

// Define the schema
const FolderSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#4F46E5' },
  // Add parentId for nesting structure
  parentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  },
  // Track the path to root for efficient queries
  path: { 
    type: String,
    default: '' 
  },
  // Track the nesting level for UI display
  level: { 
    type: Number, 
    default: 0 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add a pre-save hook to update the path based on parent
FolderSchema.pre('save', async function(next) {
  try {
    if (this.isModified('parentId') || !this.path) {
      if (!this.parentId) {
        // Root level folder
        this.path = this._id.toString();
        this.level = 0;
      } else {
        // Find the parent to get its path
        const parent = await mongoose.model('Folder').findById(this.parentId);
        if (parent) {
          this.path = `${parent.path},${this._id.toString()}`;
          this.level = parent.level + 1;
        } else {
          // If parent doesn't exist (which shouldn't happen), set as root
          this.path = this._id.toString();
          this.level = 0;
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Check if the model exists before creating it to prevent overwriting
let Folder;

if (mongoose.models && mongoose.models.Folder) {
  Folder = mongoose.models.Folder;
} else if (mongoose.connection && mongoose.connection.readyState === 1) {
  // Only create the model if we have an active connection
  Folder = mongoose.model('Folder', FolderSchema);
} else {
  // Default fallback when no connection yet
  Folder = mongoose.models.Folder || mongoose.model('Folder', FolderSchema);
}

export default Folder;