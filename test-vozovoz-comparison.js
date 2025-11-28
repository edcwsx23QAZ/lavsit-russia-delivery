#!/usr/bin/env node

/**
 * Тест для сравнения расчета Vozovoz API с сайтом
 * Параметры: Москва (терминал) -> СПБ (адрес: Невский проспект д.132)
 * Груз: 200*100*100см, 100кг
 */

const VOZOVOZ_TOKEN = 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N';

// Тестовый запрос с параметрами из сайта
const TEST_REQUEST = {
  object: "price",
  action: "get",
  params: {
    cargo: {
      dimension: {
        max: {
          length: 2.0,    // 200см = 2м
          width: 1.0,     // 100см = 1м  
          height: 1.0,    // 100см = 1м
          weight: 100     // 100кг
        },
        quantity: 1,
        volume: 2.0 * 1.0 * 1.0,  // 2.0 м³
        weight: 100
      },
      insuranceNdv: true  // Страхование без объявленной стоимости
    },
    gateway: {
      dispatch: {
        point: {
          location: "Москва",
          terminal: "default"  // Отправление от терминала
        }
      },
      destination: {
        point: {
          location: "Санкт-Петербург",
          address: "Невский проспект д.132"  // Доставка до адреса
        }
      }
    }
  }
};

// Альтернативный запрос с точным указанием адреса отправления
const TEST_REQUEST_PRECISE = {
  object: "price",
  action: "get",
  params: {
    cargo: {
      dimension: {
        max: {
          length: 2.0,
          width: 1.0,
          height: 1.0,
          weight: 100
        },
        quantity: 1,
        volume: 2.0,
        weight: 100
      },
      insuranceNdv: true
    },
    gateway: {
      dispatch: {
        point: {
          location: "Москва",
          address: "терминал"  // Пробуем указать "терминал" в адресе
        }
      },
      destination: {
        point: {
          location: "Санкт-Петербург",
          address: "Невский проспект д.132"
        }
      }
    }
  }
};

// Тест с разными вариантами локаций
const LOCATION_VARIANTS = [
  {
    name: "Москва (терминал) -> СПБ (адрес)",
    request: TEST_REQUEST
  },
  {
    name: "Москва (адрес: терминал) -> СПБ (адрес)",
    request: TEST_REQUEST_PRECISE
  },
  {
    name: "Москва (терминал) -> СПБ (адрес с индексом)",
    request: {
      ...TEST_REQUEST,
      params: {
        ...TEST_REQUEST.params,
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
              address: "Невский проспект д.132, 191025"
            }
          }
        }
      }
    }
  },
  {
    name: "Москва (терминал) -> СПБ (адрес + район)",
    request: {
      ...TEST_REQUEST,
      params: {
        ...TEST_REQUEST.params,
        gateway: {
          dispatch: {
            point: {
              location: "Москва",
              terminal: "default"
            }
          },
          destination: {
            point: {
              location: "Санкт-Петербург, Центральный район",
              address: "Невский проспект д.132"
            }
          }
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

function analyzeResponse(response, testName) {
  if (!response || !response.response) {
    console.log(`❌ ${testName}: Нет валидного ответа`);
    return null;
  }
  
  const resp = response.response;
  console.log(`\n🔍 Анализ ответа: ${testName}`);
  console.log('='.repeat(50));
  
  console.log(`💰 Итоговая цена: ${resp.price} ₽`);
  console.log(`💰 Базовая цена: ${resp.basePrice} ₽`);
  
  if (resp.service && Array.isArray(resp.service)) {
    console.log('\n📦 Детализация услуг:');
    let totalCalculated = 0;
    
    resp.service.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name}: ${service.price} ₽ (база: ${service.basePrice} ₽)`);
      totalCalculated += service.price;
    });
    
    console.log(`\n🧮 Сумма услуг: ${totalCalculated} ₽`);
    console.log(`🧮 Итоговая цена из ответа: ${resp.price} ₽`);
    console.log(`🧮 Разница: ${totalCalculated - resp.price} ₽`);
  }
  
  if (resp.deliveryTime) {
    console.log(`\n⏰ Сроки доставки: ${resp.deliveryTime.from}-${resp.deliveryTime.to} дней`);
  }
  
  if (resp.warnings && resp.warnings.length > 0) {
    console.log('\n⚠️ Предупреждения:');
    resp.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  return resp;
}

async function runComparisonTest() {
  console.log('🚚 СРАВНИТЕЛЬНЫЙ ТЕСТ VOZOVOZ API vs САЙТ');
  console.log('='.repeat(60));
  console.log('📋 Ожидаемый результат с сайта: 10,956 ₽');
  console.log('📋 Текущий результат API: 11,250 ₽');
  console.log(`📋 Разница: ${11250 - 10956} ₽`);
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const variant of LOCATION_VARIANTS) {
    const response = await makeVozovozRequest(variant.request, variant.name);
    const analyzed = analyzeResponse(response, variant.name);
    
    results.push({
      name: variant.name,
      response: analyzed,
      price: analyzed?.price || 0,
      basePrice: analyzed?.basePrice || 0
    });
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Сравнительный анализ
  console.log('\n📊 СРАВНИТЕЛЬНЫЙ АНАЛИЗ');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const diff = result.price - 10956;
    const diffPercent = ((diff / 10956) * 100).toFixed(1);
    console.log(`${result.name}:`);
    console.log(`   Цена: ${result.price} ₽`);
    console.log(`   Разница с сайтом: ${diff > 0 ? '+' : ''}${diff} ₽ (${diff > 0 ? '+' : ''}${diffPercent}%)`);
  });
  
  // Поиск лучшего совпадения
  const closest = results.reduce((best, current) => {
    const bestDiff = Math.abs(best.price - 10956);
    const currentDiff = Math.abs(current.price - 10956);
    return currentDiff < bestDiff ? current : best;
  });
  
  console.log(`\n🎯 Лучшее совпадение: ${closest.name}`);
  console.log(`   Цена: ${closest.price} ₽`);
  console.log(`   Разница: ${closest.price - 10956} ₽`);
  
  console.log('\n🏁 ТЕСТ ЗАВЕРШЕН');
}

// Запускаем тест
runComparisonTest().catch(console.error);