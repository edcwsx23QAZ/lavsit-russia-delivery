# Скрипт для исправления проблемы двойного деплоя в Vercel
# Этот скрипт проверяет конфигурацию и предоставляет инструкции

Write-Host "=== Проверка конфигурации Vercel ===" -ForegroundColor Cyan
Write-Host ""

# Проверка .vercel/project.json
$vercelConfigPath = ".vercel\project.json"
if (Test-Path $vercelConfigPath) {
    $config = Get-Content $vercelConfigPath | ConvertFrom-Json
    Write-Host "[OK] Найден файл .vercel/project.json" -ForegroundColor Green
    Write-Host "   Project Name: $($config.projectName)" -ForegroundColor Yellow
    Write-Host "   Project ID: $($config.projectId)" -ForegroundColor Yellow
    
    if ($config.projectName -eq "lavsit-russia-delivery") {
        Write-Host "   [OK] Локальный проект правильно связан с 'lavsit-russia-delivery'" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] ВНИМАНИЕ: Проект связан с '$($config.projectName)' вместо 'lavsit-russia-delivery'" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Файл .vercel/project.json не найден" -ForegroundColor Red
    Write-Host "   Запустите: vercel link" -ForegroundColor Yellow
}

Write-Host ""

# Проверка Git remote
Write-Host "=== Проверка Git конфигурации ===" -ForegroundColor Cyan
$gitRemote = git remote get-url origin 2>$null
if ($gitRemote) {
    Write-Host "[OK] Git remote настроен:" -ForegroundColor Green
    Write-Host "   $gitRemote" -ForegroundColor Yellow
    
    if ($gitRemote -match "lavsit-russia-delivery") {
        Write-Host "   [OK] Репозиторий правильный" -ForegroundColor Green
    }
} else {
    Write-Host "[ERROR] Git remote не настроен" -ForegroundColor Red
}

Write-Host ""

# Проверка Vercel CLI
Write-Host "=== Проверка Vercel CLI ===" -ForegroundColor Cyan
$vercelVersion = vercel --version 2>$null
if ($vercelVersion) {
    Write-Host "[OK] Vercel CLI установлен: $vercelVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Vercel CLI не установлен" -ForegroundColor Red
    Write-Host "   Установите: npm i -g vercel" -ForegroundColor Yellow
}

Write-Host ""

# Инструкции
Write-Host "=== Инструкции по исправлению ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Удалите проект 'lavsit-russia-delivery-1763017917119' через Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "   - Откройте https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   - Найдите проект 'lavsit-russia-delivery-1763017917119'" -ForegroundColor White
Write-Host "   - Settings -> Danger Zone -> Delete Project" -ForegroundColor White
Write-Host ""
Write-Host "2. Или отключите автоматические деплои:" -ForegroundColor Yellow
Write-Host "   - Settings -> Git -> Отключите 'Automatic deployments from Git'" -ForegroundColor White
Write-Host "   - Settings -> Git -> Disconnect Git Repository" -ForegroundColor White
Write-Host ""
Write-Host "3. Проверьте правильный проект 'lavsit-russia-delivery':" -ForegroundColor Yellow
Write-Host "   - Убедитесь, что 'Automatic deployments from Git' включено" -ForegroundColor White
Write-Host "   - Production Branch: main" -ForegroundColor White
Write-Host ""
Write-Host "4. Задеплойте последнюю версию:" -ForegroundColor Yellow
Write-Host "   git push origin main" -ForegroundColor White
Write-Host "   или" -ForegroundColor White
Write-Host "   vercel --prod" -ForegroundColor White
Write-Host ""

# Проверка незакоммиченных изменений
Write-Host "=== Проверка Git статуса ===" -ForegroundColor Cyan
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "[WARNING] Есть незакоммиченные изменения:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    Write-Host "Рекомендуется закоммитить изменения перед деплоем" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Нет незакоммиченных изменений" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Готово ===" -ForegroundColor Cyan

