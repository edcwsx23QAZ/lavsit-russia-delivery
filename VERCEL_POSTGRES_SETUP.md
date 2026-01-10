# Настройка Vercel Postgres и переменных окружения

## Обзор

Данная инструкция описывает процесс подключения Vercel Postgres базы данных к проекту на Vercel и настройку всех необходимых переменных окружения.

**Требуемые переменные окружения:**
- `DATABASE_URL` - строка подключения к Vercel Postgres (автоматически)
- `NEXT_PUBLIC_SUPABASE_URL` - URL проекта Supabase (если используется Supabase клиент)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - анонимный ключ Supabase (если используется Supabase клиент)
- `KIT_API_TOKEN` - API токен КИТ (опционально)

---

## Шаг 1: Авторизация в Vercel CLI

Если вы еще не авторизованы в Vercel CLI:

```bash
vercel login
```

Это откроет браузер для авторизации. После успешной авторизации вы сможете использовать Vercel CLI.

---

## Шаг 2: Связывание проекта с Vercel

Если проект еще не связан с Vercel:

```bash
cd "E:\Work programs\cursor\repositary\lavsit-russia-delivery-1763017917119"
vercel link
```

Следуйте инструкциям:
- Выберите вашу команду/аккаунт
- Выберите проект (или создайте новый)
- Подтвердите настройки

---

## Шаг 3: Создание Vercel Postgres базы данных

### Вариант 1: Через Vercel CLI (автоматически)

Используйте скрипт автоматизации:

```powershell
.\scripts\setup-vercel-postgres.ps1
```

Или вручную через CLI:

```bash
# Просмотр существующих баз данных
vercel postgres ls

# Создание новой базы данных
vercel postgres create lavsit-russia-delivery-db --region iad
```

**Примечание**: Выберите регион, ближайший к вашим пользователям:
- `iad` - US East (Virginia)
- `sfo` - US West (San Francisco)
- `fra` - Europe (Frankfurt)
- `hnd` - Asia (Tokyo)

### Вариант 2: Через Vercel Dashboard

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в раздел **Storage**
4. Нажмите **Create Database**
5. Выберите **Postgres**
6. Введите имя базы данных (например, `lavsit-russia-delivery-db`)
7. Выберите регион
8. Нажмите **Create**

---

## Шаг 4: Получение строки подключения DATABASE_URL

### Через Vercel CLI

```bash
# Получение информации о базе данных
vercel postgres inspect lavsit-russia-delivery-db

# Или получение всех переменных окружения (включая DATABASE_URL)
vercel env pull .env.local
```

### Через Vercel Dashboard

1. Откройте Vercel Dashboard → ваш проект → **Storage**
2. Нажмите на вашу Postgres базу данных
3. Перейдите в раздел **Connection String** или **.env.local**
4. Скопируйте строку подключения `POSTGRES_URL` или `DATABASE_URL`
5. Добавьте `?sslmode=require` в конец строки (если не добавлено автоматически)

**Формат строки подключения:**
```
postgres://default:[password]@[host]:5432/verceldb?sslmode=require
```

---

## Шаг 5: Настройка переменных окружения в Vercel

### Через Vercel CLI

```bash
# Добавление переменной окружения
vercel env add DATABASE_URL production
# Вставьте значение строки подключения
# Повторите для preview и development окружений

vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Вставьте URL проекта Supabase (если используется)

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Вставьте анонимный ключ Supabase (если используется)

vercel env add KIT_API_TOKEN production
# Вставьте токен КИТ API (опционально)
```

### Через Vercel Dashboard

1. Откройте Vercel Dashboard → ваш проект → **Settings** → **Environment Variables**

2. Добавьте каждую переменную окружения:

   **DATABASE_URL** (обязательно):
   - **Name**: `DATABASE_URL`
   - **Value**: строка подключения из Vercel Postgres (например, `postgres://default:xxx@xxx.aws.neon.tech:5432/verceldb?sslmode=require`)
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development

   **NEXT_PUBLIC_SUPABASE_URL** (если используется Supabase клиент):
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: URL вашего проекта Supabase (например, `https://xxxxx.supabase.co`)
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development

   **NEXT_PUBLIC_SUPABASE_ANON_KEY** (если используется Supabase клиент):
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: анонимный публичный ключ Supabase
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development

   **KIT_API_TOKEN** (опционально):
   - **Name**: `KIT_API_TOKEN`
   - **Value**: токен API КИТ
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development

3. После добавления всех переменных нажмите **Save**

---

## Шаг 6: Проверка переменных окружения

### Через Vercel CLI

```bash
# Просмотр всех переменных окружения
vercel env ls

# Проверка конкретной переменной
vercel env pull .env.vercel
cat .env.vercel | grep DATABASE_URL
```

### Через Vercel Dashboard

1. Перейдите в Settings → Environment Variables
2. Убедитесь, что все переменные отображаются правильно
3. Проверьте, что переменные применены ко всем нужным окружениям (Production, Preview, Development)

---

## Шаг 7: Настройка Prisma для работы с Vercel Postgres

### 7.1. Обновление схемы Prisma (если необходимо)

Схема Prisma уже настроена для PostgreSQL и не требует изменений:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 7.2. Выполнение миграций базы данных

После получения DATABASE_URL выполните миграции:

