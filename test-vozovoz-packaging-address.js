/**
 * Тест: Сравнение упаковки при АДРЕСНОЙ доставке
 */

const VOZOVOZ_TOKEN = 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N';

async function testPackagingWithAddress() {
  console.log('🧪 ТЕСТ: Упаковка при АДРЕСНОЙ доставке\n');
  console.log('='.repeat(100));

  const apiUrl = `https://vozovoz.ru/api/?token=${VOZOVOZ_TOKEN}`;

  // Тест 1: Адресная доставка БЕЗ упаковки
  console.log('\n📦 ТЕСТ 1: АДРЕСНАЯ доставка БЕЗ упаковки');
  console.log('-'.repeat(100));

  const test1 = {
    object: "price",
    action: "get",
    params: {
      cargo: {
        wizard: [
          {
            length: 1.0,
            width: 0.5,
            height: 0.3,
            quantity: 1,
            weight: 20
          }
        ],
        insuranceNdv: true
      },
      gateway: {
        dispatch: {
          point: {
            location: "Москва",
            address: "улица Тверская, 1"  // АДРЕСНАЯ доставка
          }
        },
        destination: {
          point: {
            location: "Санкт-Петербург",
            address: "Невский проспект, 1"  // АДРЕСНАЯ доставка
          }
        }
      }
    }
  };

  const result1 = await makeRequest(apiUrl, test1, 'Адресная БЕЗ упаковки');

  // Тест 2: Адресная доставка С упаковкой hardPackageVolumeUOD_WP
  console.log('\n\n📦 ТЕСТ 2: АДРЕСНАЯ доставка С упаковкой hardPackageVolumeUOD_WP');
  console.log('-'.repeat(100));

  const test2 = JSON.parse(JSON.stringify(test1));
  test2.params.cargo.wizard[0].wrapping = {
    hardPackageVolumeUOD_WP: 0.15
  };

  const result2 = await makeRequest(apiUrl, test2, 'Адресная С упаковкой');

  // Тест 3: Терминальная доставка С упаковкой для сравнения
  console.log('\n\n📦 ТЕСТ 3: ТЕРМИНАЛЬНАЯ доставка С упаковкой (для сравнения)');
  console.log('-'.repeat(100));

  const test3 = {
    object: "price",
    action: "get",
    params: {
      cargo: {
        wizard: [
          {
            length: 1.0,
            width: 0.5,
            height: 0.3,
            quantity: 1,
            weight: 20,
            wrapping: {
              hardPackageVolumeUOD_WP: 0.15
            }
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

  const result3 = await makeRequest(apiUrl, test3, 'Терминальная С упаковкой');

  // Сравнение
  console.log('\n\n' + '='.repeat(100));
  console.log('📊 СРАВНЕНИЕ РЕЗУЛЬТАТОВ');
  console.log('='.repeat(100));

  console.log('\n1. АДРЕСНАЯ БЕЗ упаковки:');
  console.log(`   Цена: ${result1?.price || 'ОШИБКА'} руб.`);
  if (result1?.services) {
    const packagingServices = result1.services.filter(s => 
      s.name.toLowerCase().includes('упаков') || 
      s.name.toLowerCase().includes('жёст') ||
      s.name.toLowerCase().includes('жест')
    );
    console.log(`   Услуг упаковки: ${packagingServices.length}`);
    packagingServices.forEach(s => console.log(`      - ${s.name}: ${s.price} руб.`));
  }

  console.log('\n2. АДРЕСНАЯ С упаковкой hardPackageVolumeUOD_WP:');
  console.log(`   Цена: ${result2?.price || 'ОШИБКА'} руб.`);
  console.log(`   Разница: ${result2?.price && result1?.price ? (result2.price - result1.price) : 'N/A'} руб.`);
  if (result2?.services) {
    const packagingServices = result2.services.filter(s => 
      s.name.toLowerCase().includes('упаков') || 
      s.name.toLowerCase().includes('жёст') ||
      s.name.toLowerCase().includes('жест')
    );
    console.log(`   Услуг упаковки: ${packagingServices.length}`);
    packagingServices.forEach(s => console.log(`      - ${s.name}: ${s.price} руб.`));
  }

  console.log('\n3. ТЕРМИНАЛЬНАЯ С упаковкой:');
  console.log(`   Цена: ${result3?.price || 'ОШИБКА'} руб.`);
  if (result3?.services) {
    const packagingServices = result3.services.filter(s => 
      s.name.toLowerCase().includes('упаков') || 
      s.name.toLowerCase().includes('жёст') ||
      s.name.toLowerCase().includes('жест')
    );
    console.log(`   Услуг упаковки: ${packagingServices.length}`);
    packagingServices.forEach(s => console.log(`      - ${s.name}: ${s.price} руб.`));
  }

  console.log('\n' + '='.repeat(100));
  console.log('💡 ВЫВОД:');
  console.log('='.repeat(100));
  if (result1 && result2) {
    if (result2.price === result1.price) {
      console.log('❌ Упаковка НЕ влияет на цену при адресной доставке!');
      console.log('   Возможные причины:');
      console.log('   1. Упаковка доступна только для определенных условий');
      console.log('   2. API игнорирует wrapping в wizard при price.get');
      console.log('   3. Упаковка учитывается только при order.set (оформлении заказа)');
    } else {
      console.log(`✅ Упаковка ВЛИЯЕТ на цену! Разница: ${result2.price - result1.price} руб.`);
    }
  }
}

async function makeRequest(apiUrl, requestData, label) {
  try {
    console.log(`\n📤 Запрос (${label}):`);
    console.log(JSON.stringify(requestData, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      console.log(`\n❌ HTTP ошибка: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.log('\n❌ API ошибка:', data.error);
      return null;
    }

    if (data.response) {
      console.log('\n✅ Ответ получен:');
      console.log(`   Цена: ${data.response.price} руб.`);
      console.log(`   Базовая цена: ${data.response.basePrice} руб.`);
      console.log(`\n   Все услуги (${data.response.service.length}):`);
      data.response.service.forEach(s => {
        console.log(`   - ${s.name}: ${s.price} руб.`);
      });

      return {
        price: data.response.price,
        basePrice: data.response.basePrice,
        services: data.response.service
      };
    }

    return null;

  } catch (error) {
    console.log('\n❌ Ошибка запроса:', error.message);
    return null;
  }
}

// Запуск
testPackagingWithAddress();
