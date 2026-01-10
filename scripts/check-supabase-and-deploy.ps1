# Скрипт для проверки Supabase базы данных и деплоя на Vercel
param(
    [string]$VercelToken = "RnInNokLq4N7UuMfJC5Z2HcZ",
    [string]$SupabaseUrl = "https://sirqrnffrpdkdtqiwjgq.supabase.co",
    [string]$SupabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1NTMyOCwiZXhwIjoyMDc0OTMxMzI4fQ.7FYvM9t_uE5mgIIZ2X-PuJ-qZ3h6IXIvb_uw3QWYO_8"
)

Write-Host "🔍 Проверка подключения к Supabase..." -ForegroundColor Cyan
Write-Host "URL: $SupabaseUrl`n" -ForegroundColor Gray

# Проверка доступности Supabase через REST API
try {
    $headers = @{
        "apikey" = $SupabaseServiceRoleKey
        "Authorization" = "Bearer $SupabaseServiceRoleKey"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✅ Supabase проект доступен!" -ForegroundColor Green
    Write-Host "   Проект ID: sirqrnffrpdkdtqiwjgq" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Не удалось проверить Supabase через REST API: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Это нормально, если база данных еще не создана или требуются дополнительные настройки." -ForegroundColor Yellow
}

Write-Host "`n📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Получите DATABASE_URL из Supabase Dashboard:" -ForegroundColor White
Write-Host "   - Перейдите: $SupabaseUrl" -ForegroundColor Gray
Write-Host "   - Settings → Database → Connection string → URI" -ForegroundColor Gray
Write-Host "   - Формат: postgresql://postgres:[PASSWORD]@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public" -ForegroundColor Gray
Write-Host "`n2. Добавьте переменные в Vercel:" -ForegroundColor White
Write-Host "   - Используйте Vercel CLI: vercel env add [VAR_NAME] [ENV]" -ForegroundColor Gray
Write-Host "   - Или через Dashboard: https://vercel.com/dashboard" -ForegroundColor Gray

Write-Host "`n🔧 Настройка переменных окружения в Vercel..." -ForegroundColor Cyan

# Устанавливаем токен Vercel
$env:VERCEL_TOKEN = $VercelToken

# Переменные для добавления
$envVars = @{
    "NEXT_PUBLIC_SUPABASE_URL" = $SupabaseUrl
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8"
}

Write-Host "`n⚠️  Примечание: Для добавления переменных через CLI требуется интерактивный режим." -ForegroundColor Yellow
Write-Host "   Рекомендуется использовать Vercel Dashboard или выполнить команды вручную:`n" -ForegroundColor Yellow

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "Добавить переменную: $key" -ForegroundColor Green
    Write-Host "  vercel env add $key production" -ForegroundColor Gray
    Write-Host "  vercel env add $key preview" -ForegroundColor Gray
    Write-Host "  vercel env add $key development" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✅ Скрипт завершен!" -ForegroundColor Green

