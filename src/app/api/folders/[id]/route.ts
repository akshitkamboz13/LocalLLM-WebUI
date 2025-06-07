import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, localStorageDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Folder from '@/models/Folder';
import Conversation from '@/models/Conversation';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Await the id parameter before using it
    const id = await params.id;
    
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('X-MongoDB-URI') || '';
    
    // Connect to database with the provided URI
    const isConnected = await connectToDatabase(mongodbUri);
    
    if (!isConnected) {
      // Use localStorage fallback when MongoDB is not connected
      // Get folders from localStorage
      const folders = localStorageDB.getItem('folders') || [];
      const folder = folders.find((f: any) => f._id === id);
      
      if (!folder) {
        return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, folder });
    }
    
    // If MongoDB is connected, use it
    // Import models here to avoid circular dependencies
    const Folder = (await import('@/models/Folder')).default;
    
    // Find the folder
    const folder = await Folder.findById(id);
    
    if (!folder) {
      return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch folder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await the id parameter before using it
    const id = await params.id;

    // Get MongoDB URI from header if available
    const mongodbUri = request.headers.get('X-MongoDB-URI') || '';
    
    // Connect to database with the provided URI
    const isConnected = await connectToDatabase(mongodbUri);
    
    if (!isConnected) {
      // Use localStorage fallback when MongoDB is not connected
      // Get folders from localStorage
      const folders = localStorageDB.getItem('folders') || [];
      const folderIndex = folders.findIndex((f: any) => f._id === id);

      if (folderIndex === -1) {
        return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
      }
      
      // Find all conversations in this folder
      const conversations = localStorageDB.getItem('conversations') || [];
      
      // Update conversations in this folder - set folderId to null
      const updatedConversations = conversations.map((conv: any) => {
        if (conv.folderId === id) {
          return { ...conv, folderId: null };
        }
        return conv;
      });
      
      // Save updated conversations
      localStorageDB.setItem('conversations', updatedConversations);
      
      // Remove the folder
      folders.splice(folderIndex, 1);
      localStorageDB.setItem('folders', folders);
      
      return NextResponse.json({ 
        success: true,
        message: `Deleted folder from local storage`,
        deletedCount: 1
      });
    }
    
    // If MongoDB is connected, use it
    // Import models here to avoid circular dependencies
    const Folder = (await import('@/models/Folder')).default;
    const Conversation = (await import('@/models/Conversation')).default;
    
    // Find the folder
    const folder = await Folder.findById(id);
    if (!folder) {
      return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
    }
    
    // Find all child folders (subfolders) using the path field
    const subfolders = await Folder.find({
      path: { $regex: id }
    });
    
    // Get all folder IDs that will be deleted
    const folderIdsToDelete = [id, ...subfolders.map(f => f._id.toString())];
    
    // Update conversations in this folder and subfolders - set folderId to null
    await Conversation.updateMany(
      { 
        $or: [
          { folderId: { $in: folderIdsToDelete } },
          { "folderId._id": { $in: folderIdsToDelete } } // Handle object format
        ]
      },
      { $set: { folderId: null } }
    );
    
    // Delete the folder and all subfolders
    const deleteResult = await Folder.deleteMany({
      _id: { $in: folderIdsToDelete.map(id => new mongoose.Types.ObjectId(id)) }
    });
    
    console.log(`Deleted folder ${id} and ${subfolders.length} subfolders`);
    
    return NextResponse.json({ 
      success: true,
      message: `Deleted folder and ${subfolders.length} subfolders`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete folder' }, { status: 500 });
  }
}

// PUT /api/folders/[id] - Update a folder
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await the id parameter before using it
    const id = await params.id;
    
    const body = await request.json();
    const { name, color, parentId } = body;

    // Basic validation
    if (!id) {
      return NextResponse.json({ success: false, error: 'Folder ID is required' }, { status: 400 });
    }

    // Get MongoDB URI from header if available
    const mongodbUri = request.headers.get('X-MongoDB-URI') || '';
    
    // Connect to database with the provided URI
    const isConnected = await connectToDatabase(mongodbUri);
    
    if (!isConnected) {
      // Use localStorage fallback when MongoDB is not connected
      // Get folders from localStorage
      const folders = localStorageDB.getItem('folders') || [];
      const folderIndex = folders.findIndex((f: any) => f._id === id);

      if (folderIndex === -1) {
        return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
      }

      // Update folder fields
      const updatedFields: any = {};
      if (name !== undefined) updatedFields.name = name;
      if (color !== undefined) updatedFields.color = color;
      if (parentId !== undefined) updatedFields.parentId = parentId;

      // Update folder
      folders[folderIndex] = {
        ...folders[folderIndex],
        ...updatedFields,
        updatedAt: new Date()
      };

      // Save updated folders
      localStorageDB.setItem('folders', folders);
      return NextResponse.json({ success: true, folder: folders[folderIndex] });
    }
    
    // If MongoDB is connected, use it
    // Prepare updated fields
    const updatedFields: any = {};
    if (name !== undefined) updatedFields.name = name;
    if (color !== undefined) updatedFields.color = color;
    if (parentId !== undefined) updatedFields.parentId = parentId;

    if (Object.keys(updatedFields).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    // Import models here to avoid circular dependencies
    const Folder = (await import('@/models/Folder')).default;
    
    // Update the folder in MongoDB
    const result = await Folder.findByIdAndUpdate(
      id,
      { $set: updatedFields },
      { new: true } // Return the updated document
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, folder: result });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ success: false, error: 'Failed to update folder' }, { status: 500 });
  }
} 