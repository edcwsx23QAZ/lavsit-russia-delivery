import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface VozovozParserParams {
  fromCity: string;
  toCity: string;
  fromAddressDelivery: boolean;
  toAddressDelivery: boolean;
  fromAddress?: string;
  toAddress?: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  needInsurance: boolean;
  declaredValue?: number;
  needPackaging: boolean;
  needLoading: boolean;
  hasFreightElevator: boolean;
  floor: number;
}

interface ParsedResult {
  totalCost: number;
  services: ServiceItem[];
  deliveryTime?: string;
  warnings?: string[];
  parseTime?: number;
}

interface ServiceItem {
  name: string;
  basePrice?: number;
  price: number;
  discount?: number;
}

// Упрощенная версия для отладки
async function parseVozovozWebsiteSimple(params: VozovozParserParams): Promise<ParsedResult> {
  const startTime = Date.now();
  let browser;
  
  try {
    console.log('🕷️ Запуск браузера...');
    
    // Запуск браузера с упрощенными настройками
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Установка user-agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log('📍 Переход на сайт Vozovoz...');
    
    // Переход на сайт
    await page.goto('https://vozovoz.ru/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    console.log('✅ Сайт загружен успешно');
    
    // Делаем скриншот для отладки
    const screenshot = await page.screenshot({ encoding: 'base64' });
    console.log('📸 Скриншот сделан, длина:', screenshot.length);
    
    // Ищем кнопку входа
    console.log('🔍 Поиск кнопки входа...');
    
    const loginSelectors = [
      'a[href*="login"]',
      'button:contains("Личный кабинет")',
      '.login-button',
      '[data-testid="login-button"]',
      'a:contains("Войти")'
    ];

    let loginFound = false;
    for (const selector of loginSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Найден элемент входа: ${selector}`);
          await element.click();
          loginFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!loginFound) {
      // Ищем по тексту
      console.log('🔍 Поиск по тексту...');
      const loginFoundByText = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button'));
        const loginBtn = buttons.find(btn => 
          btn.textContent?.includes('Личный') || 
          btn.textContent?.includes('Войти') ||
          btn.textContent?.includes('Кабинет')
        );
        if (loginBtn) {
          (loginBtn as HTMLElement).click();
          return true;
        }
        return false;
      });
      
      if (!loginFoundByText) {
        throw new Error('Кнопка входа не найдена');
      }
    }

    console.log('✅ Кнопка входа нажата');
    
    // Ожидание формы авторизации
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Делаем скриншот формы входа
    const loginScreenshot = await page.screenshot({ encoding: 'base64' });
    console.log('📸 Скриншот формы входа сделан');

    // Возвращаем тестовый результат для отладки
    const parseTime = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      totalCost: 10956,
      services: [
        { name: 'Платный въезд (отправитель)', price: 100 },
        { name: 'Перевозка между городами', price: 7028 },
        { name: 'Страхование груза без объявленной стоимости', price: 149 },
        { name: 'Складская обработка', price: 1043 },
        { name: 'Отвоз груза клиенту', price: 2370 }
      ],
      deliveryTime: '1-2 дня',
      warnings: ['Тестовый режим - упрощенная версия'],
      parseTime: parseFloat(parseTime)
    };

  } catch (error: any) {
    console.error('❌ Ошибка при парсинге:', error);
    throw new Error(`Ошибка парсера: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Браузер закрыт');
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🕷️ Получен запрос на парсинг Vozovoz:', JSON.stringify(body, null, 2));

    // Валидация
    const requiredFields = ['fromCity', 'toCity', 'length', 'width', 'height', 'weight'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Отсутствует обязательное поле: ${field}`
        }, { status: 400 });
      }
    }

    console.log('🚀 Запуск упрощенного парсера...');
    
    // Запуск упрощенного парсера
    const result = await parseVozovozWebsiteSimple(body as VozovozParserParams);

    console.log('✅ Парсер завершил работу успешно');
    console.log('💰 Итоговая стоимость:', result.totalCost);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Критическая ошибка парсера:', error);
    
    return NextResponse.json({
      error: error.message || 'Внутренняя ошибка парсера',
      details: error.stack
    }, { status: 500 });
  }
}