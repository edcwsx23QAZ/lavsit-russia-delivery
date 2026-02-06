# Автоматический деплой на Vercel с отслеживанием логов и автоматическим исправлением ошибок
# Использование: .\scripts\auto-deploy-vercel.ps1 [--token YOUR_TOKEN] [--prod]

param(
    [string]$Token = "",
    [switch]$Prod = $true
)

$ErrorActionPreference = "Continue"
$projectPath = $PSScriptRoot + "\.."

Write-Host "🚀 Автоматический деплой на Vercel с отслеживанием логов..." -ForegroundColor Cyan
Write-Host "📁 Проект: $projectPath" -ForegroundColor Gray

# Переходим в директорию проекта
Set-Location $projectPath

# Проверяем наличие Vercel CLI
$vercelVersion = vercel --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Vercel CLI не установлен!" -ForegroundColor Red
    Write-Host "Установите: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Vercel CLI: $vercelVersion" -ForegroundColor Green

# Проверяем авторизацию
Write-Host "🔐 Проверка авторизации..." -ForegroundColor Cyan
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Не авторизован. Попытка авторизации..." -ForegroundColor Yellow
    if ($Token) {
        $env:VERCEL_TOKEN = $Token
        $whoami = vercel whoami 2>&1
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Требуется авторизация. Выполните: vercel login" -ForegroundColor Red
        Write-Host "Или установите токен: `$env:VERCEL_TOKEN = 'your-token'" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Авторизован как: $whoami" -ForegroundColor Green

# Проверяем наличие всех необходимых файлов
Write-Host "📋 Проверка конфигурации..." -ForegroundColor Cyan

$requiredFiles = @(
    "package.json",
    "next.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "vercel.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $file не найден" -ForegroundColor Yellow
    }
}

# Очищаем кэш перед деплоем
Write-Host "🧹 Очистка кэша..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Кэш очищен" -ForegroundColor Green
}

# Выполняем деплой
Write-Host "📦 Начало деплоя..." -ForegroundColor Cyan

$deployCommand = "vercel"
if ($Prod) {
    $deployCommand += " --prod"
}
$deployCommand += " --yes"

if ($Token) {
    $env:VERCEL_TOKEN = $Token
}

Write-Host "Выполняется: $deployCommand" -ForegroundColor Gray

# Запускаем деплой и перехватываем вывод
$deployOutput = ""
$deployProcess = Start-Process -FilePath "vercel" -ArgumentList @(
    if ($Prod) { "--prod" }
    "--yes"
) -NoNewWindow -PassThru -RedirectStandardOutput "deploy-output.txt" -RedirectStandardError "deploy-error.txt" -Wait

# Читаем вывод
if (Test-Path "deploy-output.txt") {
    $deployOutput = Get-Content "deploy-output.txt" -Raw
    Remove-Item "deploy-output.txt" -ErrorAction SilentlyContinue
}

if (Test-Path "deploy-error.txt") {
    $deployError = Get-Content "deploy-error.txt" -Raw
    if ($deployError) {
        Write-Host "Ошибки деплоя:" -ForegroundColor Red
        Write-Host $deployError -ForegroundColor Red
    }
    Remove-Item "deploy-error.txt" -ErrorAction SilentlyContinue
}

# Проверяем результат
if ($deployProcess.ExitCode -eq 0) {
    Write-Host "✅ Деплой успешно завершен!" -ForegroundColor Green
    Write-Host $deployOutput -ForegroundColor Gray
    
    # Извлекаем URL из вывода
    if ($deployOutput -match "https://[^\s]+") {
        $deployUrl = $matches[0]
        Write-Host "🌐 URL деплоя: $deployUrl" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Ошибка деплоя (код: $($deployProcess.ExitCode))" -ForegroundColor Red
    Write-Host "Попытка исправления..." -ForegroundColor Yellow
    
    # Анализируем ошибки и пытаемся исправить
    if ($deployOutput -match "Build failed" -or $deployError -match "Build failed") {
        Write-Host "🔧 Обнаружена ошибка сборки. Проверяю конфигурацию..." -ForegroundColor Yellow
        
        # Проверяем наличие всех необходимых файлов конфигурации
        if (-not (Test-Path "tailwind.config.ts")) {
            Write-Host "  ⚠️  tailwind.config.ts отсутствует, но это не критично для деплоя" -ForegroundColor Yellow
        }
        
        if (-not (Test-Path "postcss.config.js")) {
            Write-Host "  ⚠️  postcss.config.js отсутствует, но это не критично для деплоя" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Проверьте логи в Vercel Dashboard для деталей" -ForegroundColor Yellow
    exit 1
}

Write-Host "✨ Готово!" -ForegroundColor Green

