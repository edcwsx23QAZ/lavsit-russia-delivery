/**
 * Тест: Упаковка на уровне cargo.wrapping vs wizard[].wrapping
 */

const VOZOVOZ_TOKEN = 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N';

async function testWrappingLevels() {
  console.log('🧪 ТЕСТ: Упаковка на разных уровнях структуры\n');
  console.log('='.repeat(100));

  const apiUrl = `https://vozovoz.ru/api/?token=${VOZOVOZ_TOKEN}`;

  // Тест 1: Упаковка внутри wizard[].wrapping (текущая реализация)
  console.log('\n📦 ТЕСТ 1: wrapping внутри wizard[0].wrapping');
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
            weight: 20,
            wrapping: {
              hardPackageVolumeUOD_WP: 0.15
            }
          }
        ],
        insuranceNdv: true
      },
      gateway: {
        dispatch: { point: { location: "Москва", terminal: "default" } },
        destination: { point: { location: "Санкт-Петербург", terminal: "default" } }
      }
    }
  };

  const result1 = await makeRequest(apiUrl, test1, 'wizard[].wrapping');

  // Тест 2: Упаковка на уровне cargo.wrapping (как в order.set)
  console.log('\n\n📦 ТЕСТ 2: wrapping на уровне cargo.wrapping');
  console.log('-'.repeat(100));

  const test2 = {
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
        wrapping: {  // ← На уровне cargo!
          hardPackageVolumeUOD_WP: 0.15
        },
        insuranceNdv: true
      },
      gateway: {
        dispatch: { point: { location: "Москва", terminal: "default" } },
        destination: { point: { location: "Санкт-Петербург", terminal: "default" } }
      }
    }
  };

  const result2 = await makeRequest(apiUrl, test2, 'cargo.wrapping');

  // Тест 3: Упаковка БЕЗ wizard (с dimension)
  console.log('\n\n📦 ТЕСТ 3: wrapping с dimension (БЕЗ wizard)');
  console.log('-'.repeat(100));

  const test3 = {
    object: "price",
    action: "get",
    params: {
      cargo: {
        dimension: {
          max: {
            length: 1.0,
            width: 0.5,
            height: 0.3,
            weight: 20
          },
          quantity: 1,
          volume: 0.15,
          weight: 20
        },
        wrapping: {
          hardPackageVolumeUOD_WP: 0.15
        },
        insuranceNdv: true
      },
      gateway: {
        dispatch: { point: { location: "Москва", terminal: "default" } },
        destination: { point: { location: "Санкт-Петербург", terminal: "default" } }
      }
    }
  };

  const result3 = await makeRequest(apiUrl, test3, 'dimension + cargo.wrapping');

  // Сравнение
  console.log('\n\n' + '='.repeat(100));
  console.log('📊 СРАВНЕНИЕ РЕЗУЛЬТАТОВ');
  console.log('='.repeat(100));

  console.log('\n1. wrapping внутри wizard[].wrapping:');
  console.log(`   Цена: ${result1?.price || 'ОШИБКА'} руб.`);
  showPackagingServices(result1);

  console.log('\n2. wrapping на уровне cargo.wrapping:');
  console.log(`   Цена: ${result2?.price || 'ОШИБКА'} руб.`);
  console.log(`   Разница: ${calcDiff(result2, result1)} руб.`);
  showPackagingServices(result2);

  console.log('\n3. wrapping с dimension (БЕЗ wizard):');
  console.log(`   Цена: ${result3?.price || 'ОШИБКА'} руб.`);
  console.log(`   Разница: ${calcDiff(result3, result1)} руб.`);
  showPackagingServices(result3);

  console.log('\n' + '='.repeat(100));
  console.log('💡 ВЫВОД:');
  console.log('='.repeat(100));

  if (result1 && result2 && result3) {
    if (result2.price !== result1.price) {
      console.log(`✅ cargo.wrapping РАБОТАЕТ! Разница: ${result2.price - result1.price} руб.`);
    } else if (result3.price !== result1.price) {
      console.log(`✅ dimension + cargo.wrapping РАБОТАЕТ! Разница: ${result3.price - result1.price} руб.`);
    } else {
      console.log('❌ Упаковка НЕ влияет на цену ни в одном варианте!');
      console.log('   Вероятно, упаковка учитывается только при order.set, а не при price.get');
    }
  }
}

function showPackagingServices(result) {
  if (result?.services) {
    const packagingServices = result.services.filter(s => 
      s.name.toLowerCase().includes('упаков') || 
      s.name.toLowerCase().includes('жёст') ||
      s.name.toLowerCase().includes('жест') ||
      s.name.toLowerCase().includes('плён') ||
      s.name.toLowerCase().includes('плен')
    );
    if (packagingServices.length > 0) {
      console.log(`   Услуг упаковки: ${packagingServices.length}`);
      packagingServices.forEach(s => console.log(`      - ${s.name}: ${s.price} руб.`));
    } else {
      console.log(`   Услуг упаковки: 0 (не найдено)`);
    }
  }
}

function calcDiff(result1, result2) {
  return result1?.price && result2?.price ? (result1.price - result2.price) : 'N/A';
}

async function makeRequest(apiUrl, requestData, label) {
  try {
    console.log(`\n📤 Запрос (${label}):`);
    console.log(JSON.stringify(requestData, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      console.log('\n✅ Ответ:');
      console.log(`   Цена: ${data.response.price} руб. (базовая: ${data.response.basePrice} руб.)`);
      console.log(`   Услуги: ${data.response.service.length}`);
      data.response.service.forEach(s => console.log(`      - ${s.name}: ${s.price} руб.`));

      return {
        price: data.response.price,
        basePrice: data.response.basePrice,
        services: data.response.service
      };
    }

    return null;
  } catch (error) {
    console.log('\n❌ Ошибка:', error.message);
    return null;
  }
}

testWrappingLevels();
