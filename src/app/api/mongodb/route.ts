import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const { uri } = await request.json();
    
    if (!uri) {
      return NextResponse.json({ success: false, message: 'MongoDB URI is required' }, { status: 400 });
    }
    
    // Test connection
    await mongoose.connect(uri);
    
    // If connection succeeds, close it
    await mongoose.connection.close();
    
    return NextResponse.json({ success: true, message: 'MongoDB connection successful' });
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to connect to MongoDB',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 