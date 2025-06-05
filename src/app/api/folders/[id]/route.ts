import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Folder from '@/models/Folder';
import Conversation from '@/models/Conversation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    const folder = await Folder.findById(params.id);
    
    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Find all child folders (subfolders) using the path field
    const folder = await Folder.findById(params.id);
    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    // Find all subfolders that have this folder in their path
    const subfolders = await Folder.find({
      path: { $regex: params.id }
    });
    
    // Get all folder IDs that will be deleted
    const folderIdsToDelete = [params.id, ...subfolders.map(f => f._id)];
    
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
      _id: { $in: folderIdsToDelete }
    });
    
    console.log(`Deleted folder ${params.id} and ${subfolders.length} subfolders`);
    
    return NextResponse.json({ 
      success: true,
      message: `Deleted folder and ${subfolders.length} subfolders`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }
    
    const folder = await Folder.findById(params.id);
    
    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    // Update allowed fields
    if (body.name) folder.name = body.name;
    if (body.color) folder.color = body.color;
    if ('parentId' in body) {
      // If trying to set as a subfolder of itself or a descendant, reject
      if (body.parentId === folder._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'Cannot set folder as its own parent' },
          { status: 400 }
        );
      }
      
      // If parentId is being changed, the path and level need recalculation
      folder.parentId = body.parentId || null;
    }
    
    folder.updatedAt = new Date();
    await folder.save();
    
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update folder' },
      { status: 500 }
    );
  }
} 