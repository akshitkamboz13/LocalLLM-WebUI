const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import the Conversation model
const Conversation = require('../models/Conversation');

// Helper function to connect to MongoDB with URI from header
async function connectWithUri(req) {
  const uri = req.headers['x-mongodb-uri'] || process.env.MONGODB_URI;
  
  if (!uri) {
    return false;
  }
  
  try {
    // Check if we're already connected
    if (mongoose.connection.readyState === 1) {
      // If we're connected but to a different URI, disconnect first
      const currentUri = mongoose.connection.client.s.url;
      if (currentUri !== uri) {
        await mongoose.disconnect();
        await mongoose.connect(uri);
      }
    } else {
      // Not connected, so connect
      await mongoose.connect(uri);
    }
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
}

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const connected = await connectWithUri(req);
    
    if (!connected) {
      return res.status(400).json({ 
        success: false, 
        error: 'No MongoDB URI provided or connection failed' 
      });
    }
    
    const { folderId, tagId } = req.query;
    let query = {};
    
    if (folderId) {
      query.folderId = folderId;
    }
    
    if (tagId) {
      query.tags = tagId;
    }
    
    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .populate('tags')
      .populate('folderId');
      
    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// Get a single conversation by ID
router.get('/:id', async (req, res) => {
  try {
    const connected = await connectWithUri(req);
    
    if (!connected) {
      return res.status(400).json({ 
        success: false, 
        error: 'No MongoDB URI provided or connection failed' 
      });
    }
    
    const conversation = await Conversation.findById(req.params.id)
      .populate('tags')
      .populate('folderId');
      
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    res.json({ success: true, conversation });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const connected = await connectWithUri(req);
    
    if (!connected) {
      return res.status(400).json({ 
        success: false, 
        error: 'No MongoDB URI provided or connection failed' 
      });
    }
    
    const conversation = new Conversation(req.body.conversation);
    await conversation.save();
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// Update a conversation
router.put('/:id', async (req, res) => {
  try {
    const connected = await connectWithUri(req);
    
    if (!connected) {
      return res.status(400).json({ 
        success: false, 
        error: 'No MongoDB URI provided or connection failed' 
      });
    }
    
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      req.body.conversation,
      { new: true, runValidators: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    res.json({ success: true, conversation });
  } catch (err) {
    console.error('Error updating conversation:', err);
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

// Delete a conversation
router.delete('/:id', async (req, res) => {
  try {
    const connected = await connectWithUri(req);
    
    if (!connected) {
      return res.status(400).json({ 
        success: false, 
        error: 'No MongoDB URI provided or connection failed' 
      });
    }
    
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
});

module.exports = router;