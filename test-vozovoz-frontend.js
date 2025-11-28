#!/usr/bin/env node

/**
 * Тестирование фронтенда парсера Vozovoz с моковым API
 */

const testParams = {
  fromCity: 'Москва',
  toCity: 'Санкт-Петербург',
  fromAddressDelivery: false,
  toAddressDelivery: true,
  fromAddress: '',
  toAddress: 'Невский проспект д.132',
  length: 200,
  width: 100,
  height: 100,
  weight: 100,
  needInsurance: false,
  declaredValue: 0,
  needPackaging: false,
  needLoading: false,
  hasFreightElevator: false,
  floor: 1
};

async function testParserFrontend() {
  console.log('🖥️ Тестирование фронтенда парсера Vozovoz');
  console.log('='.repeat(50));
  console.log('📋 Параметры теста:');
  console.log(`   Откуда: ${testParams.fromCity} (${testParams.fromAddressDelivery ? 'адрес' : 'терминал'})`);
  console.log(`   Куда: ${testParams.toCity} (${testParams.toAddressDelivery ? 'адрес' : 'терминал'})`);
  if (testParams.toAddressDelivery) {
    console.log(`   Адрес: ${testParams.toAddress}`);
  }
  console.log(`   Груз: ${testParams.length}x${testParams.width}x${testParams.height}см, ${testParams.weight}кг`);
  console.log('='.repeat(50));

  try {
    // Тестирование мокового API
    console.log('🔌 Тестирование мокового API...');
    const response = await fetch('http://localhost:3000/api/vozovoz-parser-mock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testParams),
    });

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ API работает корректно');
    console.log('='.repeat(50));
    console.log('💰 Итоговая стоимость:', result.totalCost.toLocaleString(), '₽');
    
    if (result.parseTime) {
      console.log('⏱️ Время выполнения:', result.parseTime, 'сек');
    }

    if (result.services && result.services.length > 0) {
      console.log('\n📦 Детализация услуг:');
      result.services.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name}: ${service.price.toLocaleString()} ₽`);
      });
    }

    if (result.deliveryTime) {
      console.log('\n⏰ Сроки доставки:', result.deliveryTime);
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️ Предупреждения:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log('\n🎯 Тест API завершен успешно!');
    console.log('\n📝 Рекомендации:');
    console.log('   1. Откройте в браузере: http://localhost:3000/vozovoz-parser');
    console.log('   2. Нажмите кнопку "Парсер" для тестирования фронтенда');
    console.log('   3. Проверьте отображение результатов');
    console.log('   4. Попробуйте изменить параметры и запустить снова');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// Запуск теста
testParserFrontend();