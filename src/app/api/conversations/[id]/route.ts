import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Conversation from '@/models/Conversation';

// GET a specific conversation
export async function GET(
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

    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to the database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for fetching conversation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Find the conversation
    const conversation = await Conversation.findById(id)
      .populate('tags')
      .populate('folderId');
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch conversation' 
      },
      { status: 500 }
    );
  }
}

// PUT to update a specific conversation
export async function PUT(
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
    
    const { conversation } = await request.json();
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'No conversation data provided' },
        { status: 400 }
      );
    }

    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to the database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for updating conversation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Update the conversation
    const updatedConversation = await Conversation.findByIdAndUpdate(
      id,
      {
        ...conversation,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedConversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      conversation: updatedConversation 
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update conversation' 
      },
      { status: 500 }
    );
  }
}

// DELETE a specific conversation
export async function DELETE(
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

    // Get MongoDB URI from request header if available
    const mongodbUri = request.headers.get('x-mongodb-uri') || '';
    
    // Connect to the database with the provided URI
    const connected = await connectToDatabase(mongodbUri);
    
    if (!connected) {
      console.log('MongoDB connection failed for deleting conversation');
      return NextResponse.json(
        { success: false, error: 'Failed to connect to MongoDB' },
        { status: 500 }
      );
    }
    
    // Delete the conversation
    const deletedConversation = await Conversation.findByIdAndDelete(id);
    
    if (!deletedConversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conversation deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete conversation' 
      },
      { status: 500 }
    );
  }
} 