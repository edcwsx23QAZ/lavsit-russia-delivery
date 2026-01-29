# Инструкция по деплою проекта lavsit-russia-delivery на Vercel

## Текущая ситуация

- **Локальный проект**: `E:\Work programs\cursor\repositary\lavsit-russia-delivery`
- **GitHub репозиторий**: `https://github.com/edcwsx23QAZ/lavsit-russia-delivery.git`
- **Vercel URL**: `https://lavsit-russia-delivery.vercel.app`
- **Проблема**: На Vercel деплоится неправильный проект (не калькулятор доставки)

## Что было исправлено

1. ✅ Исправлен редирект главной страницы: теперь `/` редиректит на `/vozovoz-parser` (калькулятор доставки) вместо `/components`
2. ✅ Изменения закоммичены и отправлены в GitHub

## Шаги для исправления деплоя на Vercel

### Вариант 1: Через Vercel Dashboard (Рекомендуется)

1. **Откройте Vercel Dashboard**: https://vercel.com/dashboard

2. **Найдите проект "lavsit-russia-delivery"**:
   - Если проект существует, откройте его
   - Если проекта нет, создайте новый проект

3. **Проверьте настройки Git**:
   - Откройте **Settings** → **Git**
   - Проверьте **Repository**: должен быть `edcwsx23QAZ/lavsit-russia-delivery`
   - Если репозиторий неправильный:
     - Нажмите **Disconnect**
     - Нажмите **Connect Git Repository**
     - Выберите `edcwsx23QAZ/lavsit-russia-delivery`
     - Подтвердите подключение

4. **Проверьте настройки Build**:
   - Откройте **Settings** → **General**
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (корень проекта)
   - **Build Command**: `prisma generate && next build` (из vercel.json)
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. **Запустите новый деплой**:
   - Откройте вкладку **Deployments**
   - Нажмите **Redeploy** на последнем деплое
   - Или нажмите **Deploy** → выберите последний коммит из ветки `main`

### Вариант 2: Через Vercel CLI

```powershell
cd "E:\Work programs\cursor\repositary\lavsit-russia-delivery"

# Войдите в Vercel (если еще не вошли)
vercel login

# Свяжите проект с существующим проектом в Vercel
vercel link

# При выполнении vercel link:
# 1. Выберите "Link to existing project" → Yes
# 2. Выберите проект "lavsit-russia-delivery" из списка
# 3. Если проекта нет, создайте новый с именем "lavsit-russia-delivery"
# 4. ВАЖНО: Убедитесь, что вы НЕ выбираете проект "ic-eda" или другой проект

# Деплой в production
vercel --prod
```

## Проверка после деплоя

После деплоя проверьте:

1. **Главная страница**: 
   - https://lavsit-russia-delivery.vercel.app/
   - Должна редиректить на `/vozovoz-parser` (калькулятор доставки)

2. **Калькулятор доставки**:
   - https://lavsit-russia-delivery.vercel.app/vozovoz-parser
   - Должен показывать форму калькулятора доставки

3. **Страница компонентов** (если нужна):
   - https://lavsit-russia-delivery.vercel.app/components
   - Должна показывать каталог компонентов (но это не главная страница)

## Если проблема сохраняется

Если после деплоя на `https://lavsit-russia-delivery.vercel.app` все еще показывается неправильный проект:

1. **Проверьте, что репозиторий правильный**:
   - В Vercel Dashboard → Settings → Git
   - Должен быть: `edcwsx23QAZ/lavsit-russia-delivery`

2. **Проверьте, что деплоится правильная ветка**:
   - В Vercel Dashboard → Settings → Git
   - **Production Branch**: должен быть `main`

3. **Очистите кэш Vercel**:
   - В Vercel Dashboard → Deployments
   - Выберите последний деплой
   - Нажмите **Redeploy** с опцией **"Use existing Build Cache"** = OFF

4. **Проверьте файл vercel.json**:
   - Убедитесь, что `vercel.json` содержит правильные настройки
   - Build Command: `prisma generate && next build`

## Переменные окружения

Убедитесь, что в Vercel настроены все необходимые переменные окружения:
- DATABASE_URL
- PEK_LOGIN, PEK_API_KEY
- KIT_API_TOKEN (если используется)
- Другие переменные из `.env.local`

## Контакты для поддержки

Если проблема не решается, проверьте:
- Логи деплоя в Vercel Dashboard → Deployments → выберите деплой → View Function Logs
- Настройки проекта в Vercel Dashboard → Settings




