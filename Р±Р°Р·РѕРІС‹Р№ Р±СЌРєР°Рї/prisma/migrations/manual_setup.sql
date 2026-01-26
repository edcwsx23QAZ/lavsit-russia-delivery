-- SQL миграция для создания таблицы calculations в Supabase
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

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

-- Создание уникального индекса для orderNumber
CREATE UNIQUE INDEX IF NOT EXISTS "calculations_orderNumber_key" ON "calculations"("orderNumber");

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS "calculations_createdAt_idx" ON "calculations"("createdAt");
CREATE INDEX IF NOT EXISTS "calculations_status_idx" ON "calculations"("status");

