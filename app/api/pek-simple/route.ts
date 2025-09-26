import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ПЭК Simple: Получен запрос');
    
    const requestData = await request.json();
    console.log('📝 Данные запроса:', JSON.stringify(requestData, null, 2));
    
    const { method } = requestData;
    
    if (method === 'test') {
      return NextResponse.json({ 
        status: 'OK', 
        message: 'Простая версия прокси работает',
        env: {
          hasLogin: !!process.env.PEK_LOGIN,
          hasKey: !!process.env.PEK_API_KEY,
          login: process.env.PEK_LOGIN?.substring(0, 3) + '***'
        }
      });
    }
    
    // Данные авторизации
    const PEK_API_KEY = process.env.PEK_API_KEY;
    const PEK_LOGIN = process.env.PEK_LOGIN;
    
    if (!PEK_LOGIN || !PEK_API_KEY) {
      return NextResponse.json({ 
        error: 'Нет данных авторизации',
        hasLogin: !!PEK_LOGIN,
        hasKey: !!PEK_API_KEY
      }, { status: 500 });
    }
    
    // Тестируем прямой вызов к ПЭК
    if (method === 'direct') {
      const credentials = Buffer.from(`${PEK_LOGIN}:${PEK_API_KEY}`).toString('base64');
      
      console.log('🌐 Прямой вызов ПЭК API');
      
      const response = await fetch('https://kabinet.pecom.ru/api/v1/branches/findzonebyaddress/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ address: 'г Москва, Шмитовский проезд, д 1' })
      });
      
      console.log('📡 Ответ ПЭК:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('📄 Тело ответа:', responseText.substring(0, 200));
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          return NextResponse.json(data);
        } catch (e) {
          return NextResponse.json({ error: 'Ошибка парсинга', raw: responseText });
        }
      } else {
        return NextResponse.json({ 
          error: 'API ошибка',
          status: response.status,
          response: responseText 
        }, { status: response.status });
      }
    }
    
    return NextResponse.json({ error: 'Неизвестный метод', method });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    return NextResponse.json({ 
      error: 'Критическая ошибка',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}