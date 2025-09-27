import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🌐 Nord Wheel API запрос:', JSON.stringify(body, null, 2));

    // Извлекаем данные из запроса
    const {
      fromCity,
      toCity,
      cargos,
      declaredValue = 0,
      fromAddressDelivery = false,
      toAddressDelivery = false,
      needPackaging = false,
      needInsurance = false
    } = body;

    // Подсчитываем общий вес и объем
    const totalWeight = cargos.reduce((sum: number, cargo: any) => sum + cargo.weight, 0);
    const totalVolume = cargos.reduce((sum: number, cargo: any) => {
      const volume = (cargo.length / 100) * (cargo.width / 100) * (cargo.height / 100);
      return sum + volume;
    }, 0);

    // Параметры для API Nord Wheel
    const params = new URLSearchParams({
      from: '91', // Код города отправления (условно Москва)
      to: '92',   // Код города назначения (условно СПб)
      pickup: fromAddressDelivery ? '1' : '0',
      deliver: toAddressDelivery ? '1' : '0',
      weight: totalWeight.toString(),
      volume: totalVolume.toString(),
      oversized: '0',
      package: needPackaging ? '1' : '0',
      packageCount: needPackaging ? cargos.length.toString() : '0',
      insurance: needInsurance ? '1' : '0',
      sum: declaredValue.toString(),
      documentsReturn: '0',
      fragile: '1'
    });

    const apiUrl = `https://nordw.ru/tools/api/calc/calculate/?${params.toString()}`;
    
    console.log('🌐 Nord Wheel API URL:', apiUrl);
    console.log('🌐 Nord Wheel параметры:', {
      from: '91',
      to: '92',
      pickup: fromAddressDelivery ? '1' : '0',
      deliver: toAddressDelivery ? '1' : '0',
      weight: totalWeight,
      volume: totalVolume,
      oversized: '0',
      package: needPackaging ? '1' : '0',
      packageCount: needPackaging ? cargos.length : 0,
      insurance: needInsurance ? '1' : '0',
      sum: declaredValue,
      documentsReturn: '0',
      fragile: '1'
    });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log(`🌐 Nord Wheel API статус: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error('🌐 Nord Wheel API ошибка:', response.status, response.statusText);
      
      const errorText = await response.text();
      console.error('🌐 Nord Wheel API ошибка тело:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `API ошибка: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('🌐 Nord Wheel API ответ:', JSON.stringify(data, null, 2));

    // Проверяем на наличие ошибок в ответе Nord Wheel
    if (data.error || (data.result && data.result.error)) {
      const errorMessage = data.error || data.result.error;
      console.error('🌐 Nord Wheel API вернул ошибку:', errorMessage);
      return NextResponse.json({
        success: false,
        error: errorMessage || 'Nord Wheel API error',
        details: data
      }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('🌐 Nord Wheel API критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера',
      details: error.stack
    }, { status: 500 });
  }
}