import { NextRequest, NextResponse } from 'next/server';
import { createCalculationScreenshot } from '@/lib/screenshot-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, calculations, enabledCompanies } = body;

    console.log('📸 Creating calculation screenshot...');

    if (!formData || !calculations) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: formData and calculations are required' 
        },
        { status: 400 }
      );
    }

    // Создание скриншота
    const screenshot = await createCalculationScreenshot(
      formData, 
      calculations, 
      enabledCompanies || {}
    );

    return NextResponse.json({
      success: true,
      screenshot
    });

  } catch (error: any) {
    console.error('❌ Error creating screenshot:', error);
    
    // Проверка на отсутствие Puppeteer
    if (error.message.includes('Cannot find module')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Screenshot service not available. Please install puppeteer: npm install puppeteer' 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Screenshot creation failed: ' + error.message 
      },
      { status: 500 }
    );
  }
}