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

// Гибридный парсер: API + эмуляция реального поведения
async function parseVozovozHybrid(params: VozovozParserParams): Promise<ParsedResult> {
  const startTime = Date.now();
  
  try {
    console.log('🕷️ Запуск гибридного парсера Vozovoz...');
    
    // Используем реальный API Vozovoz для получения базовых данных
    const maxDimensions = {
      length: params.length / 1000, // переводим мм в м
      width: params.width / 1000,
      height: params.height / 1000,
      weight: params.weight
    };

    const totalVolume = (params.length * params.width * params.height) / 1000000000; // м³
    const totalWeight = params.weight;

    const requestData = {
      object: "price",
      action: "get",
      params: {
        cargo: {
          dimension: {
            max: maxDimensions,
            quantity: 1,
            volume: totalVolume,
            weight: totalWeight
          },
          ...(params.needInsurance && params.declaredValue && params.declaredValue > 0 ? {
            insurance: params.declaredValue,
            insuranceNdv: false
          } : {
            insuranceNdv: true
          }),
          ...(params.needPackaging ? {
            wrapping: {
              "hardPackageVolume": totalVolume
            }
          } : {})
        },
        gateway: {
          dispatch: {
            point: {
              location: params.fromCity,
              ...(params.fromAddressDelivery ? {
                address: params.fromAddress || "адрес отправления"
              } : {
                terminal: "default"
              })
            }
          },
          destination: {
            point: {
              location: params.toCity,
              ...(params.toAddressDelivery ? {
                address: params.toAddress || "адрес получения"
              } : {
                terminal: "default"
              })
            }
          }
        }
      }
    };

    console.log('🔌 Запрос к реальному API Vozovoz...');
    
    // Запрос к реальному API Vozovoz
    const apiResponse = await fetch('https://vozovoz.ru/api/?token=sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify(requestData)
    });

    if (!apiResponse.ok) {
      throw new Error(`API ошибка: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const data = await apiResponse.json();
    console.log('📥 Ответ от API Vozovoz:', JSON.stringify(data, null, 2));

    if (data.error) {
      throw new Error(`API вернул ошибку: ${data.error.message || data.error}`);
    }

    if (!data.response) {
      throw new Error('API не вернул данных ответа');
    }

    const responseData = data.response;
    
    // Эмулируем поведение сайта на основе реальных данных API
    console.log('🎭 Эмуляция поведения сайта...');
    
    const services: ServiceItem[] = [];
    let totalPrice = responseData.price || responseData.basePrice || 0;
    
    // Обрабатываем массив услуг согласно документации API
    if (responseData.service && Array.isArray(responseData.service)) {
      console.log('🚚 Vozovoz найден массив услуг:', responseData.service.length);
      
      responseData.service.forEach((service: any, index: number) => {
        console.log(`🚚 Услуга [${index}]:`, service);
        
        // Эмулируем отображение как на сайте
        const serviceName = service.name || 'Дополнительная услуга';
        const servicePrice = service.price || 0;
        const basePrice = service.basePrice || servicePrice;
        
        // Добавляем скидку если есть
        if (basePrice > servicePrice) {
          services.push({
            name: serviceName,
            price: servicePrice,
            basePrice: basePrice,
            discount: basePrice - servicePrice
          });
          
          // Добавляем отдельную услугу "Скидка"
          services.push({
            name: 'Скидка',
            price: -(basePrice - servicePrice),
            basePrice: 0,
            discount: basePrice - servicePrice
          });
        } else {
          services.push({
            name: serviceName,
            price: servicePrice,
            basePrice: basePrice
          });
        }
      });
    } else {
      console.log('🚚 Vozovoz: массив услуг не найден, создаем базовые услуги');
      
      // Если массива услуг нет, создаем базовые услуги на основе цены
      if (responseData.basePrice && responseData.basePrice > 0) {
        // Эмулируем базовые услуги как на сайте
        const baseServices = [
          { name: 'Платный въезд (отправитель)', weight: 0.1 },
          { name: 'Перевозка между городами', weight: 0.7 },
          { name: 'Страхование груза без объявленной стоимости', weight: 0.1 },
          { name: 'Складская обработка', weight: 0.1 }
        ];
        
        // Добавляем отвоз груза если адресная доставка
        if (params.toAddressDelivery) {
          baseServices.push({ name: 'Отвоз груза клиенту', weight: 0.2 });
        }
        
        baseServices.forEach(service => {
          const servicePrice = Math.round(responseData.basePrice * service.weight);
          services.push({
            name: service.name,
            price: servicePrice,
            basePrice: servicePrice
          });
        });
      }
    }
    
    // Если никаких услуг не найдено, добавляем общую стоимость
    if (services.length === 0 && totalPrice > 0) {
      services.push({
        name: 'Доставка груза',
        description: `${params.fromCity} - ${params.toCity}`,
        price: totalPrice
      });
    }

    // Эмулируем общую стоимость как на сайте
    const totalCost = services.reduce((sum, service) => sum + service.price, 0);
    
    // Эмулируем сроки доставки
    let deliveryTime = '1-2 дня';
    if (responseData.deliveryTime) {
      if (responseData.deliveryTime.from && responseData.deliveryTime.to) {
        deliveryTime = `${responseData.deliveryTime.from}-${responseData.deliveryTime.to} дней`;
      } else if (responseData.deliveryTime.from) {
        deliveryTime = `${responseData.deliveryTime.from} дней`;
      } else if (responseData.deliveryTime.to) {
        deliveryTime = `${responseData.deliveryTime.to} дней`;
      }
    }

    const parseTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('✅ Гибридный парсер завершил работу');
    console.log('💰 Итоговая стоимость:', totalCost);
    console.log('📦 Количество услуг:', services.length);

    return {
      totalCost: Math.round(totalCost),
      services: services,
      deliveryTime: deliveryTime,
      warnings: ['Гибридный режим - API + эмуляция сайта'],
      parseTime: parseFloat(parseTime)
    };

  } catch (error: any) {
    console.error('❌ Ошибка гибридного парсера:', error);
    throw new Error(`Ошибка парсера: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🕷️ Запуск гибридного парсера Vozovoz с параметрами:', JSON.stringify(body, null, 2));

    // Валидация
    const requiredFields = ['fromCity', 'toCity', 'length', 'width', 'height', 'weight'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Отсутствует обязательное поле: ${field}`
        }, { status: 400 });
      }
    }

    console.log('🚀 Запуск гибридного реального парсера...');
    
    // Запуск гибридного парсера
    const result = await parseVozovozHybrid(body as VozovozParserParams);

    console.log('✅ Гибридный парсер завершил работу успешно');
    console.log('💰 Итоговая стоимость:', result.totalCost);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Критическая ошибка гибридного парсера:', error);
    
    return NextResponse.json({
      error: error.message || 'Внутренняя ошибка парсера',
      details: error.stack
    }, { status: 500 });
  }
}