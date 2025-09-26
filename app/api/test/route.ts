import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'OK', message: 'Simple test works' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      status: 'OK', 
      message: 'POST test works',
      received: body 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'ERROR', 
      message: 'Error parsing JSON',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}