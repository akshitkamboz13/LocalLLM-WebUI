import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get port info from global variable (falls back to defaults if not available)
    const serverPort = (global as any).serverPort || {
      port: process.env.PORT || '49494',
      name: 'Primary'
    };

    // Ensure we have a valid port name
    const portName = typeof serverPort.name === 'string' ? serverPort.name : 'Primary';

    return NextResponse.json({
      success: true,
      serverInfo: {
        port: serverPort.port,
        portName: portName,
        baseUrl: `http://localhost:${serverPort.port}`
      }
    });
  } catch (error) {
    console.error('Error in server-info route:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get server information'
    }, { status: 500 });
  }
} 