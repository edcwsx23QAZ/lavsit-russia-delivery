# Исправление настроек Vercel для lavsit-russia-delivery

## Проблема
Проект lavsit-russia-delivery должен быть связан с https://lavsit-russia-delivery.vercel.app/, но сейчас там проект ic-eda (неверно).

## Решение

### Шаг 1: Отвязка от неправильного проекта

Если проект сейчас связан с неправильным Vercel проектом, нужно его отвязать:

```powershell
cd "E:\Work programs\cursor\repositary\lavsit-russia-delivery"

# Удалите старую конфигурацию (если есть)
if (Test-Path .vercel) {
    Remove-Item -Recurse -Force .vercel
}
```

### Шаг 2: Связывание проекта с правильным Vercel проектом

```powershell
# Войдите в Vercel (если еще не вошли)
vercel login

# Свяжите проект с существующим проектом в Vercel
vercel link
```

При выполнении `vercel link`:
1. Выберите **"Link to existing project"** → `Yes`
2. Выберите проект **"lavsit-russia-delivery"** из списка
3. Если проекта нет, создайте новый с именем **"lavsit-russia-delivery"**
4. **ВАЖНО**: Убедитесь, что вы НЕ выбираете проект "ic-eda"

### Шаг 3: Проверка связи

После выполнения `vercel link` будет создан файл `.vercel/project.json` с правильными настройками.

### Шаг 4: Деплой проекта

```powershell
# Деплой в production
vercel --prod
```

### Шаг 5: Проверка

После деплоя проверьте:
- https://lavsit-russia-delivery.vercel.app/components должен открываться без ошибок
- Проект должен содержать файлы из папки lavsit-russia-delivery (НЕ ic-eda)

## Альтернативный способ (через веб-интерфейс)

1. Откройте https://vercel.com/dashboard
2. Найдите проект **"lavsit-russia-delivery"** или создайте новый
3. **ВАЖНО**: Если проект "lavsit-russia-delivery" содержит код ic-eda:
   - Откройте настройки проекта
   - В разделе **"Git"** убедитесь, что подключен репозиторий: `edcwsx23QAZ/lavsit-russia-delivery`
   - Если подключен неправильный репозиторий, отвяжите его и подключите правильный
4. В настройках проекта → **"General"** → **"Project Name"** должно быть: `lavsit-russia-delivery`
5. Запустите новый деплой

## Проверка правильности связи

После настройки проверьте файл `.vercel/project.json`:

```json
{
  "projectId": "...",
  "orgId": "..."
}
```

Убедитесь, что projectId соответствует проекту "lavsit-russia-delivery" в Vercel Dashboard.





