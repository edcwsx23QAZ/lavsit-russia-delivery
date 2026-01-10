// Скрипт для проверки подключения к Supabase через REST API
const https = require('https');

const supabaseUrl = 'https://sirqrnffrpdkdtqiwjgq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1NTMyOCwiZXhwIjoyMDc0OTMxMzI4fQ.7FYvM9t_uE5mgIIZ2X-PuJ-qZ3h6IXIvb_uw3QWYO_8';

async function checkSupabaseConnection() {
  console.log('🔍 Проверка подключения к Supabase...');
  console.log(`URL: ${supabaseUrl}\n`);

  // Проверка через REST API
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ Supabase REST API доступен!');
      console.log('   Проект: Lavsit Textile');
      console.log('   URL: ' + supabaseUrl);
      
      // Попытка проверить таблицы через SQL запрос
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        })
      });

      if (sqlResponse.ok) {
        const tables = await sqlResponse.json();
        console.log('\n📊 Таблицы в базе данных:');
        if (tables && tables.length > 0) {
          tables.forEach(table => {
            console.log(`   - ${table.table_name || table}`);
          });
        } else {
          console.log('   (Таблиц пока нет, нужно создать через Prisma)');
        }
      }

      // Проверка таблицы calculations
      try {
        const calcResponse = await fetch(`${supabaseUrl}/rest/v1/calculations?select=*&limit=1`, {
          method: 'GET',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (calcResponse.ok) {
          console.log('\n✅ Таблица "calculations" существует!');
        } else if (calcResponse.status === 404 || calcResponse.status === 406) {
          console.log('\n⚠️  Таблица "calculations" не найдена. Нужно выполнить миграции Prisma.');
        }
      } catch (err) {
        console.log('\n⚠️  Не удалось проверить таблицу calculations:', err.message);
      }

    } else {
      console.error('❌ Ошибка при подключении к Supabase:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkSupabaseConnection().catch(console.error);

