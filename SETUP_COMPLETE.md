# ✅ Инструкция по завершению настройки проекта

## 📋 Статус настройки

✅ Репозиторий синхронизирован с GitHub  
✅ Supabase проект проверен (Lavsit Textile - активен)  
✅ REST API Supabase работает  
⚠️ Таблица `calculations` требует создания  
⚠️ Переменные окружения в Vercel требуют настройки  
⚠️ Деплой на Vercel требуется

---

## 🗄️ Шаг 1: Создание таблицы в Supabase

### Вариант A: Через SQL Editor (Рекомендуется)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/sirqrnffrpdkdtqiwjgq)
2. Перейдите в **SQL Editor** (левый сайдбар)
3. Скопируйте содержимое файла `prisma/migrations/manual_setup.sql`
4. Вставьте SQL в редактор
5. Нажмите **Run** (или Ctrl+Enter)

### Вариант B: Включить прямые подключения (для Prisma)

1. В Supabase Dashboard перейдите в **Settings** → **Database**
2. Найдите раздел **Connection Pooling**
3. Убедитесь, что прямые подключения разрешены
4. Затем выполните локально:
   ```bash
   $env:DATABASE_URL="postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public"
   npx prisma db push
   ```

---

## 🔧 Шаг 2: Настройка переменных окружения в Vercel

### Вариант A: Через Vercel Dashboard (Рекомендуется)

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Найдите проект `lavsit-russia-delivery-1763017917119` или создайте новый
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте следующие переменные для **всех окружений** (Production, Preview, Development):

   **NEXT_PUBLIC_SUPABASE_URL:**
   ```
   https://sirqrnffrpdkdtqiwjgq.supabase.co
   ```

   **NEXT_PUBLIC_SUPABASE_ANON_KEY:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8
   ```

   **DATABASE_URL:**
   ```
   postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public
   ```
   
   Или используйте Connection Pooler (рекомендуется для production):
   ```
   postgresql://postgres.sirqrnffrpdkdtqiwjgq:edcwsx123QAZ!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

### Вариант B: Через Vercel CLI

```bash
# Авторизация в Vercel (откроет браузер)
vercel login

# Связывание проекта (если еще не связано)
cd "E:\Work programs\cursor\repositary\lavsit-russia-delivery-1763017917119"
vercel link

# Добавление переменных
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Вставьте: https://sirqrnffrpdkdtqiwjgq.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Вставьте: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8

vercel env add DATABASE_URL production
# Вставьте: postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public

# Повторите для preview и development окружений
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add DATABASE_URL preview

vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
vercel env add DATABASE_URL development
```

---

## 🚀 Шаг 3: Деплой на Vercel

### Вариант A: Через Vercel Dashboard

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Найдите или создайте проект
3. Если проект еще не связан с GitHub:
   - Нажмите **Add New...** → **Project**
   - Выберите репозиторий `edcwsx23QAZ/lavsit-russia-delivery-1763017917119`
   - Vercel автоматически определит Next.js настройки
4. Убедитесь, что все переменные окружения добавлены
5. Нажмите **Deploy**

### Вариант B: Через Vercel CLI

```bash
# Из корня проекта
cd "E:\Work programs\cursor\repositary\lavsit-russia-delivery-1763017917119"

# Авторизация (если еще не авторизованы)
vercel login

# Связывание проекта (если еще не связано)
vercel link

# Деплой на production
vercel --prod
```

---

## ✅ Шаг 4: Проверка после деплоя

1. **Проверка переменных окружения:**
   - Откройте деплой в Vercel Dashboard
   - Проверьте Build Logs на наличие ошибок
   - Убедитесь, что переменные окружения загружены

2. **Проверка базы данных:**
   - Откройте ваш деплой URL (например: `https://your-project.vercel.app`)
   - Перейдите на `/env-check` для проверки переменных
   - Проверьте, что база данных доступна

3. **Проверка работы приложения:**
   - Убедитесь, что основные функции работают
   - Проверьте создание записей в базе данных

---

## 📝 Текущие настройки

- **Supabase проект:** Lavsit Textile
- **Supabase URL:** https://sirqrnffrpdkdtqiwjgq.supabase.co
- **База данных:** Активна ✅
- **REST API:** Работает ✅
- **Таблица calculations:** Требует создания ⚠️
- **GitHub репозиторий:** https://github.com/edcwsx23QAZ/lavsit-russia-delivery-1763017917119
- **Vercel токен:** Сохранен ✅

---

## 🔍 Проверка статуса

Выполните для проверки подключения к Supabase:
```bash
node scripts/test-supabase-connection.js
```

---

## 🆘 Решение проблем

### Проблема: Не удается подключиться к базе данных

**Решение:**
- Проверьте, что таблица `calculations` создана в Supabase
- Убедитесь, что пароль в DATABASE_URL правильный
- Попробуйте использовать Connection Pooler URL вместо прямого подключения

### Проблема: Переменные окружения не работают на Vercel

**Решение:**
- Убедитесь, что переменные добавлены для всех окружений (Production, Preview, Development)
- После добавления переменных выполните новый деплой
- Проверьте, что переменные не имеют лишних пробелов или кавычек

### Проблема: Деплой падает с ошибкой Prisma

**Решение:**
- Убедитесь, что `DATABASE_URL` настроен правильно
- Проверьте, что Prisma Client сгенерирован: `npx prisma generate`
- Убедитесь, что в `package.json` есть скрипт `postinstall: prisma generate`

---

**Готово!** После выполнения всех шагов проект будет полностью настроен и развернут на Vercel. 🎉

