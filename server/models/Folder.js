const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolderSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#4F46E5' },
  parentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  },
  path: { 
    type: String,
    default: '' 
  },
  level: { 
    type: Number, 
    default: 0 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FolderSchema.pre('save', async function(next) {
  try {
    if (this.isModified('parentId') || !this.path) {
      if (!this.parentId) {
        this.path = this._id.toString();
        this.level = 0;
      } else {
        const parent = await this.constructor.findById(this.parentId);
        if (parent) {
          this.path = `${parent.path},${this._id.toString()}`;
          this.level = parent.level + 1;
        } else {
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

module.exports = mongoose.model('Folder', FolderSchema);