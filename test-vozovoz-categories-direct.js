/**
 * Прямой запрос к Vozovoz API для получения категорий
 */

async function getVozovozCategoriesDirect() {
  console.log('📦 Прямой запрос категорий груза к Vozovoz API...\n');

  const requestData = {
    object: "directQuery",
    action: "get",
    params: {
      method: "getCargoTypes",
      data: {
        limit: 100,
        offset: 0
      }
    }
  };

  try {
    const response = await fetch('https://vozovoz.ru/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      console.error('❌ Ошибка HTTP:', response.status);
      return;
    }

    const result = await response.json();
    
    if (!result.response) {
      console.error('❌ Неожиданный формат ответа:', result);
      return;
    }

    const categories = result.response.data || [];
    const meta = result.response.meta || {};

    console.log(`✅ Получено категорий: ${meta.total || categories.length}`);
    console.log('');

    // Ищем категории, связанные с мебелью
    const furnitureCategories = categories.filter(cat => 
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
    const softFurniture = categories.find(cat => 
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
      console.log('\n💡 Добавь этот UUID в код:');
      console.log(`   category: "${softFurniture.id}"`);
    } else {
      console.log('\n⚠️  Категория "Мебель мягкая" не найдена напрямую');
      console.log('💡 Возможно нужно использовать общую категорию "Мебель"');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запуск
getVozovozCategoriesDirect();
