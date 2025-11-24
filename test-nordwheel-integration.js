// Тестирование интеграции Nord Wheel с основным приложением
const https = require('https');
const querystring = require('querystring');

// Тестовые данные как в основном приложении
const testForm = {
  fromCity: 'Москва',
  toCity: 'Санкт-Петербург', 
  fromTerminal: true,
  toTerminal: true,
  cargos: [
    {
      length: 40,
      width: 30,
      height: 20,
      weight: 5
    }
  ],
  needInsurance: false,
  declaredValue: 0,
  needPackaging: false
};

// Функция для расчета Nord Wheel (упрощенная версия из app/page.tsx)
async function calculateNordWheel() {
  const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';
  
  try {
    const totalWeight = testForm.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
    const totalVolume = testForm.cargos.reduce((sum, cargo) => 
      sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
    );

    // Nord Wheel - авиаперевозчик с минимальным весом 25кг
    const minWeight = 25;
    const adjustedWeight = Math.max(totalWeight, minWeight);
    
    // Определяем локации (аэропорты: 1 = Москва, 24 = СПб)
    const getDispatchLocation = () => {
      if (testForm.fromTerminal) {
        return {
          type: 'terminal',
          terminal_id: testForm.fromCity.toLowerCase().includes('москва') ? '1' : '24',
          city_fias: testForm.fromCity.toLowerCase().includes('москва') ? '0c5b2444-70a0-4932-980c-b4dc0d3f02b5' : 'c2deb16a-0330-4f05-821f-1d09c93331e6'
        };
      } else {
        return {
          type: 'address',
          address: testForm.fromAddress || testForm.fromCity
        };
      }
    };

    const getDestinationLocation = () => {
      if (testForm.toTerminal) {
        return {
          type: 'terminal',
          terminal_id: testForm.toCity.toLowerCase().includes('москва') ? '1' : '24',
          city_fias: testForm.toCity.toLowerCase().includes('москва') ? '0c5b2444-70a0-4932-980c-b4dc0d3f02b5' : 'c2deb16a-0330-4f05-821f-1d09c93331e6'
        };
      } else {
        return {
          type: 'address',
          address: testForm.toAddress || testForm.toCity
        };
      }
    };

    const requestData = {
      dispatch: {
        location: getDispatchLocation()
      },
      destination: {
        location: getDestinationLocation()
      },
      cargo: {
        total_weight: adjustedWeight,
        total_volume: Math.round(totalVolume * 100) / 100,
        total_quantity: testForm.cargos.length
      },
      insurance: testForm.needInsurance && testForm.declaredValue ? testForm.declaredValue : null,
      insurance_refuse: !testForm.needInsurance,
      services: {
        is_package: testForm.needPackaging,
        is_documents_return: false,
        is_fragile: false
      },
      promocode: null
    };
    
    if (totalWeight < minWeight) {
      console.log(`✈️ Nord Wheel: вес увеличен с ${totalWeight}кг до ${adjustedWeight}кг (минимум ${minWeight}кг)`);
    }

    console.log('🚛 Nord Wheel запрос из основного приложения:', JSON.stringify(requestData, null, 2));

    // Отправляем запрос
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NORDWHEEL_API_KEY}`
      },
      body: JSON.stringify(requestData)
    });

    let data;
    let responseText;
    
    try {
      responseText = await response.text();
      console.log('🚛 Nord Wheel API ответ (raw):', responseText.substring(0, 500) + '...');
      
      // Пробуем извлечь JSON из HTML ответа
      if (responseText.includes('<pre class=sf-dump')) {
        const jsonMatch = responseText.match(/<pre class=sf-dump[^>]*>([\s\S]*?)<\/pre>/);
        if (jsonMatch) {
          // Извлекаем данные из дампа
          const dumpText = jsonMatch[1];
          console.log('🔍 Найден дамп данных, пробуем извлечь JSON...');
          
          // Ищем массив данных в дампе
          const arrayMatch = dumpText.match(/array:\d+\s+\[([\s\S]*?)\]/);
          if (arrayMatch) {
            try {
              // Простое извлечение цен из дампа
              const priceMatches = dumpText.match(/"price"\s*=>\s*"<span[^>]*>([^<]+)"/g);
              if (priceMatches && priceMatches.length > 0) {
                const firstPrice = priceMatches[0].match(/"price"\s*=>\s*"<span[^>]*>([^<]+)"/);
                if (firstPrice) {
                  const price = parseFloat(firstPrice[1]);
                  console.log(`✅ Извлечена цена из дампа: ${price}₽`);
                  
                  data = {
                    success: true,
                    data: [{
                      price: price.toString(),
                      airline_id: 1,
                      airport_from_id: 1,
                      airport_to_id: 24,
                      min_paid_weight: 25
                    }]
                  };
                }
              }
            } catch (extractError) {
              console.error('❌ Ошибка извлечения из дампа:', extractError);
            }
          }
        }
      }
      
      // Если не удалось извлечь из дампа, пробуем обычный JSON
      if (!data) {
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('❌ Ошибка парсинга JSON:', jsonError.message);
          return { success: false, error: 'Parse error', responseText: responseText.substring(0, 1000) };
        }
      }
      
      console.log('🚛 Nord Wheel API ответ (обработанный):', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Ошибка получения ответа:', error);
      return { success: false, error: error.message };
    }

    if (!response.ok && (!data || !data.success)) {
      console.error('❌ Nord Wheel API ошибка:', response.status, response.statusText);
      return { success: false, error: `API Error: ${response.status}` };
    }

    // Парсинг ответа
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      const airlineTariff = data.data[0];
      const price = parseFloat(airlineTariff.price) || 0;
      const days = 1;
      
      console.log(`✅ Успешный расчет Nord Wheel:`);
      console.log(`   - Цена: ${price}₽`);
      console.log(`   - Срок: ${days} день`);
      console.log(`   - Вес: ${adjustedWeight}кг (было ${totalWeight}кг)`);
      console.log(`   - Аэропорты: ${airlineTariff.airport_from_id}→${airlineTariff.airport_to_id}`);
      console.log(`   - Мин. вес: ${airlineTariff.min_paid_weight}кг`);
      
      return {
        success: true,
        price,
        days,
        details: {
          airlineId: airlineTariff.airline_id,
          airportFromId: airlineTariff.airport_from_id,
          airportToId: airlineTariff.airport_to_id,
          minPaidWeight: airlineTariff.min_paid_weight || 25,
          originalWeight: totalWeight,
          adjustedWeight,
          currency: 'RUB',
          transportType: 'aviation'
        }
      };
    } else {
      console.log('❌ Неверный формат ответа API');
      return { success: false, error: 'Invalid response format' };
    }
    
  } catch (error) {
    console.error('❌ Ошибка при расчете Nord Wheel:', error);
    return { success: false, error: error.message };
  }
}

// Запуск теста
console.log('🧪 Тестирование интеграции Nord Wheel с основным приложением...\n');
calculateNordWheel().then(result => {
  console.log('\n📋 Итоговый результат:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('❌ Критическая ошибка:', error);
});