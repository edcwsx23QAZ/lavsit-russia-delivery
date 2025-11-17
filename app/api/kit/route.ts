import { NextRequest, NextResponse } from 'next/server';
import { apiRequestWithTimeout, PerformanceMonitor } from '@/lib/api-utils';

const KIT_API_URL = 'https://capi.tk-kit.com';
const KIT_TOKEN = process.env.KIT_API_TOKEN || '';

async function searchCityByName(cityName: string): Promise<any> {
  try {
    // Проверяем наличие токена
    if (!KIT_TOKEN) {
      console.error('🚛 КИТ: Токен API не настроен');
      return null;
    }

    console.log(`🚛 КИТ: Поиск города "${cityName}" с токеном: ${KIT_TOKEN.substring(0, 10)}...`);

    const response = await apiRequestWithTimeout(
      `${KIT_API_URL}/1.1/tdd/search/by-name`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIT_TOKEN}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ title: cityName })
      },
      { timeout: 8000, retries: 1 }
    );

    console.log(`🚛 КИТ: Статус ответа поиска города: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚛 КИТ: Ошибка поиска города ${cityName}: ${response.status} - ${errorText}`);

      // Специальная обработка ошибок авторизации
      if (response.status === 401) {
        console.error('🚛 КИТ: Ошибка авторизации - проверьте токен API');
      } else if (response.status === 429) {
        console.error('🚛 КИТ: Превышен лимит запросов');
      }

      return null;
    }

    const data = await response.json();
    console.log(`🚛 КИТ: Ответ поиска города:`, data);

    if (data && Array.isArray(data) && data.length > 0) {
      console.log(`🚛 КИТ: Найден город: ${data[0].name} (код: ${data[0].code})`);
      return data[0];
    }

    console.warn(`🚛 КИТ: Город "${cityName}" не найден в API`);
    return null;
  } catch (error) {
    console.error(`🚛 КИТ: Критическая ошибка поиска города ${cityName}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('kit_api_total');
  
  try {
    const body = await request.json();
    
    console.log('🚛 КИТ API запрос:', JSON.stringify(body, null, 2));

    // Проверяем наличие токена
    if (!KIT_TOKEN) {
      console.error('🚛 КИТ: Токен API не настроен в переменных окружения');
      return NextResponse.json({
        success: false,
        error: 'API токен КИТ не настроен',
        details: 'Добавьте KIT_API_TOKEN в переменные окружения'
      }, { status: 500 });
    }

    const fromCity = await searchCityByName(body.from_city || 'Москва');
    const toCity = await searchCityByName(body.to_city || 'Санкт-Петербург');

    if (!fromCity || !toCity) {
      const errorDetails = {
        fromCity: body.from_city,
        toCity: body.to_city,
        fromCityFound: !!fromCity,
        toCityFound: !!toCity,
        fromCityData: fromCity,
        toCityData: toCity,
        tokenConfigured: !!KIT_TOKEN
      };

      console.error('🚛 КИТ: Не удалось определить коды городов:', errorDetails);

      return NextResponse.json({
        success: false,
        error: 'Не удалось определить коды городов',
        details: errorDetails
      }, { status: 400 });
    }

    console.log('🚛 КИТ коды городов:', {
      from: fromCity.code,
      to: toCity.code
    });

    const requestData = {
      city_pickup_code: fromCity.code,
      city_delivery_code: toCity.code,
      declared_price: body.declared_price || 10000,
      post_type: '02',
      currency_code: ['RUB']
    };

    if (body.declared_price >= 10000) {
      requestData['insurance'] = '1';
      requestData['insurance_agent_code'] = '8000152423';
    }

    if (body.service && body.service.length > 0) {
      requestData['service'] = body.service;
    }

    console.log('🚛 КИТ калькулятор запрос:', JSON.stringify(requestData, null, 2));

    const response = await apiRequestWithTimeout(
      `${KIT_API_URL}/1.0/order/calculate-post`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIT_TOKEN}`
        },
        body: JSON.stringify(requestData)
      },
      { timeout: 12000, retries: 1 }
    );

    console.log(`🚛 КИТ API статус: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚛 КИТ API ошибка:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `API ошибка: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('🚛 КИТ API ответ:', JSON.stringify(data, null, 2));

    if (data.name === 'Too Many Requests') {
      return NextResponse.json({
        success: false,
        error: 'Превышен лимит запросов',
        details: data
      }, { status: 429 });
    }

    endTiming();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('🚛 КИТ API критическая ошибка:', error);
    endTiming();
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера',
      details: error.stack
    }, { status: 500 });
  }
}
