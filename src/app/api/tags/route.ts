import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Tag from '@/models/Tag';

export async function GET(request: NextRequest) {
  try {
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for tags');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB', tags: [] },
        { status: 200 } // Still return 200 but with empty tags
      );
    }
    
    // Fetch tags directly from MongoDB
    const tags = await Tag.find().sort({ name: 1 });
    
    console.log(`Found ${tags.length} tags in MongoDB`);
    
    return NextResponse.json({ success: true, tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags', tags: [] },
      { status: 200 } // Still return 200 but with empty tags
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
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    // Connect to database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for tag creation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Create tag directly in MongoDB
    const tag = new Tag({
      name: body.name,
      color: body.color || '#4F46E5',
      createdAt: new Date()
    });
    
    await tag.save();
    console.log('Created new tag:', tag.name);
    
    return NextResponse.json({ success: true, tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create tag' },
      { status: 500 }
    );
  }
}