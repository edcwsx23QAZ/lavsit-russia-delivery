/**
 * Тест: Проверка влияния упаковки на цену в Vozovoz API
 * Цель: Сравнить цены с упаковкой и без упаковки
 */

async function testVozovozPackaging() {
  console.log('🧪 ТЕСТ: Влияние упаковки на цену Vozovoz\n');
  console.log('='.repeat(80));

  // Базовые параметры груза
  const baseParams = {
    object: "price",
    action: "get",
    params: {
      cargo: {
        wizard: [
          {
            length: 1.0,    // метры
            width: 0.5,     // метры
            height: 0.3,    // метры
            quantity: 1,
            weight: 20      // кг
          }
        ],
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

  // 1. Запрос БЕЗ упаковки
  console.log('\n📦 ЗАПРОС 1: БЕЗ упаковки');
  console.log('-'.repeat(80));
  
  const requestWithoutPackaging = JSON.parse(JSON.stringify(baseParams));
  console.log('Отправка запроса...');
  console.log(JSON.stringify(requestWithoutPackaging, null, 2));

  try {
    const response1 = await fetch('https://vozovoz.ru/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestWithoutPackaging)
    });

    const data1 = await response1.json();
    
    if (data1.response) {
      console.log('\n✅ Ответ получен:');
      console.log(`   Цена: ${data1.response.price} руб.`);
      console.log(`   Базовая цена: ${data1.response.basePrice} руб.`);
      console.log(`   Срок доставки: ${data1.response.deliveryTime.from}-${data1.response.deliveryTime.to} дн.`);
      console.log('\n   Услуги:');
      data1.response.service.forEach(s => {
        console.log(`   - ${s.name}: ${s.price} руб.`);
      });
    } else if (data1.error) {
      console.log('\n❌ Ошибка:', data1.error);
    }
  } catch (error) {
    console.log('\n❌ Ошибка запроса:', error.message);
  }

  // 2. Запрос С упаковкой
  console.log('\n\n📦 ЗАПРОС 2: С упаковкой hardPackageVolume');
  console.log('-'.repeat(80));

  const requestWithPackaging = JSON.parse(JSON.stringify(baseParams));
  requestWithPackaging.params.cargo.wizard[0].wrapping = {
    hardPackageVolume: 0.15  // 1.0 * 0.5 * 0.3 = 0.15 м³
  };

  console.log('Отправка запроса...');
  console.log(JSON.stringify(requestWithPackaging, null, 2));

  try {
    const response2 = await fetch('https://vozovoz.ru/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestWithPackaging)
    });

    const data2 = await response2.json();
    
    if (data2.response) {
      console.log('\n✅ Ответ получен:');
      console.log(`   Цена: ${data2.response.price} руб.`);
      console.log(`   Базовая цена: ${data2.response.basePrice} руб.`);
      console.log(`   Срок доставки: ${data2.response.deliveryTime.from}-${data2.response.deliveryTime.to} дн.`);
      console.log('\n   Услуги:');
      data2.response.service.forEach(s => {
        console.log(`   - ${s.name}: ${s.price} руб.`);
      });
    } else if (data2.error) {
      console.log('\n❌ Ошибка:', data2.error);
    }
  } catch (error) {
    console.log('\n❌ Ошибка запроса:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТ ЗАВЕРШЕН');
  console.log('='.repeat(80));
}

// Запуск теста
testVozovozPackaging();
