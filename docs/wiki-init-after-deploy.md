# Инициализация контента вики после деплоя

## Статус

✅ **Все изменения закоммичены и отправлены в GitHub**
✅ **Vercel автоматически задеплоит изменения из GitHub**

## Шаги для инициализации контента

### 1. Дождаться завершения деплоя на Vercel

После пуша в GitHub, Vercel автоматически начнет деплой. Проверьте статус:
- Откройте https://vercel.com/dashboard
- Найдите проект `lavsit-russia-delivery`
- Дождитесь завершения деплоя (обычно 2-5 минут)

### 2. Инициализировать контент через API

После завершения деплоя, инициализируйте контент одним из способов:

#### Способ 1: Через браузер (рекомендуется)

1. Откройте страницу вики: https://lavsit-russia-delivery-narfius-projects.vercel.app/wiki
2. Откройте консоль браузера (F12)
3. Выполните команду:

```javascript
fetch('/api/wiki/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ overwrite: false })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

#### Способ 2: Через curl (если есть доступ к терминалу)

```bash
curl -X POST https://lavsit-russia-delivery-narfius-projects.vercel.app/api/wiki/init \
  -H "Content-Type: application/json" \
  -d '{"overwrite": false}'
```

#### Способ 3: Через Postman или другой HTTP клиент

- **URL:** `https://lavsit-russia-delivery-narfius-projects.vercel.app/api/wiki/init`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "overwrite": false
}
```

### 3. Проверить результат

После инициализации проверьте:

1. Откройте страницу вики: https://lavsit-russia-delivery-narfius-projects.vercel.app/wiki
2. Должны быть видны все 11 разделов:
   - Введение
   - Культура и структура компании
   - Ценность отдела логистики
   - Ежедневное расписание
   - Процессы и регламенты
   - Метрики и оценка качества
   - Инструменты и системы
   - Контакты
   - Аккаунты и доступы
   - Скрипты и примеры сообщений
   - Полезные ссылки

### 4. Если нужно перезаписать существующий контент

Используйте `overwrite: true`:

```javascript
fetch('/api/wiki/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ overwrite: true })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Что будет создано

При инициализации будут созданы/обновлены следующие страницы:

1. **introduction** - Инструкция для менеджера по логистике
2. **culture-and-structure** - Культура и структура компании
3. **logistics-value** - Ценность отдела логистики
4. **daily-schedule** - Ежедневное расписание (8:00-20:00)
5. **processes** - Процессы и регламенты
6. **metrics** - Метрики и оценка качества
7. **tools** - Инструменты и системы
8. **contacts** - Контакты и коммуникации
9. **accounts** - Аккаунты и доступы
10. **scripts** - Скрипты и примеры сообщений
11. **links** - Полезные ссылки

Каждая страница будет иметь первую версию в системе версионирования.

## Устранение проблем

### Ошибка подключения к базе данных

Убедитесь, что в Vercel настроена переменная окружения `DATABASE_URL`:
1. Откройте настройки проекта в Vercel
2. Перейдите в раздел "Environment Variables"
3. Проверьте наличие `DATABASE_URL`

### Ошибка при инициализации

Проверьте логи в Vercel:
1. Откройте проект в Vercel Dashboard
2. Перейдите в раздел "Deployments"
3. Откройте последний деплой
4. Проверьте логи функции `/api/wiki/init`

## Контакты

Если возникли проблемы, проверьте:
- Логи Vercel
- Статус базы данных
- Переменные окружения


