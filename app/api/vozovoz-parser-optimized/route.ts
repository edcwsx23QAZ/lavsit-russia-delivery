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

// Оптимизированный реальный парсер
async function parseVozovozWebsiteOptimized(params: VozovozParserParams): Promise<ParsedResult> {
  const startTime = Date.now();
  let browser;
  
  try {
    console.log('🕷️ Запуск оптимизированного парсера Vozovoz...');
    
    // Оптимизированные настройки браузера
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ],
      defaultViewport: {
        width: 1280,
        height: 800
      }
    });

    const page = await browser.newPage();
    
    // Оптимизация производительности
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Блокируем ненужные ресурсы для ускорения
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Установка user-agent
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📍 Переход на сайт Vozovoz...');
    
    // Быстрая загрузка страницы
    await page.goto('https://vozovoz.ru/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    console.log('✅ Сайт загружен');

    // Быстрый поиск и клик по кнопке входа
    console.log('🔍 Поиск кнопки входа...');
    
    const loginClicked = await page.evaluate(() => {
      // Ищем кнопку входа по тексту
      const buttons = Array.from(document.querySelectorAll('a, button'));
      const loginBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('личный') || text.includes('кабинет') || text.includes('войти');
      });
      
      if (loginBtn) {
        (loginBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!loginClicked) {
      throw new Error('Кнопка входа не найдена');
    }

    console.log('✅ Кнопка входа нажата');
    
    // Короткое ожидание загрузки формы
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Быстрый ввод данных авторизации
    console.log('🔐 Ввод данных авторизации...');
    
    await page.evaluate(() => {
      // Ввод телефона
      const phoneInputs = Array.from(document.querySelectorAll('input[type="tel"], input[name*="phone"], input[placeholder*="телефон"]'));
      if (phoneInputs.length > 0) {
        const phoneInput = phoneInputs[0] as HTMLInputElement;
        phoneInput.value = '79015199496';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Ввод пароля
      const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
      if (passwordInputs.length > 0) {
        const passwordInput = passwordInputs[0] as HTMLInputElement;
        passwordInput.value = 'LAv$it_2o21';
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Нажатие кнопки входа
    const loginSubmitClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('войти') || text.includes('далее') || text.includes('вход');
      });
      
      if (submitBtn) {
        (submitBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!loginSubmitClicked) {
      throw new Error('Кнопка входа не найдена');
    }

    console.log('✅ Данные авторизации отправлены');
    
    // Ожидание загрузки после авторизации
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Переход к оформлению заказа
    console.log('📋 Поиск кнопки оформления заказа...');
    
    const orderClicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const orderLink = links.find(link => {
        const text = link.textContent?.toLowerCase() || '';
        return text.includes('оформить') || text.includes('заказ') || text.includes('расчет');
      });
      
      if (orderLink) {
        (orderLink as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!orderClicked) {
      throw new Error('Кнопка оформления заказа не найдена');
    }

    console.log('✅ Переход к оформлению заказа');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Быстрое заполнение формы
    console.log('📝 Заполнение формы расчета...');
    
    const formFilled = await page.evaluate((params) => {
      // Заполнение города отправления
      const fromInputs = Array.from(document.querySelectorAll('input[placeholder*="отправ"], input[name*="from"], input[placeholder*="Отправка"]'));
      if (fromInputs.length > 0) {
        const fromInput = fromInputs[0] as HTMLInputElement;
        fromInput.value = params.fromCity;
        fromInput.dispatchEvent(new Event('input', { bubbles: true }));
        fromInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Заполнение города назначения
      const toInputs = Array.from(document.querySelectorAll('input[placeholder*="назнач"], input[name*="to"], input[placeholder*="Прибытие"]'));
      if (toInputs.length > 0) {
        const toInput = toInputs[0] as HTMLInputElement;
        toInput.value = params.toCity;
        toInput.dispatchEvent(new Event('input', { bubbles: true }));
        toInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return true;
    }, params);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Выбор типа доставки
    console.log('🚚 Выбор типа доставки...');
    
    await page.evaluate((params) => {
      // Выбор типа для отправления
      if (!params.fromAddressDelivery) {
        const terminalLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('терминал') && text.includes('отправ');
        });
        if (terminalLabels.length > 0) {
          (terminalLabels[0] as HTMLElement).click();
        }
      }

      // Выбор типа для назначения
      if (params.toAddressDelivery) {
        const addressLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('адрес') && text.includes('назнач');
        });
        if (addressLabels.length > 0) {
          (addressLabels[0] as HTMLElement).click();
        }
      } else {
        const terminalLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('терминал') && text.includes('назнач');
        });
        if (terminalLabels.length > 0) {
          (terminalLabels[0] as HTMLElement).click();
        }
      }
    }, params);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Заполнение адреса если нужно
    if (params.toAddressDelivery && params.toAddress) {
      await page.evaluate((address) => {
        const addressInputs = Array.from(document.querySelectorAll('input[placeholder*="адрес"], input[name*="address"]'));
        if (addressInputs.length > 0) {
          const addressInput = addressInputs[0] as HTMLInputElement;
          addressInput.value = address;
          addressInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, params.toAddress);
    }

    // Заполнение параметров груза
    console.log('📦 Заполнение параметров груза...');
    
    await page.evaluate((params) => {
      // Выбор "Места"
      const placesLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('места') || text.includes('мест');
      });
      if (placesLabels.length > 0) {
        (placesLabels[0] as HTMLElement).click();
      }

      // Заполнение габаритов
      const lengthInputs = Array.from(document.querySelectorAll('input[name*="length"], input[placeholder*="длин"]'));
      if (lengthInputs.length > 0) {
        (lengthInputs[0] as HTMLInputElement).value = params.length.toString();
      }

      const widthInputs = Array.from(document.querySelectorAll('input[name*="width"], input[placeholder*="ширин"]'));
      if (widthInputs.length > 0) {
        (widthInputs[0] as HTMLInputElement).value = params.width.toString();
      }

      const heightInputs = Array.from(document.querySelectorAll('input[name*="height"], input[placeholder*="высот"]'));
      if (heightInputs.length > 0) {
        (heightInputs[0] as HTMLInputElement).value = params.height.toString();
      }

      const weightInputs = Array.from(document.querySelectorAll('input[name*="weight"], input[placeholder*="вес"]'));
      if (weightInputs.length > 0) {
        (weightInputs[0] as HTMLInputElement).value = params.weight.toString();
      }
    }, params);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ожидание появления результатов
    console.log('⏳ Ожидание результатов расчета...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Парсинг результатов
    console.log('📊 Парсинг результатов...');
    
    const results = await page.evaluate(() => {
      const result: any = {
        totalCost: 0,
        services: [],
        deliveryTime: null,
        warnings: []
      };

      // Поиск общей стоимости
      const totalElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Итого:') || text.includes('Всего:') || text.includes('Стоимость');
      });

      for (const element of totalElements) {
        const text = element.textContent || '';
        const priceMatch = text.match(/(\d[\s\d]*\d+)\s*₽/);
        if (priceMatch) {
          result.totalCost = parseInt(priceMatch[1].replace(/\s/g, ''));
          break;
        }
      }

      // Поиск услуг
      const serviceElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('₽') && (
          text.includes('Платный въезд') ||
          text.includes('Перевозка между городами') ||
          text.includes('Страхование') ||
          text.includes('Складская обработка') ||
          text.includes('Отвоз груза') ||
          text.includes('Скидка')
        );
      });

      serviceElements.forEach(element => {
        const text = element.textContent || '';
        const priceMatch = text.match(/(\d[\s\d]*\d+)\s*₽/);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/\s/g, ''));
          const name = text.replace(priceMatch[0], '').trim();
          
          if (name && price > 0) {
            result.services.push({ name, price });
          }
        }
      });

      // Поиск сроков доставки
      const timeElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('дней') || text.includes('дня') || text.includes('день');
      });

      for (const element of timeElements) {
        const text = element.textContent || '';
        if (text.includes('дней') || text.includes('дня') || text.includes('день')) {
          result.deliveryTime = text.trim();
          break;
        }
      }

      return result;
    });

    const parseTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('✅ Парсинг завершен');
    console.log('💰 Найдена стоимость:', results.totalCost);
    console.log('📦 Найдено услуг:', results.services.length);

    return {
      totalCost: results.totalCost,
      services: results.services,
      deliveryTime: results.deliveryTime,
      warnings: results.warnings,
      parseTime: parseFloat(parseTime)
    };

  } catch (error: any) {
    console.error('❌ Ошибка при парсинге Vozovoz:', error);
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
    
    console.log('🕷️ Запуск оптимизированного парсера Vozovoz с параметрами:', JSON.stringify(body, null, 2));

    // Валидация
    const requiredFields = ['fromCity', 'toCity', 'length', 'width', 'height', 'weight'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Отсутствует обязательное поле: ${field}`
        }, { status: 400 });
      }
    }

    console.log('🚀 Запуск оптимизированного реального парсера...');
    
    // Запуск оптимизированного реального парсера
    const result = await parseVozovozWebsiteOptimized(body as VozovozParserParams);

    console.log('✅ Оптимизированный парсер завершил работу успешно');
    console.log('💰 Итоговая стоимость:', result.totalCost);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Критическая ошибка оптимизированного парсера:', error);
    
    return NextResponse.json({
      error: error.message || 'Внутренняя ошибка парсера',
      details: error.stack
    }, { status: 500 });
  }
}