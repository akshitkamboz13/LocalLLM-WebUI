const express = require('express');
const router = express.Router();

// Import the Folder model
const Folder = require('../models/Folder');

// Get all folders
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.find().sort({ name: 1 });
    res.json({ folders });
  } catch (err) {
    console.error('Error fetching folders:', err);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create a new folder
router.post('/', async (req, res) => {
  try {
    const folder = new Folder(req.body);
    await folder.save();
    res.status(201).json({ folder });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update a folder
router.put('/:id', async (req, res) => {
  try {
    const folder = await Folder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    res.json({ folder });
  } catch (err) {
    console.error('Error updating folder:', err);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete a folder
router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findByIdAndDelete(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    console.error('Error deleting folder:', err);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

module.exports = router;