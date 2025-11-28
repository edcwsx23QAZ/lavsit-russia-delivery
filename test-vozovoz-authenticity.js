#!/usr/bin/env node

/**
 * Тест для проверки подлинности ответов Vozovoz API
 * Проверяет, являются ли ответы реальными серверными ответами или заготовленными значениями
 */

const VOZOVOZ_TOKEN = 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N';

// Базовые параметры для тестов
const BASE_REQUEST = {
  object: "price",
  action: "get",
  params: {
    cargo: {
      dimension: {
        max: {
          length: 1.0,
          width: 0.5,
          height: 0.5,
          weight: 10
        },
        quantity: 1,
        volume: 0.25,
        weight: 10
      },
      insuranceNdv: true
    },
    gateway: {
      dispatch: {
        point: {
          location: "Москва",
          terminal: "default"
        }
      },
      destination: {
        point: {
          location: "Санкт-Петербург",
          terminal: "default"
        }
      }
    }
  }
};

// Тестовые наборы с разными параметрами
const TEST_CASES = [
  {
    name: "Базовый тест Москва-СПБ",
    params: BASE_REQUEST
  },
  {
    name: "Измененный вес (20 кг)",
    params: {
      ...BASE_REQUEST,
      params: {
        ...BASE_REQUEST.params,
        cargo: {
          ...BASE_REQUEST.params.cargo,
          dimension: {
            ...BASE_REQUEST.params.cargo.dimension,
            max: {
              ...BASE_REQUEST.params.cargo.dimension.max,
              weight: 20
            },
            weight: 20
          }
        }
      }
    }
  },
  {
    name: "Измененный объем (0.5 м³)",
    params: {
      ...BASE_REQUEST,
      params: {
        ...BASE_REQUEST.params,
        cargo: {
          ...BASE_REQUEST.params.cargo,
          dimension: {
            ...BASE_REQUEST.params.cargo.dimension,
            max: {
              ...BASE_REQUEST.params.cargo.dimension.max,
              length: 1.0,
              width: 1.0,
              height: 0.5
            },
            volume: 0.5,
            weight: 10
          }
        }
      }
    }
  },
  {
    name: "Другой маршрут (Москва-Екатеринбург)",
    params: {
      ...BASE_REQUEST,
      params: {
        ...BASE_REQUEST.params,
        gateway: {
          dispatch: {
            point: {
              location: "Москва",
              terminal: "default"
            }
          },
          destination: {
            point: {
              location: "Екатеринбург",
              terminal: "default"
            }
          }
        }
      }
    }
  },
  {
    name: "Со страхованием (50000 ₽)",
    params: {
      ...BASE_REQUEST,
      params: {
        ...BASE_REQUEST.params,
        cargo: {
          ...BASE_REQUEST.params.cargo,
          insurance: 50000,
          insuranceNdv: false
        }
      }
    }
  }
];

