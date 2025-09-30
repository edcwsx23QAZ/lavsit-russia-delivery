import { NextRequest, NextResponse } from 'next/server';
import { apiRequestWithTimeout, validateApiInput, validationRules, PerformanceMonitor } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('pek_api_total');
  
  try {
    console.log('🔧 ПЭК Прокси: Получен запрос (по официальной документации)');
    
    const requestData = await request.json();
    console.log('📝 Данные запроса:', JSON.stringify(requestData, null, 2));
    
    // Input validation
    validateApiInput(requestData, {
      method: validationRules.required('method'),
    });
    
    const { method, address, coordinates } = requestData;
    
    // Данные авторизации согласно документации ПЭК
    const PEK_API_KEY = process.env.PEK_API_KEY || '624FC93CA677B23673BB476D4982294DC27E246F';
    const PEK_LOGIN = process.env.PEK_LOGIN || 'demo';
    
    // Проверяем только для не-тестовых методов
    if (method !== 'test' && (!process.env.PEK_LOGIN || !process.env.PEK_API_KEY)) {
      console.warn('⚠️ Не настроены переменные окружения PEK_LOGIN и PEK_API_KEY');
      console.warn('⚠️ Перейдите на /env-check для настройки');
      
      return NextResponse.json({ 
        error: 'Не настроены данные ПЭК',
        details: 'Необходимо настроить PEK_LOGIN и PEK_API_KEY в переменных окружения',
        suggestion: 'Перейдите на /env-check для настройки',
        requiredVars: ['PEK_LOGIN', 'PEK_API_KEY'],
        currentEnv: {
          hasLogin: !!process.env.PEK_LOGIN,
          hasKey: !!process.env.PEK_API_KEY,
          loginPreview: process.env.PEK_LOGIN ? process.env.PEK_LOGIN.substring(0, 3) + '***' : 'отсутствует'
        }
      }, { status: 500 });
    }
    
    // Официальный базовый URL согласно документации
    const BASE_URL = 'https://kabinet.pecom.ru/api/v1';
    
    let urlPath = '';
    let body = {};
    
    switch (method) {
      case 'findzonebyaddress':
        urlPath = '/branches/findzonebyaddress/';
        console.log('🔍 ПЭК API: findzonebyaddress для адреса:', address);
        body = { address: address };
        break;
        
      case 'findzonebycoordinates':
        urlPath = '/branches/findzonebycoordinates/';
        
        // Валидация координат
        const lat = Number(coordinates.latitude);
        const lng = Number(coordinates.longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return NextResponse.json({ 
            error: 'Некорректные координаты',
            details: `Координаты должны быть: latitude от -90 до 90, longitude от -180 до 180`,
            received: { latitude: coordinates.latitude, longitude: coordinates.longitude },
            validated: { latitude: lat, longitude: lng }
          }, { status: 400 });
        }
        
        body = {
          longitude: lng,
          latitude: lat
        };
        break;
        
      case 'calculateprice':
        urlPath = '/calculator/calculateprice/';
        const { method: methodName, ...calculationData } = requestData;
        
        // Валидация координат в адресах доставки
        console.log('🧪 API Прокси: Проверка координат в calculateprice');
        
        if (calculationData.pickup?.coordinates) {
          console.log('📍 API Прокси: pickup.coordinates =', calculationData.pickup.coordinates);
          const lat = Number(calculationData.pickup.coordinates.latitude);
          const lng = Number(calculationData.pickup.coordinates.longitude);
          
          console.log('📍 API Прокси: pickup преобразованно: lat=' + lat + ', lng=' + lng);
          
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn('⚠️ API Прокси: Некорректные координаты pickup:', calculationData.pickup.coordinates);
            console.warn('⚠️ API Прокси: Удаляем pickup.coordinates');
            delete calculationData.pickup.coordinates;
          } else {
            console.log('✅ API Прокси: pickup.coordinates валидны');
            calculationData.pickup.coordinates = { latitude: lat, longitude: lng };
          }
        }
        
        if (calculationData.delivery?.coordinates) {
          console.log('📍 API Прокси: delivery.coordinates =', calculationData.delivery.coordinates);
          const lat = Number(calculationData.delivery.coordinates.latitude);
          const lng = Number(calculationData.delivery.coordinates.longitude);
          
          console.log('📍 API Прокси: delivery преобразованно: lat=' + lat + ', lng=' + lng);
          
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn('⚠️ API Прокси: Некорректные координаты delivery:', calculationData.delivery.coordinates);
            console.warn('⚠️ API Прокси: Удаляем delivery.coordinates');
            delete calculationData.delivery.coordinates;
          } else {
            console.log('✅ API Прокси: delivery.coordinates валидны');
            calculationData.delivery.coordinates = { latitude: lat, longitude: lng };
          }
        }
        
        // Поиск координат в любых полях (глубокая проверка)
        const removeInvalidCoordinates = (obj: any, path = '') => {
          if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              
              if (key === 'coordinates' && value && typeof value === 'object') {
                const coords = value as any;
                if (coords.latitude !== undefined || coords.longitude !== undefined) {
                  const lat = Number(coords.latitude);
                  const lng = Number(coords.longitude);
                  
                  console.log(`📍 API Прокси: Найдены координаты в ${currentPath}:`, coords);
                  
                  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    console.warn(`⚠️ API Прокси: Удаляем некорректные координаты в ${currentPath}`);
                    delete obj[key];
                  } else {
                    console.log(`✅ API Прокси: Координаты в ${currentPath} валидны`);
                    obj[key] = { latitude: lat, longitude: lng };
                  }
                }
              } else if (typeof value === 'object' && value !== null) {
                removeInvalidCoordinates(value, currentPath);
              }
            }
          }
        };
        
        removeInvalidCoordinates(calculationData);
        
        console.log('🚀 API Прокси: Окончательные данные для ПЭК:', JSON.stringify(calculationData, null, 2));
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
    console.log('EXACT BODY TO PEK:', JSON.stringify(body, null, 2));
    
    // Поиск любых слов latitude/longitude в JSON
    const bodyStr = JSON.stringify(body);
    if (bodyStr.includes('latitude') || bodyStr.includes('longitude')) {
      console.warn('🚨 ОБНАРУЖЕНЫ КООРДИНАТЫ В ЗАПРОСЕ К ПЭК!');
      console.warn('Full body string:', bodyStr);
    }
    
    try {
      const response = await apiRequestWithTimeout(fullUrl, {
        method: 'POST',
        headers: {
          // Заголовки согласно официальной документации
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json',
          // 'Accept-Encoding': 'gzip', // Убираем для упрощения отладки
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify(body)
      }, { timeout: 15000, retries: 2 });
      
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
            method: method,
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
        
        const timing = endTiming();
        return NextResponse.json({ ...data, timing });
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        endTiming();
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
    endTiming();
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