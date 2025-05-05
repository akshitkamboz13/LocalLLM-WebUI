import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Parse query parameters
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId');
    const tagId = url.searchParams.get('tagId');
    
    let query = {};
    
    if (folderId) {
      query = { ...query, folderId };
    }
    
    if (tagId) {
      query = { ...query, tags: tagId };
    }
    
    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .populate('tags')
      .populate('folderId');
      
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const conversation = new Conversation(body);
    await conversation.save();
    
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}