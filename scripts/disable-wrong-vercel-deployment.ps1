# Скрипт для отключения неправильного деплоя в Vercel
# Deployment ID: 3yrkruyq1 на проекте lavsit-russia-delivery-1763017917119

Write-Host "=== Отключение неправильного деплоя в Vercel ===" -ForegroundColor Cyan
Write-Host ""

# Проверка Vercel CLI
Write-Host "Проверка Vercel CLI..." -ForegroundColor Yellow
$vercelVersion = vercel --version 2>$null
if (-not $vercelVersion) {
    Write-Host "[ERROR] Vercel CLI не установлен" -ForegroundColor Red
    Write-Host "Установите: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Vercel CLI установлен: $vercelVersion" -ForegroundColor Green
Write-Host ""

# Проверка авторизации
Write-Host "Проверка авторизации в Vercel..." -ForegroundColor Yellow
try {
    $projects = vercel projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Требуется авторизация в Vercel" -ForegroundColor Yellow
        Write-Host "Запустите: vercel login" -ForegroundColor White
        Write-Host ""
        Write-Host "После авторизации этот скрипт можно запустить снова" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "[OK] Авторизация успешна" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Не удалось проверить авторизацию" -ForegroundColor Yellow
    Write-Host "Запустите: vercel login" -ForegroundColor White
}
Write-Host ""

# Инструкции по отключению через Dashboard
Write-Host "=== Инструкции по отключению Deployment 3yrkruyq1 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "ВАРИАНТ 1: Отключение через Vercel Dashboard (Рекомендуется)" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Откройте Vercel Dashboard:" -ForegroundColor White
Write-Host "   https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Найдите проект 'lavsit-russia-delivery-1763017917119'" -ForegroundColor White
Write-Host ""
Write-Host "3. Откройте раздел Deployments" -ForegroundColor White
Write-Host ""
Write-Host "4. Найдите деплой с ID '3yrkruyq1' или последний деплой" -ForegroundColor White
Write-Host ""
Write-Host "5. Отключите GitHub интеграцию:" -ForegroundColor White
Write-Host "   - Перейдите в Settings -> Git" -ForegroundColor Cyan
Write-Host "   - Нажмите 'Disconnect Git Repository'" -ForegroundColor Cyan
Write-Host "   - Отключите 'Automatic deployments from Git'" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Удалите проект (опционально):" -ForegroundColor White
Write-Host "   - Settings -> Danger Zone -> Delete Project" -ForegroundColor Cyan
Write-Host "   - Введите название проекта для подтверждения" -ForegroundColor Cyan
Write-Host ""

Write-Host "ВАРИАНТ 2: Использование Vercel API" -ForegroundColor Yellow
Write-Host ""
Write-Host "Для отключения через API нужен Vercel Token:" -ForegroundColor White
Write-Host "1. Получите токен: https://vercel.com/account/tokens" -ForegroundColor Cyan
Write-Host "2. Используйте API для удаления проекта:" -ForegroundColor White
Write-Host "   DELETE https://api.vercel.com/v9/projects/{project-id}" -ForegroundColor Cyan
Write-Host ""

# Проверка правильного проекта
Write-Host "=== Проверка правильного проекта ===" -ForegroundColor Cyan
$vercelConfigPath = ".vercel\project.json"
if (Test-Path $vercelConfigPath) {
    $config = Get-Content $vercelConfigPath | ConvertFrom-Json
    Write-Host "[OK] Локальная конфигурация:" -ForegroundColor Green
    Write-Host "   Project Name: $($config.projectName)" -ForegroundColor Yellow
    Write-Host "   Project ID: $($config.projectId)" -ForegroundColor Yellow
    
    if ($config.projectName -eq "lavsit-russia-delivery") {
        Write-Host "   [OK] Проект правильно связан с 'lavsit-russia-delivery'" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] Проект связан с '$($config.projectName)'" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Файл .vercel/project.json не найден" -ForegroundColor Red
}
Write-Host ""

# Проверка Git
Write-Host "=== Проверка Git репозитория ===" -ForegroundColor Cyan
$gitRemote = git remote get-url origin 2>$null
if ($gitRemote) {
    Write-Host "[OK] Git remote: $gitRemote" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Git remote не настроен" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Следующие шаги ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "После отключения неправильного проекта:" -ForegroundColor Yellow
Write-Host "1. Убедитесь, что проект 'lavsit-russia-delivery' активен" -ForegroundColor White
Write-Host "2. Проверьте, что 'Automatic deployments from Git' включено" -ForegroundColor White
Write-Host "3. Задеплойте последнюю версию:" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host "   или" -ForegroundColor White
Write-Host "   vercel --prod" -ForegroundColor Cyan
Write-Host ""

