import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Сохранение в базу данных
    const calculation = await prisma.calculation.create({
      data: {
        orderNumber: orderNumber || null,
        formData: formData,
        results: results,
        screenshot: screenshot || null,
        status: 'active'
      }
    });

    console.log('✅ Calculation saved successfully:', calculation.id);

    return NextResponse.json({
      success: true,
      data: {
        id: calculation.id,
        orderNumber: calculation.orderNumber,
        createdAt: calculation.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ Error saving calculation:', error);
    
    // Проверка на ошибки подключения к базе данных
    if (error.code === 'P1001') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error. Please check DATABASE_URL configuration.' 
        },
        { status: 500 }
      );
    }

    // Проверка на ошибки валидации Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Order number already exists. Please use a different order number.' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    console.log('📋 Fetching calculations:', { orderNumber });

    if (orderNumber) {
      // Поиск по номеру заказа
      const calculation = await prisma.calculation.findUnique({
        where: { orderNumber }
      });

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
      // Получение всех расчетов (сортировка по дате)
      const calculations = await prisma.calculation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50 // Ограничение для производительности
      });

      return NextResponse.json({
        success: true,
        data: calculations
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
  } finally {
    await prisma.$disconnect();
  }
}