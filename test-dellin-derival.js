#!/usr/bin/env node

// Тест для проверки исправлений ошибки derival в Dellin API

const testCases = [
  {
    name: 'Терминал → Терминал',
    body: {
      fromCity: 'Москва',
      toCity: 'Санкт-Петербург',
      cargos: [{ length: 100, width: 50, height: 30, weight: 10 }],
      fromAddressDelivery: false,
      toAddressDelivery: false,
      needPackaging: false,
      needInsurance: false,
      declaredValue: 1000
    }
  },
  {
    name: 'Адрес → Адрес',
    body: {
      fromCity: 'Москва',
      toCity: 'Санкт-Петербург',
      fromAddress: 'Красная площадь, 1',
      toAddress: 'Дворцовая площадь, 1',
      cargos: [{ length: 100, width: 50, height: 30, weight: 10 }],
      fromAddressDelivery: true,
      toAddressDelivery: true,
      needPackaging: false,
      needInsurance: false,
      declaredValue: 1000
    }
  },
  {
    name: 'Терминал → Адрес с упаковкой',
    body: {
      fromCity: 'Москва',
      toCity: 'Санкт-Петербург',
      toAddress: 'Дворцовая площадь, 1',
      cargos: [{ length: 100, width: 50, height: 30, weight: 10 }],
      fromAddressDelivery: false,
      toAddressDelivery: true,
      needPackaging: true,
      needInsurance: true,
      declaredValue: 5000
    }
  },
  {
    name: 'Некорректный город',
    body: {
      fromCity: 'НесуществующийГород',
      toCity: 'Санкт-Петербург',
      cargos: [{ length: 100, width: 50, height: 30, weight: 10 }],
      fromAddressDelivery: false,
      toAddressDelivery: false,
      needPackaging: false,
      needInsurance: false,
      declaredValue: 1000
    }
  }
];

async function testDellinCalculation(testCase) {
  console.log(`\n=== ТЕСТ: ${testCase.name} ===`);
  console.log('Параметры запроса:', JSON.stringify(testCase.body, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/dellin-packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: true,
        action: 'calculate',
        data: testCase.body
      })
    });

    const result = await response.json();
    
    console.log('Статус ответа:', response.status);
    console.log('Результат:');
    
    if (result.error) {
      console.log('❌ ОШИБКА:', result.error);
      if (result.details) {
        console.log('Детали ошибки:', result.details);
      }
    } else {
      console.log('✅ УСПЕХ');
      console.log('- Компания:', result.company || 'не указана');
      console.log('- Цена:', result.price || 0, 'руб.');
      console.log('- Срок:', result.days || 0, 'дн.');
      
      if (result.details) {
        console.log('- Детали доступны:', Object.keys(result.details).length > 0 ? 'да' : 'нет');
        
        // Проверяем наличие problematic полей
        if (result.details.derival !== undefined) {
          console.log('- derival найден:', result.details.derival ? 'да' : 'нет/null');
        }
        if (result.details.arrival !== undefined) {
          console.log('- arrival найден:', result.details.arrival ? 'да' : 'нет/null');
        }
        if (result.details.intercity !== undefined) {
          console.log('- intercity найден:', result.details.intercity ? 'да' : 'нет/null');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    if (error.message.includes('derival')) {
      console.log('🚨 НАЙДЕНА ОШИБКА DERIVAL!');
    }
  }
}

async function runAllTests() {
  console.log('🧪 Запуск тестов для проверки исправлений ошибки derival в Dellin API');
  console.log('📅 Время запуска:', new Date().toISOString());
  
  for (const testCase of testCases) {
    await testDellinCalculation(testCase);
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Все тесты завершены');
}

// Проверяем доступность сервера перед запуском тестов
async function checkServerAvailability() {
  try {
    const response = await fetch('http://localhost:3000/api/dellin-packages', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ Сервер доступен');
      return true;
    } else {
      console.log('❌ Сервер недоступен, статус:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к серверу:', error.message);
    console.log('💡 Убедитесь что сервер запущен: npm run dev');
    return false;
  }
}

// Запуск тестов
checkServerAvailability().then(available => {
  if (available) {
    runAllTests();
  } else {
    process.exit(1);
  }
});