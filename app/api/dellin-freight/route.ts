import { NextRequest, NextResponse } from 'next/server'
import { apiRequestWithTimeout, PerformanceMonitor } from '@/lib/api-utils'

// Кэш для freight types (24 часа)
interface FreightCache {
  data: any[];
  timestamp: number;
  ttl: number;
}

let freightCache: FreightCache | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

/**
 * GET - Получение характера груза "Мебель" для Деловых Линий
 * Всегда фиксируем поиск по "Мебель" согласно требованиям
 */
export async function GET() {
  const endTiming = PerformanceMonitor.startMeasurement('dellin_freight_get');
  
  try {
    // Проверяем кэш
    const now = Date.now();
    if (freightCache && (now - freightCache.timestamp) < freightCache.ttl) {
      console.log('📦 Возвращаем характер груза из кэша');
      const timing = endTiming();
      return NextResponse.json({
        success: true,
        data: freightCache.data,
        cached: true,
        timing
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    console.log('📦 Получение характера груза "Мебель" от API Деловых Линий...');
    
    const appKey = process.env.DELLIN_APP_KEY || 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B';
    
    // Запрос к API для получения характера груза "Мебель"
    const response = await apiRequestWithTimeout('https://api.dellin.ru/v1/ftl/freight_types.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appKey: appKey,
        search: 'Мебель'
      })
    }, { timeout: 15000, retries: 2 });

    if (!response.ok) {
      console.error('❌ Ошибка получения характера груза:', response.status, response.statusText);
      endTiming();
      return NextResponse.json(
        { 
          error: 'Ошибка получения характера груза', 
          status: response.status,
          details: response.statusText
        },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    console.log('📦 Ответ API freight_types:', JSON.stringify(responseData, null, 2));

    // Проверяем структуру ответа
    if (responseData.metadata?.status !== 200) {
      console.error('❌ API вернул ошибку:', responseData.metadata?.status);
      endTiming();
      return NextResponse.json(
        { 
          error: 'API вернул статус ошибки',
          apiStatus: responseData.metadata?.status,
          details: responseData
        },
        { status: responseData.metadata?.status || 500 }
      );
    }

    if (!responseData.data || !Array.isArray(responseData.data)) {
      console.error('❌ Некорректная структура данных в ответе API');
      endTiming();
      return NextResponse.json(
        { 
          error: 'Некорректная структура данных',
          details: 'Ожидался массив data с характерами груза'
        },
        { status: 500 }
      );
    }

    const freightData = responseData.data;
    console.log(`📦 Получено характеров груза "Мебель": ${freightData.length}`);
    
    // Выводим найденные варианты для отладки
    freightData.forEach((freight: any, index: number) => {
      console.log(`  ${index + 1}. ${freight.name} → UID: ${freight.uid}`);
    });

    // Кэшируем результат
    freightCache = {
      data: freightData,
      timestamp: now,
      ttl: CACHE_TTL
    };

    const timing = endTiming();
    return NextResponse.json({
      success: true,
      data: freightData,
      cached: false,
      search: 'Мебель',
      count: freightData.length,
      generatedAt: responseData.metadata?.generated_at,
      timing
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    endTiming();
    console.error('❌ Ошибка получения характера груза:', error);
    return NextResponse.json(
      { 
        error: 'Сетевая ошибка при получении характера груза',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Тестовый метод для проверки API
 */
export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('dellin_freight_post');
  
  try {
    const body = await request.json();
    console.log('🚛 Dellin Freight API POST запрос:', JSON.stringify(body, null, 2));
    
    // Handle test method
    if (body.method === 'test') {
      console.log('🧪 Dellin Freight API тестовый запрос');
      const timing = endTiming();
      return NextResponse.json({ 
        status: 'OK', 
        service: 'Деловые Линии - Характер груза',
        message: 'API характера груза работает корректно',
        timestamp: new Date().toISOString(),
        defaultSearch: 'Мебель',
        endpoints: {
          getFreightTypes: '/api/dellin-freight (GET)',
          test: '/api/dellin-freight (POST)'
        },
        timing
      });
    }

    // Для остальных методов используем GET endpoint
    const getResponse = await GET();
    const timing = endTiming();
    
    if (getResponse.status === 200) {
      const getData = await getResponse.json();
      return NextResponse.json({ 
        success: true,
        data: getData.data,
        timing,
        requestMethod: body.method || 'get_freight_types',
        workflow: 'API ДЛ → freight_types → поиск "Мебель" → получить UID'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } else {
      const errorData = await getResponse.json();
      return NextResponse.json(errorData, { status: getResponse.status });
    }

  } catch (error) {
    endTiming();
    console.error('❌ Критическая ошибка Dellin Freight API:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
