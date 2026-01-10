# Скрипт автоматической настройки Vercel Postgres и переменных окружения
# Использует Vercel API напрямую

$VERCEL_TOKEN = "MQgfqaoPbFm4l67PpgbiJkmc"
$PROJECT_NAME = "lavsit-russia-delivery"
$TEAM_ID = "narfius-projects"

Write-Host "🚀 Настройка Vercel Postgres и переменных окружения" -ForegroundColor Green
Write-Host ""

# Функция для вызова Vercel API
function Invoke-VercelAPI {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $headers = @{
        "Authorization" = "Bearer $VERCEL_TOKEN"
        "Content-Type" = "application/json"
    }
    
    $uri = "https://api.vercel.com$Endpoint"
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json)
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        return $response
    } catch {
        Write-Host "❌ Ошибка API: $_" -ForegroundColor Red
        return $null
    }
}

# Получение информации о проекте
Write-Host "📋 Получение информации о проекте..." -ForegroundColor Yellow
$project = Invoke-VercelAPI -Endpoint "/v9/projects/$PROJECT_NAME?teamId=$TEAM_ID"

if (-not $project) {
    Write-Host "❌ Проект не найден" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Проект найден: $($project.name)" -ForegroundColor Green
Write-Host ""

# Получение списка баз данных
Write-Host "📋 Проверка существующих баз данных..." -ForegroundColor Yellow
$databases = Invoke-VercelAPI -Endpoint "/v1/storage?teamId=$TEAM_ID"

if ($databases) {
    Write-Host "Найдено баз данных: $($databases.Count)" -ForegroundColor Cyan
    foreach ($db in $databases) {
        Write-Host "  - $($db.name)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "💡 Для создания Vercel Postgres базы данных:" -ForegroundColor Cyan
Write-Host "   1. Откройте https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   2. Выберите проект: $PROJECT_NAME" -ForegroundColor White
Write-Host "   3. Перейдите в Storage → Create Database → Postgres" -ForegroundColor White
Write-Host "   4. Имя: lavsit-russia-delivery-db" -ForegroundColor White
Write-Host "   5. Регион: iad (US East)" -ForegroundColor White
Write-Host ""

# Получение текущих переменных окружения
Write-Host "📋 Текущие переменные окружения:" -ForegroundColor Yellow
$envVars = Invoke-VercelAPI -Endpoint "/v9/projects/$PROJECT_NAME/env?teamId=$TEAM_ID"

if ($envVars -and $envVars.envs) {
    foreach ($envVar in $envVars.envs) {
        $value = if ($envVar.value) { "***" } else { "(не установлено)" }
        Write-Host "  - $($envVar.key): $value" -ForegroundColor White
    }
} else {
    Write-Host "  Нет переменных окружения" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📝 Инструкции по добавлению переменных окружения:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Используйте следующие команды для добавления переменных:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# DATABASE_URL (после создания Postgres базы данных)" -ForegroundColor White
Write-Host "vercel env add DATABASE_URL production --token $VERCEL_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "# NEXT_PUBLIC_SUPABASE_URL (если используется Supabase клиент)" -ForegroundColor White
Write-Host "vercel env add NEXT_PUBLIC_SUPABASE_URL production --token $VERCEL_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "# NEXT_PUBLIC_SUPABASE_ANON_KEY (если используется Supabase клиент)" -ForegroundColor White
Write-Host "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token $VERCEL_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "# KIT_API_TOKEN (опционально)" -ForegroundColor White
Write-Host "vercel env add KIT_API_TOKEN production --token $VERCEL_TOKEN" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Скрипт завершен" -ForegroundColor Green

