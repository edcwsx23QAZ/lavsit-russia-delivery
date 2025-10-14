import { NextRequest, NextResponse } from 'next/server';
import { apiRequestWithTimeout, PerformanceMonitor } from '@/lib/api-utils';

const CDEK_CLIENT_ID = '3J5AvQWReEdW1o01PApvw6jHsnkNpqT1';
const CDEK_CLIENT_SECRET = 'T8iMvgShV0p9OfJiysSBpCCWcXtOO0Hy';
const CDEK_API_URL = 'https://api.cdek.ru/v2';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getCdekToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${CDEK_CLIENT_ID}:${CDEK_CLIENT_SECRET}`).toString('base64');

  const response = await apiRequestWithTimeout(`${CDEK_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=client_credentials&client_id=${CDEK_CLIENT_ID}&client_secret=${CDEK_CLIENT_SECRET}`
  }, { timeout: 10000, retries: 2 });

  if (!response.ok) {
    throw new Error(`CDEK OAuth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  if (!cachedToken) {
    throw new Error('Failed to get CDEK access token');
  }

  return cachedToken;
}

async function getCityCode(cityName: string, token: string): Promise<number | null> {
  try {
    const response = await apiRequestWithTimeout(
      `${CDEK_API_URL}/location/cities?city=${encodeURIComponent(cityName)}&size=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      },
      { timeout: 8000, retries: 1 }
    );

    if (!response.ok) {
      console.error(`CDEK city lookup failed for ${cityName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0 && data[0].code) {
      return data[0].code;
    }

    return null;
  } catch (error) {
    console.error(`Error looking up city ${cityName}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const endTiming = PerformanceMonitor.startMeasurement('cdek_api_total');
  
  try {
    const body = await request.json();
    
    console.log('📦 CDEK API запрос:', JSON.stringify(body, null, 2));

    const token = await getCdekToken();

    const fromCityCode = await getCityCode(body.from_city || 'Москва', token);
    const toCityCode = await getCityCode(body.to_city || 'Санкт-Петербург', token);

    if (!fromCityCode || !toCityCode) {
      return NextResponse.json({
        success: false,
        error: 'Не удалось определить коды городов',
        details: {
          fromCity: body.from_city,
          toCity: body.to_city,
          fromCityCode,
          toCityCode
        }
      }, { status: 400 });
    }

    const packages = body.packages || [{
      height: body.height || 10,
      length: body.length || 20,
      width: body.width || 10,
      weight: body.weight || 1000
    }];

    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const pad = (num: number) => String(Math.abs(num)).padStart(2, '0');
    const hours = pad(Math.floor(Math.abs(offset) / 60));
    const minutes = pad(Math.abs(offset) % 60);
    const dateFormatted = now.getFullYear() + '-' + 
      pad(now.getMonth() + 1) + '-' + 
      pad(now.getDate()) + 'T' + 
      pad(now.getHours()) + ':' + 
      pad(now.getMinutes()) + ':' + 
      pad(now.getSeconds()) + sign + hours + minutes;

    const requestData = {
      type: 1,
      date: dateFormatted,
      lang: 'rus',
      from_location: {
        code: fromCityCode
      },
      to_location: {
        code: toCityCode
      },
      packages: packages
    };

    console.log('📦 CDEK калькулятор запрос:', JSON.stringify(requestData, null, 2));

    const response = await apiRequestWithTimeout(`${CDEK_API_URL}/calculator/tarifflist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    }, { timeout: 12000, retries: 1 });

    console.log(`📦 CDEK API статус: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📦 CDEK API ошибка:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `API ошибка: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('📦 CDEK API ответ тарифов:', data.tariff_codes?.length || 0, 'вариантов');

    if (data.errors && data.errors.length > 0) {
      console.error('📦 CDEK API вернул ошибки:', data.errors);
      return NextResponse.json({
        success: false,
        error: data.errors[0].message || 'CDEK API error',
        details: data.errors
      }, { status: 400 });
    }

    if (body.tariff_code && body.get_details) {
      console.log('📦 CDEK: запрос детализации для тарифа', body.tariff_code);
      
      const detailsRequest = {
        type: 1,
        date: dateFormatted,
        lang: 'rus',
        tariff_code: body.tariff_code,
        from_location: {
          code: fromCityCode
        },
        to_location: {
          code: toCityCode
        },
        packages: packages
      };

      const detailsResponse = await apiRequestWithTimeout(`${CDEK_API_URL}/calculator/tariff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(detailsRequest)
      }, { timeout: 12000, retries: 1 });

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        console.log('📦 CDEK детализация:', JSON.stringify(detailsData, null, 2));
        endTiming();
        return NextResponse.json({
          ...data,
          tariff_details: detailsData
        });
      }
    }

    endTiming();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('📦 CDEK API критическая ошибка:', error);
    endTiming();
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера',
      details: error.stack
    }, { status: 500 });
  }
}
