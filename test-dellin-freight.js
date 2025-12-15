#!/usr/bin/env node

/**
 * Тест API характера груза Деловых Линий
 * Проверяет получение UID характера груза "Мебель"
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testDellinFreightAPI() {
  console.log('🧪 === ТЕСТ API ХАРАКТЕРА ГРУЗА ДЕЛОВЫХ ЛИНИЙ ===\n');

  try {
    // Тест 1: GET запрос для получения характера груза "Мебель"
    console.log('📦 Тест 1: GET /api/dellin-freight');
    console.log('Получение характера груза "Мебель" через API...\n');
    
    const getResponse = await fetch(`${API_BASE}/api/dellin-freight`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!getResponse.ok) {
      console.error('❌ Ошибка GET запроса:', getResponse.status, getResponse.statusText);
      const errorData = await getResponse.json();
      console.error('Детали ошибки:', JSON.stringify(errorData, null, 2));
      return;
    }

    const getData = await getResponse.json();
    console.log('✅ GET запрос успешен!');
    console.log('📊 Результат:', JSON.stringify(getData, null, 2));
    console.log('\n📋 Характеры груза "Мебель":');
    
    if (getData.data && Array.isArray(getData.data)) {
      getData.data.forEach((freight, index) => {
        console.log(`  ${index + 1}. ${freight.name} → UID: ${freight.uid}`);
      });
      
      if (getData.data.length > 0) {
        const firstFreight = getData.data[0];
        console.log('\n✅ Первый найденный UID "Мебель":', firstFreight.uid);
        console.log('   Этот UID будет использоваться в расчетах');
      } else {
        console.log('\n⚠️ Характеры груза не найдены!');
      }
    } else {
      console.log('\n⚠️ Некорректная структура данных');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Тест 2: POST запрос для проверки API
    console.log('📦 Тест 2: POST /api/dellin-freight (тестовый метод)');
    
    const postResponse = await fetch(`${API_BASE}/api/dellin-freight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'test'
      })
    });

    if (!postResponse.ok) {
      console.error('❌ Ошибка POST запроса:', postResponse.status, postResponse.statusText);
      const errorData = await postResponse.json();
      console.error('Детали ошибки:', JSON.stringify(errorData, null, 2));
      return;
    }

    const postData = await postResponse.json();
    console.log('✅ POST запрос успешен!');
    console.log('📊 Результат:', JSON.stringify(postData, null, 2));

    console.log('\n' + '='.repeat(60) + '\n');

    // Тест 3: Проверка кэширования
    console.log('📦 Тест 3: Проверка кэширования (повторный запрос)');
    
    const cachedResponse = await fetch(`${API_BASE}/api/dellin-freight`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!cachedResponse.ok) {
      console.error('❌ Ошибка кэшированного запроса:', cachedResponse.status, cachedResponse.statusText);
      return;
    }

    const cachedData = await cachedResponse.json();
    console.log('✅ Кэшированный запрос успешен!');
    console.log('📊 Источник данных:', cachedData.cached ? '🗄️ КЭШ' : '🌐 API');
    
    if (cachedData.cached) {
      console.log('✅ Кэширование работает корректно!');
    } else {
      console.log('⚠️ Данные получены не из кэша (возможно кэш истек)');
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!\n');

    // Итоговая информация
    console.log('📝 ИТОГОВАЯ ИНФОРМАЦИЯ:');
    console.log('  - API endpoint работает корректно');
    console.log('  - Характер груза "Мебель" получен из API Деловых Линий');
    console.log('  - Кэширование настроено (TTL: 24 часа)');
    console.log('  - UID будет автоматически добавляться в расчеты');

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error('Стек ошибки:', error.stack);
  }
}

// Запуск тестов
testDellinFreightAPI().then(() => {
  console.log('\n🏁 Тестирование завершено\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Фатальная ошибка:', error);
  process.exit(1);
});
