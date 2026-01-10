# Скрипт для добавления переменных окружения в Vercel
# Используется токен Vercel через переменную окружения VERCEL_TOKEN

param(
    [string]$VercelToken = "RnInNokLq4N7UuMfJC5Z2HcZ"
)

Write-Host "🔧 Настройка переменных окружения в Vercel..." -ForegroundColor Cyan

# Устанавливаем токен
$env:VERCEL_TOKEN = $VercelToken

# Получаем информацию о проекте
Write-Host "`n📋 Переменные окружения для добавления:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Green
Write-Host "   Значение: https://sirqrnffrpdkdtqiwjgq.supabase.co" -ForegroundColor Gray
Write-Host ""
Write-Host "2. NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Green
Write-Host "   Значение: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8" -ForegroundColor Gray
Write-Host ""
Write-Host "3. DATABASE_URL (важно!)" -ForegroundColor Green
Write-Host "   Формат: postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public" -ForegroundColor Gray
Write-Host "   Или Connection Pooler: postgresql://postgres.sirqrnffrpdkdtqiwjgq:edcwsx123QAZ!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  Для добавления переменных выполните команды вручную:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Сначала войдите в Vercel (если еще не вошли):" -ForegroundColor Cyan
Write-Host "vercel login" -ForegroundColor White
Write-Host ""
Write-Host "# Затем добавьте переменные для каждого окружения:" -ForegroundColor Cyan
Write-Host 'vercel env add NEXT_PUBLIC_SUPABASE_URL production' -ForegroundColor White
Write-Host 'vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production' -ForegroundColor White
Write-Host 'vercel env add DATABASE_URL production' -ForegroundColor White
Write-Host ""
Write-Host "# Повторите для preview и development окружений" -ForegroundColor Gray
Write-Host ""

Write-Host "Или используйте Vercel Dashboard:" -ForegroundColor Cyan
Write-Host "https://vercel.com/dashboard → Ваш проект → Settings → Environment Variables" -ForegroundColor White
Write-Host ""

