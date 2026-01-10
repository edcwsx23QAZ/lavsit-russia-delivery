# Скрипт для настройки переменных окружения в Vercel через API
# Использует токен Vercel для аутентификации

param(
    [string]$VercelToken = "RnInNokLq4N7UuMfJC5Z2HcZ",
    [string]$ProjectName = "lavsit-russia-delivery-1763017917119"
)

# Получаем имя проекта из Vercel или используем значение по умолчанию
Write-Host "🔧 Настройка переменных окружения для проекта: $ProjectName" -ForegroundColor Cyan

# Переменные окружения Supabase
$envVars = @{
    "NEXT_PUBLIC_SUPABASE_URL" = "https://sirqrnffrpdkdtqiwjgq.supabase.co"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8"
    "SUPABASE_SERVICE_ROLE_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1NTMyOCwiZXhwIjoyMDc0OTMxMzI4fQ.7FYvM9t_uE5mgIIZ2X-PuJ-qZ3h6IXIvb_uw3QWYO_8"
}

Write-Host "`n📝 Примечание: DATABASE_URL нужно добавить вручную через Vercel Dashboard" -ForegroundColor Yellow
Write-Host "   Формат: postgresql://postgres:[PASSWORD]@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public" -ForegroundColor Yellow
Write-Host "   Получить пароль можно в Supabase Dashboard → Settings → Database → Database Password`n" -ForegroundColor Yellow

# Используем Vercel CLI для добавления переменных
Write-Host "🔑 Используем Vercel CLI для настройки переменных..." -ForegroundColor Cyan

foreach ($key in $envVars.Keys) {
    Write-Host "`nДобавляем переменную: $key" -ForegroundColor Green
    
    # Добавляем для всех окружений (production, preview, development)
    $environments = @("production", "preview", "development")
    
    foreach ($env in $environments) {
        Write-Host "  → Устанавливаем для $env..." -ForegroundColor Gray
        # Используем Vercel CLI для добавления переменных
        $value = $envVars[$key]
        
        # Экранируем значение для PowerShell
        $escapedValue = $value -replace '"', '""'
        
        # Используем echo для передачи значения в vercel env add
        $value | vercel env add $key $env --yes 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Успешно установлено для $env" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Ошибка или переменная уже существует для $env" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✅ Настройка переменных завершена!" -ForegroundColor Green
Write-Host "`n⚠ Важно: Не забудьте добавить DATABASE_URL вручную через Vercel Dashboard" -ForegroundColor Yellow
Write-Host "   Перейдите: https://vercel.com/dashboard → Ваш проект → Settings → Environment Variables" -ForegroundColor Cyan

