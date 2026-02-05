/**
 * Скрипт для инициализации контента через API endpoint
 * Запуск: npx tsx scripts/init-wiki-via-api.ts
 */

async function initWikiContent() {
  const API_URL = process.env.API_URL || 'http://localhost:6001';
  const endpoint = `${API_URL}/api/wiki/init`;

  console.log('🚀 Инициализация контента вики через API...\n');
  console.log(`📡 Endpoint: ${endpoint}\n`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ overwrite: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('='.repeat(60));
    console.log('📊 Результат инициализации:');
    console.log('='.repeat(60));
    console.log(`✅ Сообщение: ${result.message}`);
    console.log(`📋 Статистика:`);
    console.log(`   - Создано: ${result.created || result.stats?.created || 0}`);
    console.log(`   - Обновлено: ${result.updated || result.stats?.updated || 0}`);
    console.log(`   - Пропущено: ${result.skipped || result.stats?.skipped || 0}`);
    
    if (result.pages?.created && result.pages.created.length > 0) {
      console.log(`\n📄 Созданные страницы:`);
      result.pages.created.forEach((slug: string) => console.log(`   - ${slug}`));
    }

    if (result.pages?.updated && result.pages.updated.length > 0) {
      console.log(`\n↻ Обновленные страницы:`);
      result.pages.updated.forEach((slug: string) => console.log(`   - ${slug}`));
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Ошибки:`);
      result.errors.forEach((error: string) => console.log(`   - ${error}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Инициализация завершена!');
    console.log('='.repeat(60));

    return result;
  } catch (error: any) {
    console.error('❌ Ошибка при инициализации:', error.message);
    console.error('\n💡 Убедитесь, что:');
    console.error('   1. Dev сервер запущен (npm run dev)');
    console.error('   2. База данных доступна');
    console.error('   3. Переменные окружения настроены');
    process.exit(1);
  }
}

initWikiContent();


