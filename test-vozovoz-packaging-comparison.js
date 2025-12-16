/**
 * Тест: Сравнение цен с упаковкой и без упаковки
 * Проверяем разные варианты упаковки
 */

const VOZOVOZ_TOKEN = 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N';

async function testPackagingPrice() {
  console.log('🧪 ТЕСТ: Влияние упаковки на цену Vozovoz\n');
  console.log('='.repeat(100));

  // Базовые параметры
  const baseParams = {
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

  const apiUrl = `https://vozovoz.ru/api/?token=${VOZOVOZ_TOKEN}`;

  // Тест 1: БЕЗ упаковки
  console.log('\n📦 ТЕСТ 1: БЕЗ упаковки');
  console.log('-'.repeat(100));

  const test1 = JSON.parse(JSON.stringify(baseParams));
  const result1 = await makeRequest(apiUrl, test1, 'БЕЗ упаковки');

  // Тест 2: С упаковкой hardPackageVolume (БЕЗ разбора, БЕЗ фото)
  console.log('\n\n📦 ТЕСТ 2: hardPackageVolume (БЕЗ разбора, БЕЗ фото)');
  console.log('-'.repeat(100));

  const test2 = JSON.parse(JSON.stringify(baseParams));
  test2.params.cargo.wizard[0].wrapping = {
    hardPackageVolume: 0.15  // 1.0 * 0.5 * 0.3 = 0.15 м³
  };
  const result2 = await makeRequest(apiUrl, test2, 'hardPackageVolume');

  // Тест 3: С упаковкой hardPackageVolumeUOD_WP (С РАЗБОРОМ + С ФОТО)
  console.log('\n\n📦 ТЕСТ 3: hardPackageVolumeUOD_WP (С РАЗБОРОМ + С ФОТО)');
  console.log('-'.repeat(100));

  const test3 = JSON.parse(JSON.stringify(baseParams));
  test3.params.cargo.wizard[0].wrapping = {
    hardPackageVolumeUOD_WP: 0.15  // 1.0 * 0.5 * 0.3 = 0.15 м³
  };
  const result3 = await makeRequest(apiUrl, test3, 'hardPackageVolumeUOD_WP');

  // Тест 4: С упаковкой bubbleFilmVolume (из примера документации)
  console.log('\n\n📦 ТЕСТ 4: bubbleFilmVolume (из примера документации)');
  console.log('-'.repeat(100));

  const test4 = JSON.parse(JSON.stringify(baseParams));
  test4.params.cargo.wizard[0].wrapping = {
    bubbleFilmVolume: 0.15
  };
  const result4 = await makeRequest(apiUrl, test4, 'bubbleFilmVolume');

  // Сравнение результатов
  console.log('\n\n' + '='.repeat(100));
  console.log('📊 СРАВНЕНИЕ РЕЗУЛЬТАТОВ');
  console.log('='.repeat(100));
  console.log('\n1. БЕЗ упаковки:');
  console.log(`   Цена: ${result1?.price || 'ОШИБКА'} руб.`);
  if (result1?.services) {
    console.log(`   Услуги: ${result1.services.length}`);
  }

  console.log('\n2. hardPackageVolume (БЕЗ разбора, БЕЗ фото):');
  console.log(`   Цена: ${result2?.price || 'ОШИБКА'} руб.`);
  console.log(`   Разница: ${result2?.price && result1?.price ? (result2.price - result1.price) : 'N/A'} руб.`);
  if (result2?.services) {
    console.log(`   Услуги: ${result2.services.length}`);
  }

  console.log('\n3. hardPackageVolumeUOD_WP (С РАЗБОРОМ + С ФОТО):');
  console.log(`   Цена: ${result3?.price || 'ОШИБКА'} руб.`);
  console.log(`   Разница: ${result3?.price && result1?.price ? (result3.price - result1.price) : 'N/A'} руб.`);
  if (result3?.services) {
    console.log(`   Услуги: ${result3.services.length}`);
  }

  console.log('\n4. bubbleFilmVolume (воздушно-пузырьковая пленка):');
  console.log(`   Цена: ${result4?.price || 'ОШИБКА'} руб.`);
  console.log(`   Разница: ${result4?.price && result1?.price ? (result4.price - result1.price) : 'N/A'} руб.`);
  if (result4?.services) {
    console.log(`   Услуги: ${result4.services.length}`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('ТЕСТ ЗАВЕРШЕН');
  console.log('='.repeat(100));
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
      const text = await response.text();
      console.log('Ответ:', text);
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
      console.log(`   Срок: ${data.response.deliveryTime?.from}-${data.response.deliveryTime?.to} дн.`);
      console.log(`\n   Услуги (${data.response.service.length}):`);
      data.response.service.forEach(s => {
        console.log(`   - ${s.name}: ${s.price} руб.`);
      });

      return {
        price: data.response.price,
        basePrice: data.response.basePrice,
        services: data.response.service
      };
    }

    console.log('\n⚠️  Неожиданный формат:', data);
    return null;

  } catch (error) {
    console.log('\n❌ Ошибка запроса:', error.message);
    return null;
  }
}

// Запуск
testPackagingPrice();
