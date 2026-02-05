import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Загружаем переменные окружения из .env.local если DATABASE_URL не установлен
if (!process.env.DATABASE_URL) {
  const envLocalPath = join(process.cwd(), '.env.local');
  if (existsSync(envLocalPath)) {
    try {
      const envContent = readFileSync(envLocalPath, 'utf-8');
      const lines = envContent.split(/\r?\n/);
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim();
            const value = trimmed.substring(equalIndex + 1).trim();
            // Удаляем кавычки если есть
            const cleanValue = value.replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = cleanValue;
            }
          }
        }
      });
    } catch (error: any) {
      console.error('[Prisma] Error loading .env.local:', error.message);
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

