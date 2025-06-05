import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getConversations, storeConversation } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Conversation from '@/models/Conversation';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId');
    const tagId = url.searchParams.get('tagId');
    
    let query: any = {};
    
    if (folderId) {
      query = { ...query, folderId };
    }
    
    if (tagId) {
      query = { ...query, tags: tagId };
    }

    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to MongoDB with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('Using local storage fallback for conversations');
    }

    // Use the getConversations utility which handles both MongoDB and localStorage
    const conversations = await getConversations(query);
    
    console.log(`Returning ${conversations.length} conversations`);
      
    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversation } = await request.json();
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'No conversation data provided' },
        { status: 400 }
      );
    }
    
    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to MongoDB with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('Using local storage fallback for saving conversation');
    }
    
    // Use storeConversation utility which handles both MongoDB and localStorage
    const savedConversation = await storeConversation(conversation);
    
    return NextResponse.json({ success: true, conversation: savedConversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create conversation' },
      { status: 500 }
    );
  }
}