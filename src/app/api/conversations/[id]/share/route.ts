import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Conversation from '@/models/Conversation';

interface ShareLinkRequest {
  isPublic: boolean;
  expiry: string | null;
}

// POST to create or update share link for a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }
    
    const requestData = await request.json() as ShareLinkRequest;
    
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to the database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for sharing conversation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Find the conversation
    const conversation = await Conversation.findById(id);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Generate a share link token if not already present
    let shareLink = conversation.shareLink;
    
    if (!shareLink) {
      // Generate a unique token for the share link
      shareLink = crypto.randomBytes(16).toString('hex');
    }
    
    // Calculate expiry date if specified
    let expiresAt = null;
    
    if (requestData.expiry) {
      const now = new Date();
      
      switch (requestData.expiry) {
        case '1day':
          expiresAt = new Date(now.setDate(now.getDate() + 1));
          break;
        case '7days':
          expiresAt = new Date(now.setDate(now.getDate() + 7));
          break;
        case '30days':
          expiresAt = new Date(now.setDate(now.getDate() + 30));
          break;
        default:
          expiresAt = null;
      }
    }
    
    // Update the conversation with share settings
    await Conversation.findByIdAndUpdate(id, {
      isShared: true,
      shareLink,
      shareSettings: {
        isPublic: requestData.isPublic,
        allowComments: false, // Default value
        expiresAt
      }
    });
    
    return NextResponse.json({
      success: true,
      shareLink
    });
  } catch (error) {
    console.error('Error sharing conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to share conversation' 
      },
      { status: 500 }
    );
  }
} 