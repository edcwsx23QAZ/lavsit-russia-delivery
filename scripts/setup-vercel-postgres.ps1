# Скрипт для автоматической настройки Vercel Postgres и переменных окружения
# Требуется: Vercel CLI установлен и авторизован

Write-Host "🚀 Настройка Vercel Postgres и переменных окружения" -ForegroundColor Green
Write-Host ""

# Проверка авторизации в Vercel
Write-Host "📋 Проверка авторизации в Vercel..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Не авторизован в Vercel. Выполните: vercel login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Авторизован как: $whoami" -ForegroundColor Green
Write-Host ""

# Проверка подключения проекта
Write-Host "📋 Проверка подключения проекта..." -ForegroundColor Yellow
if (-not (Test-Path ".vercel\project.json")) {
    Write-Host "⚠️ Проект не связан с Vercel. Выполняю vercel link..." -ForegroundColor Yellow
    vercel link --yes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка при связывании проекта" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Проект связан с Vercel" -ForegroundColor Green
Write-Host ""

# Чтение информации о проекте
$projectJson = Get-Content ".vercel\project.json" | ConvertFrom-Json
$projectName = $projectJson.projectId
Write-Host "📦 Проект: $projectName" -ForegroundColor Cyan
Write-Host ""

# Проверка существования базы данных Vercel Postgres
Write-Host "📋 Проверка существования Vercel Postgres..." -ForegroundColor Yellow
$databases = vercel postgres ls 2>&1
$dbExists = $databases -match $projectName

if (-not $dbExists) {
    Write-Host "📦 Создание Vercel Postgres базы данных..." -ForegroundColor Yellow
    vercel postgres create "$projectName-db" --region iad
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка при создании базы данных" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ База данных создана" -ForegroundColor Green
} else {
    Write-Host "✅ База данных уже существует" -ForegroundColor Green
}
Write-Host ""

# Получение информации о базе данных
Write-Host "📋 Получение информации о базе данных..." -ForegroundColor Yellow
$dbInfo = vercel postgres inspect "$projectName-db" --format json 2>&1 | ConvertFrom-Json
$connectionString = $dbInfo.Host

if (-not $connectionString) {
    # Попробуем получить через env pull
    Write-Host "📥 Получение переменных окружения из Vercel..." -ForegroundColor Yellow
    vercel env pull .env.vercel --yes
    if (Test-Path ".env.vercel") {
        $envContent = Get-Content ".env.vercel"
        $connectionString = ($envContent | Select-String "POSTGRES_URL" | ForEach-Object { $_.Line -replace 'POSTGRES_URL=', '' -replace '"', '' })
        Remove-Item ".env.vercel" -Force
    }
}

if ($connectionString) {
    Write-Host "✅ Найдена строка подключения" -ForegroundColor Green
} else {
    Write-Host "⚠️ Не удалось автоматически получить строку подключения" -ForegroundColor Yellow
    Write-Host "💡 Вы можете получить её вручную в Vercel Dashboard → Storage → Postgres → Connection String" -ForegroundColor Cyan
}
Write-Host ""

# Функция для добавления переменной окружения
function Add-EnvVar {
    param(
        [string]$Name,
        [string]$Value,
        [string[]]$Environments = @("production", "preview", "development")
    )
    
    Write-Host "🔧 Добавление переменной: $Name" -ForegroundColor Yellow
    
    foreach ($env in $Environments) {
        $result = vercel env add $Name $env "$Value" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Добавлено для $env" -ForegroundColor Green
        } else {
            # Возможно, переменная уже существует
            Write-Host "  ⚠️ Переменная уже существует для $env или произошла ошибка" -ForegroundColor Yellow
        }
    }
}

# Добавление переменных окружения
Write-Host "📝 Настройка переменных окружения..." -ForegroundColor Yellow
Write-Host ""

# DATABASE_URL из Vercel Postgres
if ($connectionString) {
    Add-EnvVar -Name "DATABASE_URL" -Value "$connectionString?sslmode=require"
} else {
    Write-Host "⚠️ DATABASE_URL будет нужно добавить вручную через Vercel Dashboard" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Для остальных переменных окружения используйте Vercel Dashboard:" -ForegroundColor Cyan
Write-Host "   1. Откройте https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   2. Выберите ваш проект" -ForegroundColor White
Write-Host "   3. Перейдите в Settings → Environment Variables" -ForegroundColor White
Write-Host "   4. Добавьте следующие переменные:" -ForegroundColor White
Write-Host ""
Write-Host "   Требуемые переменные:" -ForegroundColor Yellow
Write-Host "   - NEXT_PUBLIC_SUPABASE_URL (если используется Supabase клиент)" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY (если используется Supabase клиент)" -ForegroundColor White
Write-Host "   - KIT_API_TOKEN (опционально)" -ForegroundColor White
Write-Host "   - PEK_LOGIN (если требуется)" -ForegroundColor White
Write-Host "   - PEK_API_KEY (если требуется)" -ForegroundColor White
Write-Host ""

# Выполнение миграций Prisma
Write-Host "📋 Настройка Prisma для работы с Vercel Postgres..." -ForegroundColor Yellow

if ($connectionString) {
    Write-Host "💡 Для выполнения миграций используйте:" -ForegroundColor Cyan
    Write-Host "   1. vercel env pull .env.local" -ForegroundColor White
    Write-Host "   2. npx prisma migrate deploy" -ForegroundColor White
    Write-Host "   3. npx prisma generate" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️ Сначала получите DATABASE_URL из Vercel Dashboard" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Настройка завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Проверьте переменные окружения в Vercel Dashboard" -ForegroundColor White
Write-Host "   2. Выполните миграции Prisma (если требуется)" -ForegroundColor White
Write-Host "   3. Перезапустите деплой в Vercel" -ForegroundColor White
Write-Host ""

