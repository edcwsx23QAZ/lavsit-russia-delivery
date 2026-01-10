# Скрипт для добавления недостающих переменных окружения в Vercel
param(
    [string]$VercelToken = "RnInNokLq4N7UuMfJC5Z2HcZ",
    [string]$ProjectName = "lavsit-russia-delivery",
    [string]$TeamId = "narfius-projects"
)

$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type" = "application/json"
}

Write-Host "🔧 Добавление недостающих переменных окружения..." -ForegroundColor Cyan

# Значения из кода (дефолтные, должны быть заменены на реальные)
$envVars = @(
    @{
        Key = "PEK_LOGIN"
        Value = "demo"  # Дефолтное значение из кода, замените на реальный логин
    },
    @{
        Key = "PEK_API_KEY"
        Value = "624FC93CA677B23673BB476D4982294DC27E246F"  # Дефолтное значение из кода
    },
    @{
        Key = "KIT_API_TOKEN"
        Value = ""  # Опционально, оставляем пустым
    }
)

$environments = @("production", "preview", "development")

foreach ($envVar in $envVars) {
    Write-Host "`n📝 Добавление: $($envVar.Key)" -ForegroundColor Green
    
    # Пропускаем пустые значения
    if ([string]::IsNullOrWhiteSpace($envVar.Value) -and $envVar.Key -eq "KIT_API_TOKEN") {
        Write-Host "  ⚠ Пропущено (опционально, значение не указано)" -ForegroundColor Yellow
        continue
    }
    
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
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 409 -or $_.Exception.Message -match "already exists") {
                Write-Host "  ⚠ Уже существует для $env, обновляем..." -ForegroundColor Yellow
                
                # Получаем существующую переменную
                $getUrl = "https://api.vercel.com/v10/projects/$ProjectName/env?teamId=$TeamId"
                $existing = Invoke-RestMethod -Uri $getUrl -Method GET -Headers $headers
                $existingVar = $existing.envs | Where-Object { $_.key -eq $envVar.Key -and $_.target -contains $env }
                
                if ($existingVar) {
                    # Удаляем и создаем заново
                    $deleteUrl = "https://api.vercel.com/v10/projects/$ProjectName/env/$($existingVar.id)?teamId=$TeamId"
                    Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers $headers | Out-Null
                    
                    # Создаем заново
                    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop
                    Write-Host "  ✓ Обновлено для $env" -ForegroundColor Green
                }
            } else {
                Write-Host "  ✗ Ошибка для $env : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n✅ Завершено!" -ForegroundColor Green
Write-Host "`n⚠️ ВАЖНО: Дефолтные значения PEK_LOGIN и PEK_API_KEY должны быть заменены на реальные!" -ForegroundColor Yellow
Write-Host "   Получите реальные значения из личного кабинета ПЭК: https://kabinet.pecom.ru" -ForegroundColor Cyan

Write-Host "`n📋 Проверка добавленных переменных:" -ForegroundColor Cyan
vercel env ls --token $VercelToken

