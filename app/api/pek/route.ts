import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ПЭК Прокси: Получен запрос');
    
    const requestData = await request.json();
    console.log('📝 Данные запроса:', JSON.stringify(requestData, null, 2));
    
    const { method, address, coordinates } = requestData;
    
    const PEK_TOKEN = '624FC93CA677B23673BB476D4982294DC27E246F';
    const BASE_URL = 'https://api.pecom.ru/v1';
    
    let url = '';
    let body = {};
    
    switch (method) {
      case 'findzonebyaddress':
        url = `${BASE_URL}/branches/findzonebyaddress/`;
        body = {
          address: address
        };
        break;
        
      case 'findzonebycoordinates':
        url = `${BASE_URL}/branches/findzonebycoordinates/`;
        body = {
          longitude: coordinates.longitude,
          latitude: coordinates.latitude
        };
        break;
        
      case 'calculateprice':
        url = `${BASE_URL}/calculator/calculateprice/`;
        const { method: methodName, ...calculationData } = requestData;
        body = calculationData;
        break;
        
      case 'nearestdepartments':
        url = `${BASE_URL}/branches/nearestdepartments/`;
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
    
    console.log('🌐 Отправка запроса к ПЭК:');
    console.log('URL:', url);
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('Headers: Content-Type: application/json, Authorization: Bearer [TOKEN]');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PEK_TOKEN}`,
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
      
      return NextResponse.json({ 
        error: `ПЭК API ошибка: ${response.status} ${response.statusText}`,
        details: errorText,
        url,
        method,
        requestBody: body
      }, { status: response.status });
    }
    
    const responseText = await response.text();
    console.log('✅ Успешный ответ от ПЭК:', responseText.substring(0, 500));
    
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON:', parseError);
      return NextResponse.json({ 
        error: 'Ошибка парсинга ответа',
        details: responseText
      }, { status: 500 });
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