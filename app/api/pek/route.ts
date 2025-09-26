import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ПЭК Прокси: Получен запрос (по официальной документации)');
    
    const requestData = await request.json();
    console.log('📝 Данные запроса:', JSON.stringify(requestData, null, 2));
    
    const { method, address, coordinates } = requestData;
    
    // Данные авторизации согласно документации ПЭК
    const PEK_API_KEY = process.env.PEK_API_KEY || '624FC93CA677B23673BB476D4982294DC27E246F';
    const PEK_LOGIN = process.env.PEK_LOGIN || 'demo';
    
    if (!process.env.PEK_LOGIN || !process.env.PEK_API_KEY) {
      console.warn('⚠️ Не настроены переменные окружения PEK_LOGIN и PEK_API_KEY');
      console.warn('⚠️ Перейдите на /env-check для настройки');
      
      return NextResponse.json({ 
        error: 'Не настроены данные ПЭК',
        details: 'Необходимо настроить PEK_LOGIN и PEK_API_KEY в переменных окружения',
        suggestion: 'Перейдите на /env-check для настройки',
        requiredVars: ['PEK_LOGIN', 'PEK_API_KEY']
      }, { status: 500 });
    }
    
    // Официальный базовый URL согласно документации
    const BASE_URL = 'https://kabinet.pecom.ru/api/v1';
    
    let urlPath = '';
    let body = {};
    
    switch (method) {
      case 'findzonebyaddress':
        urlPath = '/branches/findzonebyaddress/';
        body = { address: address };
        break;
        
      case 'findzonebycoordinates':
        urlPath = '/branches/findzonebycoordinates/';
        body = {
          longitude: coordinates.longitude,
          latitude: coordinates.latitude
        };
        break;
        
      case 'calculateprice':
        urlPath = '/calculator/calculateprice/';
        const { method: methodName, ...calculationData } = requestData;
        body = calculationData;
        break;
        
      case 'nearestdepartments':
        urlPath = '/branches/nearestdepartments/';
        const { method: nearestMethod, ...departmentData } = requestData;
        body = departmentData;
        break;
        
      case 'test':
        console.log('🔧 Тестовый метод прокси');
        return NextResponse.json({ 
          status: 'OK', 
          message: 'Прокси работает (официальная версия)',
          timestamp: new Date().toISOString(),
          receivedData: requestData,
          authMethod: 'Basic Auth',
          baseUrl: BASE_URL
        });
        
      default:
        console.log('❌ Неизвестный метод:', method);
        return NextResponse.json({ error: 'Неизвестный метод', method }, { status: 400 });
    }
    
    const fullUrl = BASE_URL + urlPath;
    
    // Basic Auth согласно документации: base64(login:api_key)
    const credentials = Buffer.from(`${PEK_LOGIN}:${PEK_API_KEY}`).toString('base64');
    
    console.log('🌐 Запрос к ПЭК API (официальная версия):');
    console.log('URL:', fullUrl);
    console.log('Auth: Basic (логин + API ключ)');
    console.log('Body:', JSON.stringify(body, null, 2));
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          // Заголовки согласно официальной документации
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify(body)
      });
      
      console.log('📡 Ответ от ПЭК API:');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ПЭК API ошибка:', response.status, response.statusText);
        console.error('❌ Ответ:', errorText.substring(0, 1000));
        
        // Детализируем ошибки согласно документации
        if (response.status === 404) {
          return NextResponse.json({ 
            error: 'Метод API не найден',
            details: 'URL метода неверный или метод не существует',
            url: fullUrl,
            suggestion: 'Проверьте правильность пути к методу'
          }, { status: 404 });
        }
        
        if (response.status === 403) {
          return NextResponse.json({ 
            error: 'Доступ запрещен',
            details: 'Нарушение прав доступа к методу',
            suggestion: 'Проверьте права пользователя для данного метода'
          }, { status: 403 });
        }
        
        if (response.status === 401) {
          return NextResponse.json({ 
            error: 'Ошибка авторизации',
            details: 'Неверный логин или API ключ',
            suggestion: 'Проверьте данные авторизации в личном кабинете ПЭК'
          }, { status: 401 });
        }
        
        return NextResponse.json({ 
          error: `ПЭК API ошибка: ${response.status} ${response.statusText}`,
          details: errorText,
          url: fullUrl,
          method,
          requestBody: body
        }, { status: response.status });
      }
      
      const responseText = await response.text();
      console.log('✅ Успешный ответ от ПЭК:', responseText.substring(0, 500));
      
      try {
        const data = JSON.parse(responseText);
        
        // Проверяем формат ошибки согласно документации
        if (data.error) {
          console.error('❌ Логическая ошибка ПЭК:', data.error);
          return NextResponse.json({ 
            error: data.error.title || 'Логическая ошибка API',
            details: data.error.message || 'Подробности недоступны',
            apiError: true,
            originalError: data.error
          }, { status: 400 });
        }
        
        return NextResponse.json(data);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        return NextResponse.json({ 
          error: 'Ошибка парсинга ответа',
          details: responseText.substring(0, 1000)
        }, { status: 500 });
      }
      
    } catch (fetchError) {
      console.error('❌ Сетевая ошибка:', fetchError);
      return NextResponse.json({ 
        error: 'Сетевая ошибка',
        details: fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка',
        url: fullUrl
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка прокси ПЭК API:', error);
    
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Критическая ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      type: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}