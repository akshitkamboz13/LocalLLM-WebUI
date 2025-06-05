import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Conversation from '@/models/Conversation';

// GET a shared conversation by shareId
export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const shareId = params.shareId;
    
    if (!shareId) {
      return NextResponse.json(
        { success: false, error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    console.log('Fetching shared conversation with shareId:', shareId);
    
    // Connect to the database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for fetching shared conversation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // Find the conversation by shareId
    let conversation;
    try {
      conversation = await Conversation.findOne({ 
        shareLink: shareId,
        isShared: true
      }).lean();
    } catch (error) {
      console.error('Error finding conversation:', error);
      return NextResponse.json(
        { success: false, error: 'Database error while finding conversation' },
        { status: 500 }
      );
    }
    
    if (!conversation) {
      console.log('Shared conversation not found with shareId:', shareId);
      return NextResponse.json(
        { success: false, error: 'Shared conversation not found' },
        { status: 404 }
      );
    }
    
    console.log('Found shared conversation:', conversation._id);
    
    // Check if the share has expired
    if (conversation.shareSettings && conversation.shareSettings.expiresAt) {
      const expiryDate = new Date(conversation.shareSettings.expiresAt);
      const now = new Date();
      
      if (expiryDate < now) {
        console.log('Share link has expired');
        return NextResponse.json(
          { success: false, error: 'Share link has expired' },
          { status: 410 } // Gone
        );
      }
    }
    
    // Check if the share is public
    if (conversation.shareSettings && !conversation.shareSettings.isPublic) {
      console.log('This conversation is not publicly shared');
      return NextResponse.json(
        { success: false, error: 'This conversation is not publicly shared' },
        { status: 403 } // Forbidden
      );
    }
    
    // Return the conversation
    return NextResponse.json({
      success: true,
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        messages: conversation.messages,
        model: conversation.model,
        shareSettings: conversation.shareSettings
      }
    });
  } catch (error) {
    console.error('Error fetching shared conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch shared conversation' 
      },
      { status: 500 }
    );
  }
} 