```bash
# Получение переменных окружения из Vercel
vercel env pull .env.local

# Убедитесь, что DATABASE_URL установлен
# (файл .env.local будет содержать переменные окружения)

# Генерация Prisma Client
npx prisma generate

# Выполнение миграций на production базе данных
npx prisma migrate deploy
```

**Примечание**: Если база данных пустая и нет миграций, создайте первую миграцию:

```bash
npx prisma migrate dev --name init
```

Затем выполните на production:

```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### 7.3. Проверка подключения к базе данных

```bash
# Открытие Prisma Studio для просмотра базы данных
vercel env pull .env.local
npx prisma studio
```

Это откроет Prisma Studio в браузере, где вы сможете просмотреть и редактировать данные базы данных.

---

## Шаг 8: Обновление package.json для сборки

Убедитесь, что в `package.json` есть правильные скрипты для сборки:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

**Важно**: Vercel автоматически запускает `prisma generate` при обнаружении папки `prisma`, но явное указание гарантирует правильную работу.

---

## Шаг 9: Настройка Build Commands в Vercel

Проверьте настройки сборки в Vercel:

1. Откройте Vercel Dashboard → ваш проект → **Settings** → **General**
2. Проверьте раздел **Build & Development Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `prisma generate && next build` (или просто `next build`, если postinstall скрипт настроен)
   - **Install Command**: `npm install` (или `npm ci` для более надежной установки)
   - **Output Directory**: `.next`

---

## Шаг 10: Перезапуск деплоя

После настройки всех переменных окружения:

1. **Автоматический перезапуск**: 
   - Сделайте любой commit и push в GitHub
   - Vercel автоматически запустит новый деплой с обновленными переменными окружения

2. **Ручной перезапуск**:
   - Откройте Vercel Dashboard → ваш проект → **Deployments**
   - Найдите последний деплой
   - Нажмите три точки (⋮) → **Redeploy**
   - Или создайте новый деплой через CLI:
     ```bash
     vercel --prod
     ```

---

## Шаг 11: Проверка работоспособности

### 11.1. Проверка логов деплоя

1. Откройте Vercel Dashboard → ваш проект → **Deployments**
2. Выберите последний деплой
3. Проверьте **Build Logs** на наличие ошибок
4. Проверьте **Function Logs** для ошибок runtime

### 11.2. Проверка подключения к базе данных

Создайте тестовый API endpoint для проверки подключения:

```typescript
// app/api/test-db/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$connect();
    return Response.json({ 
      success: true, 
      message: 'Database connection successful' 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
```

Откройте в браузере: `https://your-project.vercel.app/api/test-db`

### 11.3. Проверка переменных окружения

```typescript
// app/api/test-env/route.ts
export async function GET() {
  return Response.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasKitToken: !!process.env.KIT_API_TOKEN,
  });
}
```

**Важно**: Этот endpoint покажет только наличие переменных, но не их значения (из соображений безопасности).

---

## Часто задаваемые вопросы (FAQ)

### Q: Нужны ли NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY, если используется Vercel Postgres?

A: Это зависит от вашего кода:
- Если вы используете Supabase клиент (`@supabase/supabase-js`) на клиенте - да, нужны
- Если вы используете только Prisma с `DATABASE_URL` на сервере - нет, не нужны

Проверьте использование в коде:
```bash
grep -r "createClient\|@supabase" --include="*.ts" --include="*.tsx"
```

### Q: Как обновить переменные окружения после изменения?

A: 
1. Через Vercel Dashboard: Settings → Environment Variables → редактируйте существующую переменную
2. Через CLI: `vercel env rm VARIABLE_NAME` затем `vercel env add VARIABLE_NAME`

**Важно**: Изменения переменных окружения требуют нового деплоя для применения.

### Q: Как выполнить миграции после создания базы данных?

A:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

Или через Vercel Dashboard → Storage → Postgres → ваш проект → выполните SQL миграции вручную.

### Q: База данных создана, но DATABASE_URL не добавляется автоматически?

A: 
1. Проверьте, что база данных связана с проектом в Vercel Dashboard → Storage
2. Добавьте `DATABASE_URL` вручную через Environment Variables, используя значение из раздела Connection String базы данных

### Q: Ошибка "relation does not exist" после деплоя?

A: Выполните миграции:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

Или убедитесь, что миграции выполняются автоматически во время сборки (проверьте Build Command).

---

## Чеклист настройки

Используйте этот чеклист для проверки завершения настройки:

- [ ] Авторизован в Vercel CLI
- [ ] Проект связан с Vercel (`vercel link`)
- [ ] Vercel Postgres база данных создана
- [ ] `DATABASE_URL` добавлен в Environment Variables (Production, Preview, Development)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` добавлен (если требуется)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` добавлен (если требуется)
- [ ] `KIT_API_TOKEN` добавлен (если требуется)
- [ ] Все переменные проверены через `vercel env ls` или Dashboard
- [ ] Prisma миграции выполнены (`npx prisma migrate deploy`)
- [ ] Prisma Client сгенерирован (`npx prisma generate`)
- [ ] Build Command настроен в Vercel (включает `prisma generate`)
- [ ] Новый деплой выполнен после настройки переменных
- [ ] Подключение к базе данных проверено (тестовый endpoint)
- [ ] Логи деплоя проверены на наличие ошибок

---

## Полезные ссылки

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

---

**Дата создания инструкции**: $(Get-Date)

**Последнее обновление**: При изменении процесса настройки обновите эту инструкцию.

