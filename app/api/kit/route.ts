import { NextRequest, NextResponse } from 'next/server';
import { apiRequestWithTimeout, PerformanceMonitor } from '@/lib/api-utils';

const KIT_API_URL = 'https://capi.tk-kit.com';
const KIT_TOKEN = process.env.KIT_API_TOKEN || '';

async function searchCityByName(cityName: string): Promise<any> {
  try {
    const response = await apiRequestWithTimeout(
      `${KIT_API_URL}/1.1/tdd/search/by-name`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIT_TOKEN}`
        },
        body: JSON.stringify({ title: cityName })
      },
      { timeout: 8000, retries: 1 }
    );

    if (!response.ok) {
      console.error(`КИТ поиск города ${cityName} неуспешен: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (error) {
    console.error(`Ошибка поиска города ${cityName}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('kit_api_total');
  
  try {
    const body = await request.json();
    
    console.log('🚛 КИТ API запрос:', JSON.stringify(body, null, 2));

    const fromCity = await searchCityByName(body.from_city || 'Москва');
    const toCity = await searchCityByName(body.to_city || 'Санкт-Петербург');

    if (!fromCity || !toCity) {
      return NextResponse.json({
        success: false,
        error: 'Не удалось определить коды городов',
        details: {
          fromCity: body.from_city,
          toCity: body.to_city,
          fromCityCode: fromCity?.code,
          toCityCode: toCity?.code
        }
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
