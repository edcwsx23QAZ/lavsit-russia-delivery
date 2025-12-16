/**
 * Получение списка всех доступных упаковок Vozovoz
 */

async function getVozovozWrappings() {
  console.log('📦 Получение списка упаковок Vozovoz...\n');

  const requestData = {
    object: "wrapping",
    action: "get",
    params: {}
  };

  try {
    const response = await fetch('http://localhost:3000/api/vozovoz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Ошибка API:', error);
      return;
    }

    const result = await response.json();
    
    if (result.error) {
      console.error('❌ Ошибка:', result.error);
      return;
    }

    if (result.response && Array.isArray(result.response)) {
      console.log(`✅ Получено упаковок: ${result.response.length}\n`);
      console.log('=' .repeat(100));
      
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
          console.log(`\n   - ${w.name}`);
          console.log(`     Код: ${w.code}`);
          console.log(`     Тип: ${w.type}`);
        });
      }

      // Ищем пленочные упаковки
      const filmPackages = result.response.filter(w => 
        w.name.toLowerCase().includes('плен') ||
        w.name.toLowerCase().includes('пленк') ||
        w.code.toLowerCase().includes('film')
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
      console.log('⚠️  Неожиданный формат ответа:', result);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запуск
getVozovozWrappings();
