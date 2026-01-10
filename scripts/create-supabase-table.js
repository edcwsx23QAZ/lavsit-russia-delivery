// Скрипт для создания таблицы calculations в Supabase
const https = require('https');

const supabaseUrl = 'https://sirqrnffrpdkdtqiwjgq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1NTMyOCwiZXhwIjoyMDc0OTMxMzI4fQ.7FYvM9t_uE5mgIIZ2X-PuJ-qZ3h6IXIvb_uw3QWYO_8';

const sql = `
CREATE TABLE IF NOT EXISTS "calculations" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formData" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "calculations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calculations_orderNumber_key" ON "calculations"("orderNumber");
CREATE INDEX IF NOT EXISTS "calculations_createdAt_idx" ON "calculations"("createdAt");
CREATE INDEX IF NOT EXISTS "calculations_status_idx" ON "calculations"("status");
`;

async function createTable() {
  console.log('🔧 Создание таблицы calculations в Supabase...\n');

  // Supabase не предоставляет REST API для выполнения произвольного SQL
  // Нужно использовать либо SQL Editor в Dashboard, либо Prisma
  
  console.log('⚠️  Прямое создание таблицы через REST API недоступно.');
  console.log('📋 Выполните SQL вручную в Supabase Dashboard:\n');
  console.log('1. Откройте: https://supabase.com/dashboard/project/sirqrnffrpdkdtqiwjgq/sql/new');
  console.log('2. Скопируйте и выполните следующий SQL:\n');
  console.log(sql);
  console.log('\n✅ После выполнения таблица будет создана.');
}

createTable().catch(console.error);

