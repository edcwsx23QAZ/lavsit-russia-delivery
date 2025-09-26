import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ПЭК Прокси: Получен запрос');
    
    const requestData = await request.json();
    console.log('📝 Данные запроса:', JSON.stringify(requestData, null, 2));
    
    const { method, address, coordinates } = requestData;
    
    const PEK_TOKEN = '624FC93CA677B23673BB476D4982294DC27E246F';
    
    // Попробуем разные базовые URL - API могло переехать
    const API_VARIANTS = [
      'https://kabinet.pecom.ru/api/v1',  // Личный кабинет (наиболее вероятный)
      'https://lk.pecom.ru/api/v1',       // Сокращенная версия
      'https://api.pecom.ru/v1',          // Оригинальный (не работает)
      'https://pecom.ru/api/v1',          // Основной сайт
      'https://www.pecom.ru/api/v1'       // С www
    ];
    
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
          message: 'Прокси работает',
          timestamp: new Date().toISOString(),
          receivedData: requestData
        });
        
      default:
        console.log('❌ Неизвестный метод:', method);
        return NextResponse.json({ error: 'Неизвестный метод', method }, { status: 400 });
    }
    
    // Разные варианты авторизации
    const AUTH_VARIANTS = [
      { type: 'Bearer', value: `Bearer ${PEK_TOKEN}` },
      { type: 'Basic', value: `Basic ${btoa(PEK_TOKEN + ':')}` },
      { type: 'Token', value: PEK_TOKEN },
      { type: 'X-API-Key', value: PEK_TOKEN }
    ];
    
    // Попробуем каждый вариант URL с разными методами авторизации
    for (let i = 0; i < API_VARIANTS.length; i++) {
      const baseUrl = API_VARIANTS[i];
      const fullUrl = baseUrl + urlPath;
      
      for (let j = 0; j < AUTH_VARIANTS.length; j++) {
        const auth = AUTH_VARIANTS[j];
        
        try {
          console.log(`🌐 Попытка ${i + 1}.${j + 1}: ${fullUrl} (авторизация: ${auth.type})`);
          console.log('Body:', JSON.stringify(body, null, 2));
          
          const headers: any = {
            'Content-Type': 'application/json',
          };
          
          if (auth.type === 'X-API-Key') {
            headers['X-API-Key'] = auth.value;
          } else {
            headers['Authorization'] = auth.value;
          }
          
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
        
          console.log(`📡 Ответ попытка ${i + 1}.${j + 1}:`, response.status, response.statusText);
          
          if (response.ok) {
            const responseText = await response.text();
            console.log(`✅ Успешный ответ ${i + 1}.${j + 1}:`, responseText.substring(0, 500));
            
            try {
              const data = JSON.parse(responseText);
              console.log(`✅ Найден рабочий endpoint: ${fullUrl} с ${auth.type}`);
              return NextResponse.json(data);
            } catch (parseError) {
              console.error(`❌ Ошибка парсинга JSON ${i + 1}.${j + 1}:`, parseError);
              continue; // Пробуем следующий
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Ошибка ${i + 1}.${j + 1}: ${response.status}`, errorText.substring(0, 100));
            
            // Если 404 или 401, пробуем следующий
            if (response.status === 404 || response.status === 401) {
              continue;
            }
            
            // Если другая ошибка, возвращаем её
            if (response.status !== 404 && response.status !== 401 && j === AUTH_VARIANTS.length - 1) {
              return NextResponse.json({ 
                error: `ПЭК API ошибка: ${response.status} ${response.statusText}`,
                details: errorText,
                url: fullUrl,
                auth: auth.type,
                method,
                requestBody: body,
                attempt: `${i + 1}.${j + 1}`
              }, { status: response.status });
            }
          }
          
        } catch (fetchError) {
          console.error(`❌ Сетевая ошибка ${i + 1}.${j + 1}:`, fetchError);
          continue; // Пробуем следующий
        }
      }
    }
    
    // Если все попытки провалились
    console.error('❌ Все URL варианты провалились');
    return NextResponse.json({ 
      error: 'Все варианты ПЭК API недоступны',
      details: 'Проверены все возможные endpoints',
      attemptedUrls: API_VARIANTS.map(base => base + urlPath),
      method,
      requestBody: body
    }, { status: 503 });
    
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