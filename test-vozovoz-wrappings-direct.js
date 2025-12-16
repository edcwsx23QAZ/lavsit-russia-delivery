/**
 * Прямой запрос к Vozovoz API для получения списка упаковок
 */

const VOZOVOZ_TOKEN = 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N';

async function getVozovozWrappingsDirect() {
  console.log('📦 Прямой запрос списка упаковок к Vozovoz API...\n');

  const requestData = {
    object: "wrapping",
    action: "get",
    params: {}
  };

  const apiUrl = `https://vozovoz.ru/api/?token=${VOZOVOZ_TOKEN}`;

  try {
    console.log('🌐 URL:', apiUrl);
    console.log('📤 Запрос:', JSON.stringify(requestData, null, 2));
    console.log('');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      console.error('❌ Ошибка HTTP:', response.status);
      const text = await response.text();
      console.error('Ответ:', text);
      return;
    }

    const result = await response.json();
    
    if (result.error) {
      console.error('❌ Ошибка API:', result.error);
      return;
    }

    if (result.response && Array.isArray(result.response)) {
      console.log(`✅ Получено упаковок: ${result.response.length}\n`);
      console.log('='.repeat(100));
      
      result.response.forEach((wrapping, index) => {
        console.log(`\n${index + 1}. ${wrapping.name}`);
        console.log(`   Код: ${wrapping.code}`);
        console.log(`   Тип: ${wrapping.type} ${wrapping.type === 'volume' ? '(объёмная - м³)' : '(количественная - шт.)'}`);
        if (wrapping.description) {
          console.log(`   Описание: ${wrapping.description}`);
        }
      });

      console.log('\n' + '='.repeat(100));
      
      // Ищем упаковки со словом "жёсткая" или "hard"
      const hardPackages = result.response.filter(w => 
        w.name.toLowerCase().includes('жёст') || 
        w.name.toLowerCase().includes('жест') ||
        w.code.toLowerCase().includes('hard')
      );

      if (hardPackages.length > 0) {
        console.log('\n🔍 НАЙДЕНЫ ЖЁСТКИЕ УПАКОВКИ:');
        console.log('='.repeat(100));
        hardPackages.forEach(w => {
          console.log(`\n   ✅ ${w.name}`);
          console.log(`      Код: ${w.code}`);
          console.log(`      Тип: ${w.type}`);
        });
        console.log('\n💡 Используй этот код для жёсткой упаковки!');
      }

      // Ищем пленочные упаковки
      const filmPackages = result.response.filter(w => 
        w.name.toLowerCase().includes('плен') ||
        w.name.toLowerCase().includes('пленк') ||
        w.code.toLowerCase().includes('film') ||
        w.code.toLowerCase().includes('bubble')
      );

      if (filmPackages.length > 0) {
        console.log('\n\n🔍 НАЙДЕНЫ ПЛЕНОЧНЫЕ УПАКОВКИ:');
        console.log('='.repeat(100));
        filmPackages.forEach(w => {
          console.log(`\n   - ${w.name}`);
          console.log(`     Код: ${w.code}`);
          console.log(`     Тип: ${w.type}`);
        });
      }

    } else {
      console.log('⚠️  Неожиданный формат ответа:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запуск
getVozovozWrappingsDirect();
