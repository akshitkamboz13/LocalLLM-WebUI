import { NextRequest, NextResponse } from 'next/server';
import { ollamaService } from '../../../../services/ollamaService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request to Ollama:', body); // Log the request
    
    // Ensure we're not requesting streaming responses
    const requestBody = {
      ...body,
      stream: false
    };
    
    const response = await ollamaService.generateCompletion(requestBody);
    console.log('Response from Ollama:', response); // Log the response
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in generate API:', error);
    // More detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to generate completion', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}