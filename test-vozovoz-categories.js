/**
 * Тестовый скрипт для получения категорий груза Vozovoz
 * Цель: Найти UUID категории "Мебель мягкая"
 */

async function getVozovozCategories() {
  console.log('📦 Получение категорий груза Vozovoz...\n');

  try {
    const response = await fetch('http://localhost:3000/api/vozovoz-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 100,
        offset: 0
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Ошибка API:', error);
      return;
    }

    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ Ошибка:', result.error);
      return;
    }

    console.log(`✅ Получено категорий: ${result.meta.total || result.data.length}`);
    console.log('');

    // Ищем категории, связанные с мебелью
    const furnitureCategories = result.data.filter(cat => 
      cat.name.toLowerCase().includes('мебель') || 
      cat.category?.name?.toLowerCase().includes('мебель')
    );

    console.log('🪑 КАТЕГОРИИ С "МЕБЕЛЬ":');
    console.log('='.repeat(80));
    
    furnitureCategories.forEach(cat => {
      console.log(`\n📌 ${cat.name}`);
      console.log(`   UUID: ${cat.id}`);
      if (cat.category && cat.category.name) {
        console.log(`   Родительская: ${cat.category.name} (${cat.category.id})`);
      }
      console.log(`   Макс. объявленная стоимость: ${cat.restrictions?.declaredCost?.max || 'N/A'} руб.`);
    });

    // Ищем именно "Мебель мягкая"
    const softFurniture = result.data.find(cat => 
      cat.name.toLowerCase() === 'мебель мягкая'
    );

    if (softFurniture) {
      console.log('\n' + '='.repeat(80));
      console.log('✅ НАЙДЕНА КАТЕГОРИЯ "МЕБЕЛЬ МЯГКАЯ":');
      console.log('='.repeat(80));
      console.log(`UUID: ${softFurniture.id}`);
      console.log(`Название: ${softFurniture.name}`);
      if (softFurniture.category && softFurniture.category.name) {
        console.log(`Родительская категория: ${softFurniture.category.name}`);
      }
      console.log('='.repeat(80));
    } else {
      console.log('\n⚠️  Категория "Мебель мягкая" не найдена напрямую');
      console.log('💡 Возможно нужно использовать общую категорию "Мебель"');
    }

    // Показываем все категории для справки
    console.log('\n\n📋 ВСЕ ДОСТУПНЫЕ КАТЕГОРИИ:');
    console.log('='.repeat(80));
    result.data.forEach((cat, index) => {
      const parent = cat.category?.name ? ` (родитель: ${cat.category.name})` : '';
      console.log(`${index + 1}. ${cat.name}${parent}`);
      console.log(`   UUID: ${cat.id}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запуск
getVozovozCategories();
