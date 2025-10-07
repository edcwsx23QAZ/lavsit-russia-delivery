import { NextRequest, NextResponse } from 'next/server'
import { apiRequestWithTimeout, validateApiInput, validationRules, PerformanceMonitor } from '@/lib/api-utils'

// Кэш для CSV данных упаковок (24 часа)
interface PackageCache {
  data: any[];
  timestamp: number;
  ttl: number;
}

let packageCache: PackageCache | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

// Функция для парсинга CSV
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const result: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    result.push(row);
  }
  
  return result;
}

export async function GET() {
  const endTiming = PerformanceMonitor.startMeasurement('dellin_packages_get');
  
  try {
    // Проверяем кэш
    const now = Date.now();
    if (packageCache && (now - packageCache.timestamp) < packageCache.ttl) {
      console.log('📦 Возвращаем упаковки из кэша');
      const timing = endTiming();
      return NextResponse.json({
        success: true,
        data: packageCache.data,
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

    console.log('📦 Получение справочника упаковок по официальной документации ДЛ...');
    
    // Шаг 1: Получить ссылку на CSV файл согласно документации
    const servicesResponse = await apiRequestWithTimeout('https://api.dellin.ru/v1/public/request_services.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appkey: process.env.DELLIN_APP_KEY || 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B'
      })
    }, { timeout: 15000, retries: 2 });

    if (!servicesResponse.ok) {
      console.error('❌ Ошибка получения ссылки на CSV:', servicesResponse.status, servicesResponse.statusText);
      endTiming();
      return NextResponse.json(
        { error: 'Ошибка получения ссылки на справочник упаковок', status: servicesResponse.status },
        { status: servicesResponse.status }
      );
    }

    const servicesData = await servicesResponse.json();
    console.log('📦 Ответ API services:', servicesData);

    if (!servicesData.url) {
      console.error('❌ URL CSV файла не найден в ответе');
      endTiming();
      return NextResponse.json(
        { error: 'URL CSV файла не найден в ответе API' },
        { status: 500 }
      );
    }

    // Шаг 2: Скачать CSV файл
    console.log('📦 Скачиваем CSV файл:', servicesData.url);
    const csvResponse = await apiRequestWithTimeout(servicesData.url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,*/*',
      },
    }, { timeout: 30000, retries: 2 });

    if (!csvResponse.ok) {
      console.error('❌ Ошибка скачивания CSV файла:', csvResponse.status, csvResponse.statusText);
      endTiming();
      return NextResponse.json(
        { error: 'Ошибка скачивания CSV файла', status: csvResponse.status },
        { status: csvResponse.status }
      );
    }

    // Шаг 3: Парсить CSV
    const csvText = await csvResponse.text();
    console.log('📦 CSV получен, размер:', csvText.length, 'символов');
    
    const parsedData = parseCSV(csvText);
    console.log('📦 CSV распарсен, найдено записей:', parsedData.length);

    // Шаг 4: Кэшировать результат
    packageCache = {
      data: parsedData,
      timestamp: now,
      ttl: CACHE_TTL
    };

    const timing = endTiming();
    return NextResponse.json({
      success: true,
      data: parsedData,
      cached: false,
      csvUrl: servicesData.url,
      recordsCount: parsedData.length,
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
    console.error('❌ Ошибка получения справочника упаковок:', error);
    return NextResponse.json(
      { 
        error: 'Сетевая ошибка при получении справочника упаковок',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
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

    // For other methods, use the GET endpoint (CSV workflow)
    try {
      // Используем тот же workflow что и в GET
      const getRequest = new NextRequest(new URL('/api/dellin-packages', request.url), { method: 'GET' });
      const getResponse = await GET();
      
      const timing = endTiming();
      
      // Если GET успешен, возвращаем его результат с дополнительной информацией
      if (getResponse.status === 200) {
        const getData = await getResponse.json();
        return NextResponse.json({ 
          success: true,
          data: getData.data,
          timing,
          requestMethod: body.method || 'csv_workflow',
          workflow: 'API ДЛ → CSV ссылка → скачать CSV → парсить → получить UID'
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } else {
        // Если GET не удался, возвращаем его ошибку
        const errorData = await getResponse.json();
        return NextResponse.json(errorData, { status: getResponse.status });
      }

    } catch (fetchError) {
      console.error('❌ Ошибка CSV workflow Dellin API:', fetchError);
      endTiming();
      return NextResponse.json({
        error: 'Ошибка CSV workflow при обращении к API Деловых Линий',
        details: fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка',
        workflow: 'Проблема в: API ДЛ → CSV ссылка → скачать CSV → парсить'
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