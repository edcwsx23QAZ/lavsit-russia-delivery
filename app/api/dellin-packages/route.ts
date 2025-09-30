import { NextRequest, NextResponse } from 'next/server'
import { apiRequestWithTimeout, validateApiInput, validationRules, PerformanceMonitor } from '@/lib/api-utils'

export async function GET() {
  try {
    const response = await fetch('https://api.dellin.ru/v1/references/packages.json', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('❌ Ошибка от API Деловых Линий:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Ошибка получения справочника упаковок' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('❌ Ошибка запроса к API Деловых Линий:', error)
    return NextResponse.json(
      { error: 'Сетевая ошибка' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('dellin_api_total');
  
  try {
    const body = await request.json();
    console.log('🚛 Dellin API POST запрос:', JSON.stringify(body, null, 2));
    
    // Validate input
    if (body.method && typeof body.method !== 'string') {
      endTiming();
      return NextResponse.json({ 
        error: 'Invalid method parameter',
        details: 'method must be a string'
      }, { status: 400 });
    }

    // Handle test method
    if (body.method === 'test') {
      console.log('🧪 Dellin API тестовый запрос');
      const timing = endTiming();
      return NextResponse.json({ 
        status: 'OK', 
        service: 'Деловые Линии',
        message: 'API Деловых Линий работает корректно',
        timestamp: new Date().toISOString(),
        features: [
          'Справочник упаковок',
          'Расчет стоимости доставки',
          'Отслеживание отправлений'
        ],
        endpoints: {
          packages: '/api/dellin-packages (GET)',
          test: '/api/dellin-packages (POST)'
        },
        timing
      });
    }

    // For other methods, try to fetch from actual API
    try {
      const response = await apiRequestWithTimeout('https://api.dellin.ru/v1/references/packages.json', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, { timeout: 10000, retries: 1 });

      if (!response.ok) {
        console.error('❌ Ошибка от API Деловых Линий:', response.status, response.statusText);
        endTiming();
        return NextResponse.json({
          error: 'Ошибка получения данных от Деловых Линий',
          status: response.status,
          statusText: response.statusText
        }, { status: response.status });
      }

      const data = await response.json();
      const timing = endTiming();
      
      return NextResponse.json({ 
        success: true,
        data,
        timing,
        requestMethod: body.method || 'unknown'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });

    } catch (fetchError) {
      console.error('❌ Сетевая ошибка Dellin API:', fetchError);
      endTiming();
      return NextResponse.json({
        error: 'Сетевая ошибка при обращении к API Деловых Линий',
        details: fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка'
      }, { status: 503 });
    }

  } catch (error) {
    endTiming();
    console.error('❌ Критическая ошибка Dellin API:', error);
    
    return NextResponse.json({ 
      error: 'Критическая ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      type: error instanceof Error ? error.name : 'Unknown'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}