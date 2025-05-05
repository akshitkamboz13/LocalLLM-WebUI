import { NextResponse } from 'next/server';
import { ollamaService } from '../../../../services/ollamaService';

export async function GET() {
  try {
    const models = await ollamaService.listModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error in models API:', error);
    // More detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch models', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}