async function makeVozovozRequest(requestData, testName) {
  console.log(`\n🚚 Тест: ${testName}`);
  console.log('📤 Запрос:', JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(`https://vozovoz.ru/api/?token=${VOZOVOZ_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify(requestData)
    });

    console.log(`📥 Статус: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('📥 Ответ:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    return null;
  }
}

function analyzeResponses(responses) {
  console.log('\n🔍 АНАЛИЗ ОТВЕТОВ:');
  console.log('='.repeat(60));
  
  const validResponses = responses.filter(r => r !== null && r.response);
  
  if (validResponses.length === 0) {
    console.log('❌ Нет валидных ответов для анализа');
    return;
  }
  
  console.log(`✅ Получено ${validResponses.length} валидных ответов`);
  
  // Извлекаем цены для анализа
  const prices = validResponses.map(r => {
    const resp = r.response;
    return {
      test: r.name,
      price: resp.price || resp.basePrice || 0,
      basePrice: resp.basePrice || 0,
      services: resp.service || []
    };
  });
  
  console.log('\n💰 Цены в тестах:');
  prices.forEach(p => {
    console.log(`   ${p.test}: ${p.price} ₽ (базовая: ${p.basePrice} ₽)`);
  });
  
  // Проверяем на одинаковые цены
  const uniquePrices = [...new Set(prices.map(p => p.price))];
  console.log(`\n📊 Уникальных цен: ${uniquePrices.length}`);
  
  if (uniquePrices.length === 1 && prices.length > 1) {
    console.log('⚠️  ВНИМАНИЕ: Все тесты вернули одинаковую цену!');
    console.log('⚠️  Это может указывать на заготовленные ответы');
  } else {
    console.log('✅ Цены различаются - хороший признак реальных расчетов');
  }
  
  // Проверяем структуру ответов
  console.log('\n🏗️  Структура ответов:');
  validResponses.forEach(r => {
    const resp = r.response;
    console.log(`   ${r.test}:`);
    console.log(`     - price: ${resp.price}`);
    console.log(`     - basePrice: ${resp.basePrice}`);
    console.log(`     - service: ${Array.isArray(resp.service) ? resp.service.length + ' услуг' : 'нет массива'}`);
    console.log(`     - deliveryTime: ${resp.deliveryTime ? 'есть' : 'нет'}`);
  });
  
  // Проверяем услуги
  const allServices = prices.flatMap(p => p.services);
  const uniqueServiceNames = [...new Set(allServices.map(s => s.name))];
  
  console.log(`\n📦 Услуги: найдено ${uniqueServiceNames.length} уникальных услуг`);
  uniqueServiceNames.forEach(name => {
    console.log(`   - ${name}`);
  });
  
  // Итоговый вердикт
  console.log('\n🎯 ВЕРДИКТ:');
  console.log('='.repeat(60));
  
  if (uniquePrices.length === 1 && prices.length > 1) {
    console.log('⚠️  ПОДОЗРИТЕЛЬНО: Одинаковые цены при разных параметрах');
    console.log('⚠️  Рекомендуется дополнительная проверка');
  } else if (uniquePrices.length < prices.length * 0.5) {
    console.log('🔶 МАЛОРАЗЛИЧАЕМЫЕ ЦЕНЫ: Много повторяющихся цен');
    console.log('🔶 Возможно частичное кеширование или упрощенные расчеты');
  } else {
    console.log('✅ ПОХОЖЕ НА РЕАЛЬНЫЕ РАСЧЕТЫ: Цены существенно различаются');
  }
  
  if (uniqueServiceNames.length > 3) {
    console.log('✅ ХОРОШИЙ ПРИЗНАК: Много разных услуг');
  } else if (uniqueServiceNames.length > 0) {
    console.log('🔶 УМЕРЕННО: Несколько разных услуг');
  } else {
    console.log('⚠️  ПОДОЗРИТЕЛЬНО: Нет услуг или одинаковый набор услуг');
  }
}
  
  console.log(`✅ Получено ${validResponses.length} валидных ответов`);
  
  // Извлекаем цены для анализа
  const prices = validResponses.map(r => {
    const resp = r.response;
    return {
      test: r.name,
      price: resp.price || resp.basePrice || 0,
      basePrice: resp.basePrice || 0,
      services: resp.service || []
    };
  });
  
  console.log('\n💰 Цены в тестах:');
  prices.forEach(p => {
    console.log(`   ${p.test}: ${p.price} ₽ (базовая: ${p.basePrice} ₽)`);
  });
  
  // Проверяем на одинаковые цены
  const uniquePrices = [...new Set(prices.map(p => p.price))];
  console.log(`\n📊 Уникальных цен: ${uniquePrices.length}`);
  
  if (uniquePrices.length === 1 && prices.length > 1) {
    console.log('⚠️  ВНИМАНИЕ: Все тесты вернули одинаковую цену!');
    console.log('⚠️  Это может указывать на заготовленные ответы');
  } else {
    console.log('✅ Цены различаются - хороший признак реальных расчетов');
  }
  
  // Проверяем структуру ответов
  console.log('\n🏗️  Структура ответов:');
  validResponses.forEach(r => {
    const resp = r.response;
    console.log(`   ${r.test}:`);
    console.log(`     - price: ${resp.price}`);
    console.log(`     - basePrice: ${resp.basePrice}`);
    console.log(`     - service: ${Array.isArray(resp.service) ? resp.service.length + ' услуг' : 'нет массива'}`);
    console.log(`     - deliveryTime: ${resp.deliveryTime ? 'есть' : 'нет'}`);
  });
  
  // Проверяем услуги
  const allServices = prices.flatMap(p => p.services);
  const uniqueServiceNames = [...new Set(allServices.map(s => s.name))];
  
  console.log(`\n📦 Услуги: найдено ${uniqueServiceNames.length} уникальных услуг`);
  uniqueServiceNames.forEach(name => {
    console.log(`   - ${name}`);
  });
  
  // Итоговый вердикт
  console.log('\n🎯 ВЕРДИКТ:');
  console.log('='.repeat(60));
  
  if (uniquePrices.length === 1 && prices.length > 1) {
    console.log('⚠️  ПОДОЗРИТЕЛЬНО: Одинаковые цены при разных параметрах');
    console.log('⚠️  Рекомендуется дополнительная проверка');
  } else if (uniquePrices.length < prices.length * 0.5) {
    console.log('🔶 МАЛОРАЗЛИЧАЕМЫЕ ЦЕНЫ: Много повторяющихся цен');
    console.log('🔶 Возможно частичное кеширование или упрощенные расчеты');
  } else {
    console.log('✅ ПОХОЖЕ НА РЕАЛЬНЫЕ РАСЧЕТЫ: Цены существенно различаются');
  }
  
  if (uniqueServiceNames.length > 3) {
    console.log('✅ ХОРОШИЙ ПРИЗНАК: Много разных услуг');
  } else if (uniqueServiceNames.length > 0) {
    console.log('🔶 УМЕРЕННО: Несколько разных услуг');
  } else {
    console.log('⚠️  ПОДОЗРИТЕЛЬНО: Нет услуг или одинаковый набор услуг');
  }
}

async function runAuthenticityTest() {
  console.log('🚚 ТЕСТ ПОДЛИННОСТИ VOZOVOZ API');
  console.log('='.repeat(60));
  console.log(`🔑 Токен: ${VOZOVOZ_TOKEN}`);
  console.log(`📊 Количество тестов: ${TEST_CASES.length}`);
  
  const responses = [];
  
  for (const testCase of TEST_CASES) {
    const response = await makeVozovozRequest(testCase.params, testCase.name);
    responses.push({
      name: testCase.name,
      response: response
    });
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  analyzeResponses(responses);
  
  console.log('\n🏁 ТЕСТ ЗАВЕРШЕН');
}

// Запускаем тест
runAuthenticityTest().catch(console.error);