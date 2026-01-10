# Скрипт для добавления переменных окружения в Vercel через REST API
param(
    [string]$VercelToken = "RnInNokLq4N7UuMfJC5Z2HcZ",
    [string]$ProjectName = "lavsit-russia-delivery",
    [string]$TeamId = "narfius-projects"
)

$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type" = "application/json"
}

Write-Host "🔧 Добавление переменных окружения через Vercel API..." -ForegroundColor Cyan

# Переменные для добавления
$envVars = @(
    @{
        Key = "NEXT_PUBLIC_SUPABASE_URL"
        Value = "https://sirqrnffrpdkdtqiwjgq.supabase.co"
    },
    @{
        Key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8"
    },
    @{
        Key = "DATABASE_URL"
        Value = "postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public"
    }
)

$environments = @("production", "preview", "development")

foreach ($envVar in $envVars) {
    Write-Host "`n📝 Добавление: $($envVar.Key)" -ForegroundColor Green
    
    foreach ($env in $environments) {
        try {
            $body = @{
                key = $envVar.Key
                value = $envVar.Value
                type = "encrypted"
                target = @($env)
            } | ConvertTo-Json
            
            $url = "https://api.vercel.com/v10/projects/$ProjectName/env"
            if ($TeamId) {
                $url += "?teamId=$TeamId"
            }
            
            $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop
            
            Write-Host "  ✓ Добавлено для $env" -ForegroundColor Green
        } catch {
            $errorMsg = $_.Exception.Response
            if ($errorMsg -match "already exists" -or $_.Exception.Message -match "409") {
                Write-Host "  ⚠ Уже существует для $env" -ForegroundColor Yellow
            } else {
                Write-Host "  ✗ Ошибка для $env : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n✅ Завершено!" -ForegroundColor Green

