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

// Стабильный реальный парсер с улучшенной обработкой ошибок
async function parseVozovozWebsiteStable(params: VozovozParserParams): Promise<ParsedResult> {
  const startTime = Date.now();
  let browser;
  
  try {
    console.log('🕷️ Запуск стабильного парсера Vozovoz...');
    
    // Стабильные настройки браузера
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
    
    // Установка user-agent
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📍 Переход на сайт Vozovoz...');
    
    // Загрузка страницы с обработкой ошибок
    try {
      await page.goto('https://vozovoz.ru/', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
    } catch (error) {
      console.error('Ошибка загрузки главной страницы:', error);
      throw new Error('Не удалось загрузить сайт Vozovoz');
    }

    console.log('✅ Сайт загружен');

    // Проверка доступности страницы
    const pageAccessible = await page.evaluate(() => {
      return document.body && document.body.innerHTML.length > 0;
    });

    if (!pageAccessible) {
      throw new Error('Страница недоступна');
    }

    // Ожидание загрузки элементов
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Поиск и клик по кнопке входа с несколькими попытками
    console.log('🔍 Поиск кнопки входа...');
    
    let loginClicked = false;
    const loginSelectors = [
      'a[href*="login"]',
      'button:contains("Личный кабинет")',
      '.login-button',
      '[data-testid="login-button"]',
      'a:contains("Войти")'
    ];

    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        loginClicked = true;
        console.log(`✅ Кнопка входа найдена: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loginClicked) {
      // Попытка найти по тексту
      loginClicked = await page.evaluate(() => {
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
    }

    if (!loginClicked) {
      throw new Error('Кнопка входа не найдена');
    }

    console.log('✅ Кнопка входа нажата');
    
    // Ожидание загрузки формы авторизации
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Проверка наличия формы авторизации
    const authFormExists = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="tel"], input[type="password"], input[name*="phone"], input[name*="login"]');
      return inputs.length > 0;
    });

    if (!authFormExists) {
      throw new Error('Форма авторизации не найдена');
    }

    // Ввод данных авторизации
    console.log('🔐 Ввод данных авторизации...');
    
    const authDataEntered = await page.evaluate(() => {
      try {
        // Ввод телефона
        const phoneInputs = Array.from(document.querySelectorAll('input[type="tel"], input[name*="phone"], input[placeholder*="телефон"]'));
        if (phoneInputs.length > 0) {
          const phoneInput = phoneInputs[0] as HTMLInputElement;
          phoneInput.focus();
          phoneInput.value = '79015199496';
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Ввод пароля
        const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
        if (passwordInputs.length > 0) {
          const passwordInput = passwordInputs[0] as HTMLInputElement;
          passwordInput.focus();
          passwordInput.value = 'LAv$it_2o21';
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return true;
      } catch (error) {
        console.error('Ошибка ввода данных:', error);
        return false;
      }
    });

    if (!authDataEntered) {
      throw new Error('Не удалось ввести данные авторизации');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Нажатие кнопки входа
    console.log('🔽 Нажатие кнопки входа...');
    
    const loginSubmitted = await page.evaluate(() => {
      try {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"], button:not([disabled])'));
        const submitBtn = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('войти') || text.includes('далее') || text.includes('вход');
        });
        
        if (submitBtn) {
          (submitBtn as HTMLElement).click();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Ошибка нажатия кнопки:', error);
        return false;
      }
    });

    if (!loginSubmitted) {
      throw new Error('Кнопка входа не найдена');
    }

    console.log('✅ Данные авторизации отправлены');
    
    // Ожидание загрузки после авторизации
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Проверка успешной авторизации
    const authSuccess = await page.evaluate(() => {
      // Проверяем, что мы авторизованы (нет формы входа)
      const loginInputs = document.querySelectorAll('input[type="password"]');
      return loginInputs.length === 0;
    });

    if (!authSuccess) {
      throw new Error('Авторизация не удалась');
    }

    // Поиск кнопки оформления заказа
    console.log('📋 Поиск кнопки оформления заказа...');
    
    let orderClicked = false;
    const orderSelectors = [
      'a[href*="order"]',
      'button:contains("Оформить заказ")',
      '.order-button',
      '[data-testid="create-order"]'
    ];

    for (const selector of orderSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        orderClicked = true;
        console.log(`✅ Кнопка заказа найдена: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!orderClicked) {
      // Попытка найти по тексту
      orderClicked = await page.evaluate(() => {
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
    }

    if (!orderClicked) {
      throw new Error('Кнопка оформления заказа не найдена');
    }

    console.log('✅ Переход к оформлению заказа');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Проверка наличия формы расчета
    const calcFormExists = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder*="отправ"], input[placeholder*="Отправка"], input[placeholder*="отправление"]');
      return inputs.length > 0;
    });

    if (!calcFormExists) {
      throw new Error('Форма расчета не найдена');
    }

    // Заполнение формы расчета
    console.log('📝 Заполнение формы расчета...');
    
    const formFilled = await page.evaluate((params) => {
      try {
        // Заполнение города отправления
        const fromInputs = Array.from(document.querySelectorAll('input[placeholder*="отправ"], input[name*="from"], input[placeholder*="Отправка"]'));
        if (fromInputs.length > 0) {
          const fromInput = fromInputs[0] as HTMLInputElement;
          fromInput.focus();
          fromInput.value = '';
          fromInput.value = params.fromCity;
          fromInput.dispatchEvent(new Event('input', { bubbles: true }));
          fromInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Эмулируем выбор из выпадающего списка
          fromInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
          fromInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }

        // Заполнение города назначения
        const toInputs = Array.from(document.querySelectorAll('input[placeholder*="прибыт"], input[name*="to"], input[placeholder*="Прибытие"]'));
        if (toInputs.length > 0) {
          const toInput = toInputs[0] as HTMLInputElement;
          toInput.focus();
          toInput.value = '';
          toInput.value = params.toCity;
          toInput.dispatchEvent(new Event('input', { bubbles: true }));
          toInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Эмулируем выбор из выпадающего списка
          toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
          toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }

        return true;
      } catch (error) {
        console.error('Ошибка заполнения формы:', error);
        return false;
      }
    }, params);

    if (!formFilled) {
      throw new Error('Не удалось заполнить форму');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Выбор типа доставки
    console.log('🚚 Выбор типа доставки...');
    
    const deliveryTypeSelected = await page.evaluate((params) => {
      try {
        // Выбор типа для отправления
        if (!params.fromAddressDelivery) {
          const terminalLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('терминал') && (text.includes('отправ') || text.includes('отделение'));
          });
          if (terminalLabels.length > 0) {
            (terminalLabels[0] as HTMLElement).click();
          }
        }

        // Выбор типа для назначения
        if (params.toAddressDelivery) {
          const addressLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('адрес') && (text.includes('достав') || text.includes('назнач'));
          });
          if (addressLabels.length > 0) {
            (addressLabels[0] as HTMLElement).click();
          }
        } else {
          const terminalLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('терминал') && (text.includes('достав') || text.includes('назнач'));
          });
          if (terminalLabels.length > 0) {
            (terminalLabels[0] as HTMLElement).click();
          }
        }

        return true;
      } catch (error) {
        console.error('Ошибка выбора типа доставки:', error);
        return false;
      }
    }, params);

    if (!deliveryTypeSelected) {
      console.warn('Не удалось выбрать тип доставки, продолжаем...');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Заполнение адреса если нужно
    if (params.toAddressDelivery && params.toAddress) {
      await page.evaluate((address) => {
        const addressInputs = Array.from(document.querySelectorAll('input[placeholder*="адрес"], input[name*="address"]'));
        if (addressInputs.length > 0) {
          const addressInput = addressInputs[0] as HTMLInputElement;
          addressInput.focus();
          addressInput.value = address;
          addressInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, params.toAddress);
    }

    // Заполнение параметров груза
    console.log('📦 Заполнение параметров груза...');
    
    const cargoParamsFilled = await page.evaluate((params) => {
      try {
        // Выбор "Места"
        const placesLabels = Array.from(document.querySelectorAll('label, span, div')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('места') || text.includes('мест');
        });
        if (placesLabels.length > 0) {
          (placesLabels[0] as HTMLElement).click();
        }

        // Заполнение габаритов
        const dimensionInputs = {
          length: Array.from(document.querySelectorAll('input[name*="length"], input[placeholder*="длин"]')),
          width: Array.from(document.querySelectorAll('input[name*="width"], input[placeholder*="ширин"]')),
          height: Array.from(document.querySelectorAll('input[name*="height"], input[placeholder*="высот"]')),
          weight: Array.from(document.querySelectorAll('input[name*="weight"], input[placeholder*="вес"]'))
        };

        if (Object.keys(dimensionInputs).length > 0) {
          Object.entries(dimensionInputs).forEach(([key, inputs]) => {
            if (inputs.length > 0) {
              const input = inputs[0] as HTMLInputElement;
              input.focus();
              input.value = params[key].toString();
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        }

        return true;
      } catch (error) {
        console.error('Ошибка заполнения параметров груза:', error);
        return false;
      }
    }, params);

    if (!cargoParamsFilled) {
      throw new Error('Не удалось заполнить параметры груза');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Ожидание появления результатов
    console.log('⏳ Ожидание результатов расчета...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Парсинг результатов
    console.log('📊 Парсинг результатов...');
    
    const results = await page.evaluate(() => {
      try {
        const result: any = {
          totalCost: 0,
          services: [],
          deliveryTime: null,
          warnings: []
        };

        // Поиск общей стоимости
        const totalSelectors = [
          '*:contains("Итого:")',
          '*:contains("Всего:")',
          '*:contains("Стоимость")',
          '.total-cost',
          '.price-total'
        ];

        for (const selector of totalSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of Array.from(elements)) {
              const text = element.textContent || '';
              const priceMatch = text.match(/(\d[\s\d]*\d+)\s*₽/);
              if (priceMatch) {
                result.totalCost = parseInt(priceMatch[1].replace(/\s/g, ''));
                console.log('Найдена общая стоимость:', result.totalCost);
                break;
              }
            }
            if (result.totalCost > 0) break;
          } catch (e) {
            continue;
          }
        }

        // Поиск услуг
        const serviceKeywords = [
          'Платный въезд',
          'Перевозка между городами',
          'Страхование',
          'Складская обработка',
          'Отвоз груза',
          'Скидка'
        ];

        serviceKeywords.forEach(keyword => {
          try {
            const elements = document.querySelectorAll('*');
            for (const element of Array.from(elements)) {
              const text = element.textContent || '';
              if (text.includes(keyword) && text.includes('₽')) {
                const priceMatch = text.match(/(\d[\s\d]*\d+)\s*₽/);
                if (priceMatch) {
                  const price = parseInt(priceMatch[1].replace(/\s/g, ''));
                  const name = text.replace(priceMatch[0], '').trim();
                  
                  if (name && price > 0) {
                    result.services.push({ name, price });
                    console.log('Найдена услуга:', name, price);
                    break;
                  }
                }
              }
            }
          } catch (e) {
            // Игнорируем ошибки и продолжаем
          }
        });

        // Поиск сроков доставки
        const timeElements = document.querySelectorAll('*');
        for (const element of Array.from(timeElements)) {
          const text = element.textContent || '';
          if (text.includes('дней') || text.includes('дня') || text.includes('день')) {
            result.deliveryTime = text.trim();
            console.log('Найдены сроки доставки:', result.deliveryTime);
            break;
          }
        }

        return result;
      } catch (error) {
        console.error('Ошибка парсинга:', error);
        return {
          totalCost: 0,
          services: [],
          deliveryTime: null,
          warnings: ['Ошибка парсинга: ' + (error instanceof Error ? error.message : String(error))]
        };
      }
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
    
    console.log('🕷️ Запуск стабильного парсера Vozovoz с параметрами:', JSON.stringify(body, null, 2));

    // Валидация
    const requiredFields = ['fromCity', 'toCity', 'length', 'width', 'height', 'weight'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `Отсутствует обязательное поле: ${field}`
        }, { status: 400 });
      }
    }

    console.log('🚀 Запуск стабильного реального парсера...');
    
    // Запуск стабильного реального парсера
    const result = await parseVozovozWebsiteStable(body as VozovozParserParams);

    console.log('✅ Стабильный парсер завершил работу успешно');
    console.log('💰 Итоговая стоимость:', result.totalCost);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Критическая ошибка стабильного парсера:', error);
    
    return NextResponse.json({
      error: error.message || 'Внутренняя ошибка парсера',
      details: error.stack
    }, { status: 500 });
  }
}