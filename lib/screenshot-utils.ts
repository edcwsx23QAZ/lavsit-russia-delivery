import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  quality?: number;
}

export async function createPageScreenshot(
  html: string, 
  options: ScreenshotOptions = {}
): Promise<string> {
  const {
    width = 1920,
    height = 1080,
    fullPage = true,
    quality = 90
  } = options;

  let browser: Browser | null = null;
  
  try {
    console.log('📸 Creating screenshot with Puppeteer...');
    
    // Запуск браузера с настройками для сервера
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page: Page = await browser.newPage();
    
    // Установка размеров viewport
    await page.setViewport({ width, height });
    
    // Установка контента HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Ожидание загрузки всех стилей и изображений
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Создание скриншота в base64
    const screenshot = await page.screenshot({
      fullPage,
      quality,
      type: 'jpeg',
      encoding: 'base64'
    });

    // Формирование data URL
    const dataUrl = `data:image/jpeg;base64,${screenshot}`;
    
    console.log('✅ Screenshot created successfully');
    return dataUrl;

  } catch (error) {
    console.error('❌ Error creating screenshot:', error);
    throw new Error(`Screenshot creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function createCalculationScreenshot(
  formData: any, 
  calculations: any[],
  enabledCompanies: Record<string, boolean>
): Promise<string> {
  // Генерация HTML для скриншота
  const html = generateCalculationHTML(formData, calculations, enabledCompanies);
  
  return createPageScreenshot(html, {
    width: 1920,
    height: 2000, // Увеличенная высота для длинной страницы
    fullPage: true,
    quality: 85
  });
}

function generateCalculationHTML(
  formData: any, 
  calculations: any[], 
  enabledCompanies: Record<string, boolean>
): string {
  const currentDate = new Date().toLocaleString('ru-RU');
  
  // Форматирование данных формы
  const formatFormData = () => {
    const items: string[] = [];
    
    items.push(`📍 Маршрут: ${formData.fromCity} → ${formData.toCity}`);
    
    if (formData.fromAddress) {
      items.push(`🏠 Адрес отправления: ${formData.fromAddress}`);
    }
    
    if (formData.toAddress) {
      items.push(`🏠 Адрес назначения: ${formData.toAddress}`);
    }
    
    // Информация о грузах
    items.push(`📦 Грузы (${formData.cargos.length} шт.):`);
    formData.cargos.forEach((cargo: any, index: number) => {
      items.push(`   ${index + 1}. ${cargo.length}×${cargo.width}×${cargo.height} см, ${cargo.weight} кг`);
    });
    
    // Дополнительные услуги
    const services: string[] = [];
    if (formData.needPackaging) services.push('Упаковка');
    if (formData.needLoading) services.push('Погрузка');
    if (formData.needCarry) services.push('Переноска');
    if (formData.needInsurance) services.push(`Страхование (${formData.declaredValue}₽)`);
    
    if (services.length > 0) {
      items.push(`🔧 Услуги: ${services.join(', ')}`);
    }
    
    return items.join('\n');
  };
  
  // Форматирование результатов расчета
  const formatCalculations = () => {
    const validCalculations = calculations.filter(calc => 
      calc.price > 0 && enabledCompanies[calc.company.toLowerCase().replace(/\s+/g, '')]
    );
    
    if (validCalculations.length === 0) {
      return '<p style="color: #666;">Нет доступных расчетов</p>';
    }
    
    // Сортировка по цене
    validCalculations.sort((a, b) => a.price - b.price);
    
    return validCalculations.map(calc => `
      <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">
          ${calc.company} - ${calc.price.toLocaleString('ru-RU')} ₽
        </h3>
        <p style="margin: 5px 0; color: #666;">
          📅 Срок доставки: ${calc.days} дней
        </p>
        ${calc.error ? `<p style="margin: 5px 0; color: #d32f2f;">❌ ${calc.error}</p>` : ''}
      </div>
    `).join('');
  };
  
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Расчет доставки</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #f9f9f9;
        }
        .header {
          background: #2196f3;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }
        .section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .form-data {
          white-space: pre-line;
          font-family: monospace;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          border-left: 4px solid #2196f3;
        }
        .timestamp {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚛 Расчет стоимости доставки</h1>
        <div class="timestamp">${currentDate}</div>
      </div>
      
      <div class="section">
        <h2>📋 Введенные данные</h2>
        <div class="form-data">${formatFormData()}</div>
      </div>
      
      <div class="section">
        <h2>💰 Результаты расчета</h2>
        ${formatCalculations()}
      </div>
      
      <div class="timestamp">
        Расчет сохранен в системе доставки
      </div>
    </body>
    </html>
  `;
}