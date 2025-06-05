import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Folder from '@/models/Folder';

export async function GET(request: NextRequest) {
  try {
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for folders');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB', folders: [] },
        { status: 200 } // Still return 200 but with empty folders
      );
    }
    
    // Fetch folders directly from MongoDB
    // Add sorting by level first, then by name to get a proper hierarchy
    const folders = await Folder.find().sort({ level: 1, name: 1 });
    
    console.log(`Found ${folders.length} folders in MongoDB`);
    
    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folders', folders: [] },
      { status: 200 } // Still return 200 but with empty folders
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Parse request body
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Folder name is required' },
        { status: 400 }
      );
    }
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for folder creation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Create folder with potential parent
    const folderData = {
      name: body.name,
      color: body.color || '#4F46E5',
      parentId: body.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create folder directly in MongoDB
    const folder = new Folder(folderData);
    await folder.save();
    
    console.log('Created new folder:', folder.name, folder.parentId ? `under parent ${folder.parentId}` : 'at root level');
    
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create folder' },
      { status: 500 }
    );
  }
}