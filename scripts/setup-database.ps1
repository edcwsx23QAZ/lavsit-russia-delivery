# Скрипт для настройки базы данных Supabase через Prisma
param(
    [string]$DatabasePassword = "edcwsx123QAZ!"
)

Write-Host "🗄️  Настройка базы данных Supabase..." -ForegroundColor Cyan

# Пробуем разные форматы подключения
$connections = @(
    @{
        Name = "Direct Connection (Port 5432)"
        Url = "postgresql://postgres:$([System.Uri]::EscapeDataString($DatabasePassword))@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public"
    },
    @{
        Name = "Connection Pooler (Session Mode - Port 6543)"
        Url = "postgresql://postgres.sirqrnffrpdkdtqiwjgq:$([System.Uri]::EscapeDataString($DatabasePassword))@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
    },
    @{
        Name = "Connection Pooler (Transaction Mode - Port 5432)"
        Url = "postgresql://postgres.sirqrnffrpdkdtqiwjgq:$([System.Uri]::EscapeDataString($DatabasePassword))@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
    }
)

$success = $false

foreach ($conn in $connections) {
    Write-Host "`n🔍 Попытка подключения: $($conn.Name)" -ForegroundColor Yellow
    
    $env:DATABASE_URL = $conn.Url
    
    # Пробуем выполнить db push
    $result = npx prisma db push --accept-data-loss --skip-generate 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Успешно! Используется: $($conn.Name)" -ForegroundColor Green
        Write-Host "   DATABASE_URL: $($conn.Url -replace ':[^:@]*@', ':****@')" -ForegroundColor Gray
        $success = $true
        break
    } else {
        Write-Host "❌ Не удалось подключиться через $($conn.Name)" -ForegroundColor Red
        Write-Host "   Ошибка: $($result | Select-Object -Last 3)" -ForegroundColor Gray
    }
}

if (-not $success) {
    Write-Host "`n⚠️  Автоматическое создание таблиц не удалось." -ForegroundColor Yellow
    Write-Host "`n📋 Альтернативные варианты:" -ForegroundColor Cyan
    Write-Host "1. Создать таблицы вручную через Supabase Dashboard:" -ForegroundColor White
    Write-Host "   - Перейдите: https://supabase.com/dashboard/project/sirqrnffrpdkdtqiwjgq" -ForegroundColor Gray
    Write-Host "   - SQL Editor → Выполните SQL из миграций Prisma" -ForegroundColor Gray
    Write-Host "`n2. Включить прямые подключения в настройках Supabase:" -ForegroundColor White
    Write-Host "   - Settings → Database → Connection Pooling → Проверьте настройки" -ForegroundColor Gray
    Write-Host "`n3. Использовать Connection Pooler URL для production (Vercel):" -ForegroundColor White
    Write-Host "   - Формат: postgresql://postgres.sirqrnffrpdkdtqiwjgq:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -ForegroundColor Gray
} else {
    Write-Host "`n✅ База данных настроена успешно!" -ForegroundColor Green
        Write-Host "   Таблица calculations создана" -ForegroundColor Gray
}

Write-Host ""

