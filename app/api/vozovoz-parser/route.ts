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

interface ServiceItem {
  name: string;
  basePrice?: number;
  price: number;
  discount?: number;
}

interface ParsedResult {
  totalCost: number;
  services: ServiceItem[];
  deliveryTime?: string;
  warnings?: string[];
  parseTime?: number;
}

// Функция для парсинга цены из строки
function parsePrice(priceText: string): number {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/[^\d]/g, '');
  return parseInt(cleaned) || 0;
}

// Функция для ожидания элемента с таймаутом
async function waitForSelectorWithTimeout(page: any, selector: string, timeout: number = 30000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.error(`Элемент не найден: ${selector}`, error);
    return false;
  }
}

// Основная функция парсинга
async function parseVozovozWebsite(params: VozovozParserParams): Promise<ParsedResult> {
  const startTime = Date.now();
  let browser;
  
  try {
    // Запуск браузера с настройками для обхода детекции
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Установка user-agent и viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('🕷️ Запуск парсера Vozovoz...');

    // Шаг 1: Переход на сайт
    console.log('📍 Переход на сайт...');
    await page.goto('https://vozovoz.ru/', { waitUntil: 'networkidle2' });

    // Шаг 2: Авторизация
    console.log('🔐 Авторизация...');
    
    // Ищем кнопку "Личный кабинет"
    const loginButtonSelectors = [
      'a[href*="login"]',
      'button:contains("Личный кабинет")',
      '.login-button',
      '[data-testid="login-button"]',
      'a:contains("Войти")'
    ];

    let loginButtonFound = false;
    for (const selector of loginButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        loginButtonFound = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loginButtonFound) {
      // Пробуем найти по тексту
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button'));
        const loginBtn = buttons.find(btn => 
          btn.textContent?.includes('Личный') || 
          btn.textContent?.includes('Войти') ||
          btn.textContent?.includes('Кабинет')
        );
        if (loginBtn) (loginBtn as HTMLElement).click();
      });
    }

    // Ожидание формы авторизации
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ввод логина
    const phoneSelectors = [
      'input[name="phone"]',
      'input[type="tel"]',
      'input[placeholder*="телефон"]',
      'input[placeholder*="phone"]',
      '[data-testid="phone-input"]'
    ];

    for (const selector of phoneSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.type(selector, '79015199496', { delay: 100 });
        break;
      } catch (e) {
        continue;
      }
    }

    // Нажатие кнопки "Далее"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(btn => 
        btn.textContent?.includes('Далее') ||
        btn.textContent?.includes('Next')
      );
      if (nextBtn) (nextBtn as HTMLElement).click();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ввод пароля
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '[data-testid="password-input"]'
    ];

    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.type(selector, 'LAv$it_2o21', { delay: 100 });
        break;
      } catch (e) {
        continue;
      }
    }

    // Нажатие кнопки "Войти"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(btn => 
        btn.textContent?.includes('Войти') ||
        btn.textContent?.includes('Вход')
      );
      if (loginBtn) (loginBtn as HTMLElement).click();
    });

    // Ожидание загрузки после авторизации
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Шаг 3: Переход к оформлению заказа
    console.log('📋 Переход к оформлению заказа...');
    
    const orderButtonSelectors = [
      'a[href*="order"]',
      'button:contains("Оформить заказ")',
      '.order-button',
      '[data-testid="create-order"]'
    ];

    for (const selector of orderButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        break;
      } catch (e) {
        continue;
      }
    }

    // Если не нашли, ищем по тексту
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const orderLink = links.find(link => 
        link.textContent?.includes('Оформить') ||
        link.textContent?.includes('Заказ')
      );
      if (orderLink) (orderLink as HTMLElement).click();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Шаг 4: Заполнение формы расчета
    console.log('📝 Заполнение формы расчета...');

    // Заполнение города отправления
    const fromCitySelectors = [
      'input[name="from"]',
      'input[placeholder*="Отправка"]',
      'input[placeholder*="отправления"]',
      '[data-testid="dispatch-city"]'
    ];

    for (const selector of fromCitySelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.type(selector, params.fromCity, { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.keyboard.press('Enter');
        break;
      } catch (e) {
        continue;
      }
    }

    // Заполнение города назначения
    const toCitySelectors = [
      'input[name="to"]',
      'input[placeholder*="Прибытие"]',
      'input[placeholder*="назначения"]',
      '[data-testid="destination-city"]'
    ];

    for (const selector of toCitySelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.type(selector, params.toCity, { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.keyboard.press('Enter');
        break;
      } catch (e) {
        continue;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Выбор типа доставки для отправления
    if (params.fromAddressDelivery) {
      // Выбор "Адрес"
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, span, div'));
        const addressLabel = labels.find(label => 
          label.textContent?.includes('Адрес') && 
          label.textContent?.includes('Отправка')
        );
        if (addressLabel) (addressLabel as HTMLElement).click();
      });

      // Заполнение адреса отправления
      if (params.fromAddress) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fromAddressSelectors = [
          'input[placeholder*="адрес"]',
          'input[name="from_address"]',
          '[data-testid="dispatch-address-input"]'
        ];

        for (const selector of fromAddressSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.type(selector, params.fromAddress!, { delay: 100 });
            break;
          } catch (e) {
            continue;
          }
        }
      }
    } else {
      // Выбор "Терминал"
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, span, div'));
        const terminalLabel = labels.find(label => 
          label.textContent?.includes('Терминал') && 
          label.textContent?.includes('Отправка')
        );
        if (terminalLabel) (terminalLabel as HTMLElement).click();
      });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Выбор типа доставки для назначения
    if (params.toAddressDelivery) {
      // Выбор "Адрес"
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, span, div'));
        const addressLabel = labels.find(label => 
          label.textContent?.includes('Адрес') && 
          label.textContent?.includes('Назначение')
        );
        if (addressLabel) (addressLabel as HTMLElement).click();
      });

      // Заполнение адреса назначения
      if (params.toAddress) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const toAddressSelectors = [
          'input[placeholder*="адрес"]',
          'input[name="to_address"]',
          '[data-testid="destination-address-input"]'
        ];

        for (const selector of toAddressSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.type(selector, params.toAddress!, { delay: 100 });
            break;
          } catch (e) {
            continue;
          }
        }
      }
    } else {
      // Выбор "Терминал"
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, span, div'));
        const terminalLabel = labels.find(label => 
          label.textContent?.includes('Терминал') && 
          label.textContent?.includes('Назначение')
        );
        if (terminalLabel) (terminalLabel as HTMLElement).click();
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Шаг 5: Заполнение параметров груза
    console.log('📦 Заполнение параметров груза...');

    // Выбор "Места"
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label, span, div'));
      const placesLabel = labels.find(label => 
        label.textContent?.includes('Места')
      );
      if (placesLabel) (placesLabel as HTMLElement).click();
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Заполнение габаритов
    const dimensionSelectors = {
      length: ['input[name="length"]', 'input[placeholder*="длин"]', '[data-testid="cargo-length"]'],
      width: ['input[name="width"]', 'input[placeholder*="ширин"]', '[data-testid="cargo-width"]'],
      height: ['input[name="height"]', 'input[placeholder*="высот"]', '[data-testid="cargo-height"]'],
      weight: ['input[name="weight"]', 'input[placeholder*="вес"]', '[data-testid="cargo-weight"]']
    };

    const dimensions = {
      length: params.length,
      width: params.width,
      height: params.height,
      weight: params.weight
    };

    for (const [dim, selectors] of Object.entries(dimensionSelectors)) {
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          await page.type(selector, dimensions[dim as keyof typeof dimensions].toString(), { delay: 50 });
          break;
        } catch (e) {
          continue;
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Шаг 6: Дополнительные услуги
    console.log('🛡️ Настройка дополнительных услуг...');

    // Страхование
    if (params.needInsurance && params.declaredValue && params.declaredValue > 0) {
      await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const insuranceCheckbox = checkboxes.find(cb => 
          cb.parentElement?.textContent?.includes('страх') ||
          cb.parentElement?.textContent?.includes('Страх')
        );
        if (insuranceCheckbox) (insuranceCheckbox as HTMLElement).click();
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ввод объявленной стоимости
      const insuranceValueSelectors = [
        'input[name="insurance_value"]',
        'input[placeholder*="стоимость"]',
        'input[placeholder*="сумма"]'
      ];

      for (const selector of insuranceValueSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.type(selector, params.declaredValue!.toString(), { delay: 100 });
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // Упаковка
    if (params.needPackaging) {
      await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const packagingCheckbox = checkboxes.find(cb => 
          cb.parentElement?.textContent?.includes('упаковк') ||
          cb.parentElement?.textContent?.includes('Упаков')
        );
        if (packagingCheckbox) (packagingCheckbox as HTMLElement).click();
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Выбор типа упаковки "защитная упаковка + фото"
      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('option, label, div'));
        const protectiveOption = options.find(opt => 
          opt.textContent?.includes('защитная') &&
          opt.textContent?.includes('фото')
        );
        if (protectiveOption) (protectiveOption as HTMLElement).click();
      });
    }

    // Погрузка/разгрузка
    if (params.needLoading) {
      await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const loadingCheckbox = checkboxes.find(cb => 
          cb.parentElement?.textContent?.includes('погрузк') ||
          cb.parentElement?.textContent?.includes('разгрузк')
        );
        if (loadingCheckbox) (loadingCheckbox as HTMLElement).click();
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Настройка лифта и этажа
      await page.evaluate((hasFreightElevator, floor) => {
        // Выбор типа лифта
        const elevatorOptions = Array.from(document.querySelectorAll('option, label, div'));
        const elevatorOption = elevatorOptions.find(opt => 
          opt.textContent?.includes(hasFreightElevator ? 'грузовой' : 'пассажир')
        );
        if (elevatorOption) (elevatorOption as HTMLElement).click();

        // Ввод этажа
        const floorInputs = Array.from(document.querySelectorAll('input[type="number"]'));
        const floorInput = floorInputs.find(input => 
          (input as HTMLInputElement).placeholder?.includes('этаж') ||
          (input as HTMLInputElement).name?.includes('floor')
        );
        if (floorInput) {
          (floorInput as HTMLInputElement).value = floor.toString();
        }
      }, params.hasFreightElevator, params.floor);
    }

    // Шаг 7: Ожидание результатов
    console.log('⏳ Ожидание результатов расчета...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Шаг 8: Парсинг результатов
    console.log('📊 Парсинг результатов...');
    
    const results = await page.evaluate(() => {
      const result: any = {
        totalCost: 0,
        services: [],
        deliveryTime: null,
        warnings: []
      };

      // Поиск общей стоимости
      const totalCostSelectors = [
        '.total-cost',
        '.price-total',
        '[data-testid="total-cost"]',
        'div:contains("Стоимость")',
        'span:contains("Итого")'
      ];

      for (const selector of totalCostSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || '';
            const match = text.match(/[\d\s]+₽/);
            if (match) {
              result.totalCost = parseInt(match[0].replace(/[^\d]/g, ''));
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Поиск услуг
      const serviceItems = document.querySelectorAll('.service-item, .calculation-item, div[class*="service"]');
      serviceItems.forEach(item => {
        try {
          const nameElement = item.querySelector('.service-name, .item-name, [class*="name"]');
          const priceElement = item.querySelector('.service-price, .item-price, [class*="price"]');
          
          if (nameElement && priceElement) {
            const name = nameElement.textContent?.trim() || '';
            const priceText = priceElement.textContent || '';
            const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
            
            if (name && price > 0) {
              result.services.push({ name, price });
            }
          }
        } catch (e) {
          // Игнорируем ошибки парсинга отдельных элементов
        }
      });

      // Если услуги не найдены, ищем по текстовым паттернам
      if (result.services.length === 0) {
        const allText = document.body.textContent || '';
        
        // Ищем паттерны типа "Название услуги\n123 ₽"
        const serviceMatches = allText.match(/([^\n]+?)\s*[\d\s]+₽/g);
        if (serviceMatches) {
          serviceMatches.forEach(match => {
            const parts = match.split(/[\d\s]+₽/);
            if (parts.length > 0) {
              const name = parts[0].trim();
              const priceMatch = match.match(/([\d\s]+)₽/);
              if (name && priceMatch) {
                const price = parseInt(priceMatch[1].replace(/\s/g, '')) || 0;
                if (price > 0) {
                  result.services.push({ name, price });
                }
              }
            }
          });
        }
      }

      // Поиск сроков доставки
      const deliverySelectors = [
        '.delivery-time',
        '[data-testid="delivery-time"]',
        'div:contains("доставк")',
        'span:contains("дней")'
      ];

      for (const selector of deliverySelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            result.deliveryTime = element.textContent?.trim() || null;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      return result;
    });

    const parseTime = ((Date.now() - startTime) / 1000).toFixed(1);

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
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация входных данных
    const requiredFields = ['fromCity', 'toCity', 'length', 'width', 'height', 'weight'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Отсутствует обязательное поле: ${field}`
        }, { status: 400 });
      }
    }

    console.log('🕷️ Запуск парсера Vozovoz с параметрами:', body);

    // Запуск парсера
    const result = await parseVozovozWebsite(body as VozovozParserParams);

    console.log('✅ Парсер Vozovoz успешно завершил работу');
    console.log('💰 Итоговая стоимость:', result.totalCost);
    console.log('📦 Найдено услуг:', result.services.length);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Критическая ошибка парсера Vozovoz:', error);
    
    return NextResponse.json({
      error: error.message || 'Внутренняя ошибка парсера',
      details: error.stack
    }, { status: 500 });
  }
}