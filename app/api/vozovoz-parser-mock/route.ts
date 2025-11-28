import { NextRequest, NextResponse } from 'next/server';

interface VozovozParserParams {
  fromCity: string;
  toCity: string;
  fromAddressDelivery: boolean;
  toAddressDelivery: boolean;
  fromAddress?: string;
  toAddress?: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  needInsurance: boolean;
  declaredValue?: number;
  needPackaging: boolean;
  needLoading: boolean;
  hasFreightElevator: boolean;
  floor: number;
}

interface ParsedResult {
  totalCost: number;
  services: ServiceItem[];
  deliveryTime?: string;
  warnings?: string[];
  parseTime?: number;
}

interface ServiceItem {
  name: string;
  basePrice?: number;
  price: number;
  discount?: number;
}

// Тестовая версия для проверки фронтенда
async function parseVozovozMock(params: VozovozParserParams): Promise<ParsedResult> {
  console.log('🕷️ Запуск мокового парсера Vozovoz с параметрами:', params);
  
  // Имитация времени выполнения
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тестовые данные на основе реального расчета
  const mockResult: ParsedResult = {
    totalCost: 10956,
    services: [
      { name: 'Платный въезд (отправитель)', price: 100 },
      { name: 'Перевозка между городами', price: 7028 },
      { name: 'Страхование груза без объявленной стоимости', price: 149 },
      { name: 'Складская обработка', price: 1043 },
      { name: 'Отвоз груза клиенту', price: 2370 }
    ],
    deliveryTime: '1-2 дня',
    warnings: ['Тестовый режим - моковые данные'],
    parseTime: 2.0
  };

  // Изменяем данные в зависимости от параметров
  if (params.needInsurance && params.declaredValue && params.declaredValue > 0) {
    mockResult.services.push({
      name: 'Страхование груза',
      price: Math.round(params.declaredValue * 0.003) // 0.3% от стоимости
    });
    mockResult.totalCost += mockResult.services[mockResult.services.length - 1].price;
  }

  if (params.needPackaging) {
    mockResult.services.push({
      name: 'Защитная упаковка + фото',
      price: 500
    });
    mockResult.totalCost += 500;
  }

  if (params.needLoading) {
    mockResult.services.push({
      name: 'Погрузочные работы',
      price: 300
    });
    mockResult.totalCost += 300;
  }

  // Учитываем объем и вес
  const volume = (params.length * params.width * params.height) / 1000000; // м³
  if (volume > 1) {
    const extraCost = Math.round((volume - 1) * 1000);
    mockResult.services[1].price += extraCost; // Добавляем к перевозке
    mockResult.totalCost += extraCost;
  }

  console.log('✅ Моковый парсер завершил работу');
  console.log('💰 Итоговая стоимость:', mockResult.totalCost);

  return mockResult;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🕷️ Получен запрос на моковый парсинг Vozovoz:', JSON.stringify(body, null, 2));

    // Валидация
    const requiredFields = ['fromCity', 'toCity', 'length', 'width', 'height', 'weight'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Отсутствует обязательное поле: ${field}`
        }, { status: 400 });
      }
    }

    console.log('🚀 Запуск мокового парсера...');
    
    // Запуск мокового парсера
    const result = await parseVozovozMock(body as VozovozParserParams);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Критическая ошибка мокового парсера:', error);
    
    return NextResponse.json({
      error: error.message || 'Внутренняя ошибка парсера',
      details: error.stack
    }, { status: 500 });
  }
}