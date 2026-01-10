# Скрипт для добавления переменных окружения в Vercel через API
param(
    [string]$VercelToken = "RnInNokLq4N7UuMfJC5Z2HcZ",
    [string]$ProjectName = "lavsit-russia-delivery"
)

$env:VERCEL_TOKEN = $VercelToken

Write-Host "🔧 Добавление переменных окружения в Vercel проект: $ProjectName" -ForegroundColor Cyan

# Переменные для добавления
$envVars = @(
    @{
        Key = "NEXT_PUBLIC_SUPABASE_URL"
        Value = "https://sirqrnffrpdkdtqiwjgq.supabase.co"
        Environments = @("production", "preview", "development")
    },
    @{
        Key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8"
        Environments = @("production", "preview", "development")
    },
    @{
        Key = "DATABASE_URL"
        Value = "postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public"
        Environments = @("production", "preview", "development")
    }
)

foreach ($envVar in $envVars) {
    Write-Host "`n📝 Добавление переменной: $($envVar.Key)" -ForegroundColor Green
    
    foreach ($env in $envVar.Environments) {
        Write-Host "  → Для окружения: $env" -ForegroundColor Gray
        
        # Используем echo для передачи значения в stdin
        $result = echo $envVar.Value | vercel env add $envVar.Key $env --token $env:VERCEL_TOKEN --yes 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Успешно добавлено для $env" -ForegroundColor Green
        } else {
            # Проверяем, может переменная уже существует
            if ($result -match "already exists" -or $result -match "Environment variable.*already exists") {
                Write-Host "    ⚠ Переменная уже существует для $env, пропускаем" -ForegroundColor Yellow
            } else {
                Write-Host "    ✗ Ошибка: $result" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n✅ Завершено!" -ForegroundColor Green
Write-Host "`n📋 Проверка добавленных переменных:" -ForegroundColor Cyan
vercel env ls --token $env:VERCEL_TOKEN

