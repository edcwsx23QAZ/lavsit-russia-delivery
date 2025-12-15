import { NextRequest, NextResponse } from 'next/server';

const DADATA_API_KEY = 'eb87bbb3789bb43ed465f796892ea951f9e91008';
const DADATA_SECRET_KEY = '90f3541a30ef6e1c40e665b69f1aa6d74242c3f2';

// Нормализация адреса через DaData
export async function POST(request: NextRequest) {
  try {
    const { address, type = 'clean' } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    console.log('🌐 DaData запрос:', { address, type });

    let url = '';
    let body: any = '';
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${DADATA_API_KEY}`,
    };

    if (type === 'clean') {
      // Очистка и нормализация адреса
      url = 'https://cleaner.dadata.ru/api/v1/clean/address';
      body = JSON.stringify([address]);
      headers['X-Secret'] = DADATA_SECRET_KEY;
    } else if (type === 'suggest') {
      // Подсказки адресов
      url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';
      body = JSON.stringify({
        query: address,
        count: 10
      });
    }

    console.log('🌐 DaData URL:', url);
    console.log('🌐 DaData Body:', body);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    });

    const data = await response.json();
    
    console.log('🌐 DaData response status:', response.status);
    console.log('🌐 DaData response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ DaData API error:', data);
      return NextResponse.json(
        { error: 'DaData API error', details: data },
        { status: response.status }
      );
    }

    // Обработка ответа в зависимости от типа запроса
    if (type === 'clean' && Array.isArray(data) && data.length > 0) {
      const cleanedAddress = data[0];
      
      // Формируем нормализованный адрес для Деловых Линий
      const dellinFormat = formatAddressForDellin(cleanedAddress);
      
      return NextResponse.json({
        success: true,
        data: {
          original: address,
          cleaned: cleanedAddress,
          dellinFormat,
          region_kladr_id: cleanedAddress.region_kladr_id,
          city_kladr_id: cleanedAddress.city_kladr_id,
          street_kladr_id: cleanedAddress.street_kladr_id
        }
      });
    } else if (type === 'suggest' && data.suggestions && Array.isArray(data.suggestions)) {
      const suggestions = data.suggestions.map((suggestion: any) => ({
        value: suggestion.value,
        unrestricted_value: suggestion.unrestricted_value,
        data: suggestion.data,
        dellinFormat: formatAddressForDellin(suggestion.data)
      }));

      return NextResponse.json({
        success: true,
        data: suggestions
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid response format',
      data
    });

  } catch (error) {
    console.error('❌ DaData API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Форматирование адреса для API Деловых Линий
function formatAddressForDellin(addressData: any): string {
  const parts: string[] = [];
  
  // Добавляем регион с типом
  if (addressData.region_with_type) {
    parts.push(addressData.region_with_type);
  }
  
  // Добавляем город с типом
  if (addressData.city_with_type) {
    parts.push(addressData.city_with_type);
  } else if (addressData.settlement_with_type) {
    parts.push(addressData.settlement_with_type);
  }
  
  // Добавляем улицу с типом
  if (addressData.street_with_type) {
    parts.push(addressData.street_with_type);
  }
  
  // Добавляем дом
  if (addressData.house) {
    let houseStr = `д. ${addressData.house}`;
    
    // Добавляем корпус если есть
    if (addressData.block) {
      houseStr += `, корп. ${addressData.block}`;
    }
    
    parts.push(houseStr);
  }
  
  const formatted = parts.join(', ');
  console.log('🏠 Formatted address for Dellin:', formatted);
  
  return formatted || addressData.result || '';
}

// Получение информации о городе для поиска терминалов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityName = searchParams.get('city');
    const fiasId = searchParams.get('fias_id');
    const type = searchParams.get('type') || 'suggest';

    // Если указан fias_id и type=findById, используем findById API
    if (fiasId && type === 'findById') {
      console.log('🏙️ DaData findById запрос для FIAS:', fiasId);

      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${DADATA_API_KEY}`,
        },
        body: JSON.stringify({
          query: fiasId
        })
      });

      const data = await response.json();
      
      console.log('🏙️ DaData findById response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        return NextResponse.json(
          { error: 'DaData API error', details: data },
          { status: response.status }
        );
      }

      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        const suggestion = data.suggestions[0];
        return NextResponse.json({
          success: true,
          data: {
            value: suggestion.value,
            city: suggestion.data.city || suggestion.data.settlement,
            region: suggestion.data.region,
            city_fias_id: suggestion.data.city_fias_id || suggestion.data.settlement_fias_id,
            region_fias_id: suggestion.data.region_fias_id,
            city_kladr_id: suggestion.data.city_kladr_id || suggestion.data.settlement_kladr_id,
            region_kladr_id: suggestion.data.region_kladr_id,
            data: suggestion.data
          }
        });
      }

      return NextResponse.json({
        success: false,
        error: 'FIAS code not found'
      });
    }

    // Обычный поиск города по названию
    if (!cityName) {
      return NextResponse.json(
        { error: 'City name or FIAS ID is required' },
        { status: 400 }
      );
    }

    console.log('🏙️ DaData city search:', cityName);

    const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${DADATA_API_KEY}`,
      },
      body: JSON.stringify({
        query: cityName,
        count: 5,
        locations: [{ country: '*' }],
        restrict_value: true
      })
    });

    const data = await response.json();
    
    console.log('🏙️ DaData city response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return NextResponse.json(
        { error: 'DaData API error', details: data },
        { status: response.status }
      );
    }

    if (data.suggestions && Array.isArray(data.suggestions)) {
      const cities = data.suggestions
        .filter((s: any) => s.data.city || s.data.settlement)
        .map((suggestion: any) => ({
          value: suggestion.value,
          city: suggestion.data.city || suggestion.data.settlement,
          region: suggestion.data.region,
          city_kladr_id: suggestion.data.city_kladr_id || suggestion.data.settlement_kladr_id,
          region_kladr_id: suggestion.data.region_kladr_id,
          dellinFormat: formatAddressForDellin(suggestion.data)
        }));

      return NextResponse.json({
        success: true,
        data: cities
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No cities found'
    });

  } catch (error) {
    console.error('❌ DaData city search error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}