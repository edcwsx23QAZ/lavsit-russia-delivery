#!/usr/bin/env node

/**
 * Тестирование API парсера Vozovoz
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

async function testParserAPI() {
  console.log('🕷️ Тестирование API парсера Vozovoz');
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
    const response = await fetch('http://localhost:3000/api/vozovoz-parser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testParams),
    });

    console.log(`📥 Статус ответа: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка API:', errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Успешный ответ от API');
    console.log('='.repeat(50));
    console.log('💰 Итоговая стоимость:', result.totalCost.toLocaleString(), '₽');
    
    if (result.parseTime) {
      console.log('⏱️ Время парсинга:', result.parseTime, 'сек');
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

    console.log('\n🎯 Тест завершен успешно!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

// Запуск теста
testParserAPI();