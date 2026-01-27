# Скрипт для проверки и деплоя в правильный проект Vercel
# Убеждается, что деплои идут только в lavsit-russia-delivery

Write-Host "=== Проверка и деплой в Vercel ===" -ForegroundColor Cyan
Write-Host ""

# Проверка текущей директории
$currentDir = Get-Location
Write-Host "Текущая директория: $currentDir" -ForegroundColor Yellow
Write-Host ""

# Проверка .vercel/project.json
Write-Host "=== Проверка конфигурации Vercel ===" -ForegroundColor Cyan
$vercelConfigPath = ".vercel\project.json"
if (Test-Path $vercelConfigPath) {
    $config = Get-Content $vercelConfigPath | ConvertFrom-Json
    Write-Host "[OK] Файл .vercel/project.json найден" -ForegroundColor Green
    Write-Host "   Project Name: $($config.projectName)" -ForegroundColor Yellow
    Write-Host "   Project ID: $($config.projectId)" -ForegroundColor Yellow
    
    if ($config.projectName -eq "lavsit-russia-delivery") {
        Write-Host "   [OK] Проект правильно связан с 'lavsit-russia-delivery'" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Проект связан с '$($config.projectName)' вместо 'lavsit-russia-delivery'" -ForegroundColor Red
        Write-Host "   Запустите: vercel link" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[ERROR] Файл .vercel/project.json не найден" -ForegroundColor Red
    Write-Host "Запустите: vercel link" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Проверка Git
Write-Host "=== Проверка Git ===" -ForegroundColor Cyan
$gitRemote = git remote get-url origin 2>$null
if ($gitRemote) {
    Write-Host "[OK] Git remote: $gitRemote" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Git remote не настроен" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Проверка статуса Git
Write-Host "=== Проверка статуса Git ===" -ForegroundColor Cyan
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "[WARNING] Есть незакоммиченные изменения:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $response = Read-Host "Хотите закоммитить изменения перед деплоем? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        git add .
        $commitMessage = Read-Host "Введите сообщение коммита (или нажмите Enter для стандартного)"
        if ([string]::IsNullOrWhiteSpace($commitMessage)) {
            $commitMessage = "Update: Prepare for deployment"
        }
        git commit -m $commitMessage
        Write-Host "[OK] Изменения закоммичены" -ForegroundColor Green
    }
} else {
    Write-Host "[OK] Нет незакоммиченных изменений" -ForegroundColor Green
}
Write-Host ""

# Проверка последнего коммита
Write-Host "=== Последний коммит ===" -ForegroundColor Cyan
$lastCommit = git log --oneline -1 2>$null
if ($lastCommit) {
    Write-Host $lastCommit -ForegroundColor Yellow
} else {
    Write-Host "[WARNING] Не удалось получить информацию о коммитах" -ForegroundColor Yellow
}
Write-Host ""

# Проверка Vercel CLI
Write-Host "=== Проверка Vercel CLI ===" -ForegroundColor Cyan
$vercelVersion = vercel --version 2>$null
if ($vercelVersion) {
    Write-Host "[OK] Vercel CLI установлен: $vercelVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Vercel CLI не установлен" -ForegroundColor Red
    Write-Host "Установите: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Проверка авторизации
Write-Host "=== Проверка авторизации в Vercel ===" -ForegroundColor Cyan
try {
    $whoami = vercel whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Требуется авторизация в Vercel" -ForegroundColor Yellow
        Write-Host "Запустите: vercel login" -ForegroundColor White
        Write-Host ""
        $response = Read-Host "Хотите авторизоваться сейчас? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            vercel login
        } else {
            Write-Host "Авторизуйтесь вручную и запустите скрипт снова" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "[OK] Авторизован как: $whoami" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Не удалось проверить авторизацию" -ForegroundColor Yellow
}
Write-Host ""

# Предложение деплоя
Write-Host "=== Деплой ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Выберите способ деплоя:" -ForegroundColor Yellow
Write-Host "1. Git Push (автоматический деплой через GitHub)" -ForegroundColor White
Write-Host "2. Vercel CLI (ручной деплой)" -ForegroundColor White
Write-Host "3. Пропустить деплой" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Ваш выбор (1/2/3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Отправка изменений в GitHub..." -ForegroundColor Yellow
        git push origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Изменения отправлены в GitHub" -ForegroundColor Green
            Write-Host "Деплой должен начаться автоматически в проекте 'lavsit-russia-delivery'" -ForegroundColor Green
            Write-Host "Проверьте статус: https://vercel.com/dashboard" -ForegroundColor Cyan
        } else {
            Write-Host "[ERROR] Не удалось отправить изменения в GitHub" -ForegroundColor Red
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Деплой через Vercel CLI..." -ForegroundColor Yellow
        Write-Host "Убедитесь, что проект правильно связан..." -ForegroundColor Yellow
        vercel link --confirm
        Write-Host ""
        Write-Host "Запуск деплоя в production..." -ForegroundColor Yellow
        vercel --prod
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Деплой завершен" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Деплой не удался" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "Деплой пропущен" -ForegroundColor Yellow
    }
    default {
        Write-Host "[ERROR] Неверный выбор" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Готово ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "ВАЖНО: Убедитесь, что проект 'lavsit-russia-delivery-1763017917119' отключен в Vercel Dashboard" -ForegroundColor Yellow
Write-Host "Инструкции: см. VERCEL_DOUBLE_DEPLOYMENT_FIX_INSTRUCTIONS.md" -ForegroundColor Cyan

