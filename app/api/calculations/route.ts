import { NextRequest, NextResponse } from 'next/server';

// Временное решение для сохранения без базы данных
const calculationsStore: Array<{
  id: string;
  orderNumber: string | null;
  formData: any;
  results: any;
  screenshot: string | null;
  status: string;
  createdAt: Date;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, formData, results, screenshot } = body;

    console.log('💾 Saving calculation:', { orderNumber, hasScreenshot: !!screenshot });

    // Валидация обязательных полей
    if (!formData || !results) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: formData and results are required' 
        },
        { status: 400 }
      );
    }

    // Временное сохранение в память
    const calculation = {
      id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderNumber: orderNumber || null,
      formData: formData,
      results: results,
      screenshot: screenshot || null,
      status: 'active',
      createdAt: new Date()
    };

    calculationsStore.push(calculation);

    console.log('✅ Calculation saved successfully (in memory):', calculation.id);

    return NextResponse.json({
      success: true,
      data: {
        id: calculation.id,
        orderNumber: calculation.orderNumber,
        createdAt: calculation.createdAt,
        note: 'Saved in memory (database not configured)'
      }
    });

  } catch (error: any) {
    console.error('❌ Error saving calculation:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    console.log('📋 Fetching calculations:', { orderNumber });

    if (orderNumber) {
      // Поиск по номеру заказа в памяти
      const calculation = calculationsStore.find(calc => calc.orderNumber === orderNumber);

      if (!calculation) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Calculation not found' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: calculation
      });
    } else {
      // Получение всех расчетов из памяти
      const calculations = calculationsStore
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 50); // Ограничение для производительности

      return NextResponse.json({
        success: true,
        data: calculations,
        note: 'Loaded from memory (database not configured)'
      });
    }

  } catch (error: any) {
    console.error('❌ Error fetching calculations:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}