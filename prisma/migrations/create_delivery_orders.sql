-- SQL миграция для создания таблицы delivery_orders
-- Выполните этот SQL в Supabase Dashboard → SQL Editor или через Prisma migrate

CREATE TABLE IF NOT EXISTS "delivery_orders" (
    "id" TEXT NOT NULL,
    "bitrixOrderId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "products" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "payment" TEXT NOT NULL DEFAULT '',
    "paymentAmount" DOUBLE PRECISION,
    "time" TEXT NOT NULL DEFAULT '',
    "comment" TEXT NOT NULL DEFAULT '',
    "fsm" TEXT NOT NULL DEFAULT '',
    "wrote" BOOLEAN NOT NULL DEFAULT false,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "shipped" BOOLEAN NOT NULL DEFAULT false,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "isEmpty" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "rowColor" TEXT,
    "bitrixData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- Создание уникального индекса для bitrixOrderId
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_orders_bitrixOrderId_key" ON "delivery_orders"("bitrixOrderId");

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS "delivery_orders_date_idx" ON "delivery_orders"("date");
CREATE INDEX IF NOT EXISTS "delivery_orders_bitrixOrderId_idx" ON "delivery_orders"("bitrixOrderId");
CREATE INDEX IF NOT EXISTS "delivery_orders_orderNumber_idx" ON "delivery_orders"("orderNumber");

