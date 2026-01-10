import { NextRequest, NextResponse } from 'next/server';

// Отключаем статическую генерацию для этого API
export const dynamic = 'force-dynamic';

// 🔧 Интерфейсы для данных мебели
interface CargoPlace {
  placeNumber: number;
  weight: number; // кг
  height: number; // см
  depth: number;  // см (ширина)
  length: number; // см
}

interface FurnitureProduct {
  id: string;
  externalCode: string;
  name: string;
  retailPrice: number;
  isActive: boolean;
  cargoPlaces: CargoPlace[];
}

// Кэш для данных (обновляется каждые 30 минут)
let cachedData: {
  products: FurnitureProduct[];
  lastUpdated: number;
} | null = null;

const CACHE_DURATION = 30 * 60 * 1000; // 30 минут

export async function GET(request: NextRequest) {
  try {
    // Используем nextUrl для избежания ошибки dynamic server usage
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const forceUpdate = searchParams.get('update') === 'true';
    
    // Проверяем кэш (с учетом принудительного обновления)
    const now = Date.now();
    if (!cachedData || (now - cachedData.lastUpdated) > CACHE_DURATION || forceUpdate) {
      console.log(forceUpdate ? '🔄 Принудительное обновление товарной матрицы...' : '🔄 Обновляем кэш данных мебели...');
      cachedData = await fetchFurnitureData();
    }
    
    // Фильтруем по поисковому запросу с поддержкой частичного поиска
    let products = cachedData.products;
    if (query) {
      // Разбиваем запрос на отдельные слова
      const queryWords = query.split(/\s+/).filter(word => word.length > 0);
      
      products = products.filter(product => {
        const productText = (product.name + ' ' + product.externalCode).toLowerCase();
        
        // Проверяем, что все слова из запроса содержатся в тексте товара
        return queryWords.every(word => productText.includes(word));
      });
    }
    
    // Ограничиваем количество результатов для автокомплита (по умолчанию все товары)
    const limit = parseInt(searchParams.get('limit') || '0');
    if (limit > 0) {
      products = products.slice(0, limit);
    }
    
    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
      cached: true,
      lastUpdated: new Date(cachedData.lastUpdated).toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка API furniture-products:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: []
    }, { status: 500 });
  }
}

// 🔧 Функция извлечения данных из Google Sheets
async function fetchFurnitureData(): Promise<{products: FurnitureProduct[], lastUpdated: number}> {
  try {
    // Google Sheets ID из URL
    const SHEET_ID = '1e0P91PfGKVIuSWDY0ceWkIE7jD-vzD_xrIesBeQno1Y';
    
    // Используем публичный CSV экспорт Google Sheets
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
    
    console.log('📊 Загружаем данные из Google Sheets:', csvUrl);
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('📄 Получены CSV данные, размер:', csvText.length);
    
    // Парсим CSV
    const rows = parseCSV(csvText);
    console.log('📋 Количество строк:', rows.length);
    
    // Преобразуем в структуру продуктов
    const products = await parseProductsFromRows(rows);
    console.log('🛋️ Обработано товаров:', products.length);
    
    // Логируем первые несколько товаров для проверки
    if (products.length > 0) {
      console.log('📦 Примеры товаров:');
      products.slice(0, 3).forEach((product, idx) => {
        console.log(`  ${idx + 1}. ${product.name} - ${product.retailPrice} руб., мест: ${product.cargoPlaces.length}`);
        if (product.cargoPlaces.length > 0) {
          const firstPlace = product.cargoPlaces[0];
          console.log(`     Место 1: ${firstPlace.weight}кг, ${firstPlace.length}×${firstPlace.depth}×${firstPlace.height} см`);
        }
      });
    }
    
    return {
      products,
      lastUpdated: Date.now()
    };
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных мебели:', error);
    throw error;
  }
}

// 🔧 Улучшенный CSV парсер
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Добавляем последнюю ячейку
      cells.push(current.trim());
      
      // Очищаем кавычки и лишние символы
      const cleanedCells = cells.map(cell => {
        // Удаляем внешние кавычки, если они есть
        let cleaned = cell.replace(/^"(.*)"$/, '$1');
        // Удаляем возврат каретки
        cleaned = cleaned.replace(/\r/g, '');
        // Удаляем двойные кавычки внутри (если они экранированы)
        cleaned = cleaned.replace(/""/g, '"');
        return cleaned.trim();
      });
      
      // Добавляем только если есть хотя бы одна непустая ячейка
      if (cleanedCells.some(cell => cell.length > 0)) {
        result.push(cleanedCells);
      }
    }
  }
  
  return result;
}

// 🔧 Преобразование строк в продукты
async function parseProductsFromRows(rows: string[][]): Promise<FurnitureProduct[]> {
  const products: FurnitureProduct[] = [];
  
  if (rows.length < 2) {
    console.warn('⚠️ Недостаточно данных в таблице');
    return products;
  }
  
  // Пропускаем заголовок (первая строка)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    if (row.length < 3) {
      console.warn(`⚠️ Строка ${i + 1} содержит недостаточно данных:`, row);
      continue;
    }
    
    try {
      // Маппинг колонок (согласно структуре таблицы)
      // После удаления первых трех столбцов (ID, Код, Активность):
      // Товар(0), Цена(1), Место1: Вес(2), Высота(3), Глубина(4), Длина(5) и т.д.
      const name = (row[0] || '').trim();
      const priceStr = row[1] || '0';
      
      // Пропускаем строки без названия товара
      if (!name) {
        continue;
      }
      
      // Очищаем цену от лишних символов
      const retailPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      
      // Извлекаем грузовые места (начиная с колонки 2)
      const cargoPlaces: CargoPlace[] = [];
      
      // В таблице может быть до 7 мест (Место 1-7)
      // После удаления первых трех столбцов:
      // Товар(0), Цена(1), 
      // Место1: Вес(2), Высота(3), Глубина(4), Длина(5)
      // Место2: Вес(6), Высота(7), Глубина(8), Длина(9) и т.д.
      for (let placeNum = 1; placeNum <= 7; placeNum++) {
        const baseIndex = 2 + (placeNum - 1) * 4; // 2, 6, 10, 14, 18, 22, 26
        
        if (baseIndex + 3 < row.length) {
          // Парсим значения, обрабатывая пустые строки
          const weightStr = (row[baseIndex] || '').trim();
          const heightStr = (row[baseIndex + 1] || '').trim();
          const depthStr = (row[baseIndex + 2] || '').trim();
          const lengthStr = (row[baseIndex + 3] || '').trim();
          
          const weight = weightStr ? parseFloat(weightStr) : 0;
          const height = heightStr ? parseFloat(heightStr) : 0;
          const depth = depthStr ? parseFloat(depthStr) : 0;
          const length = lengthStr ? parseFloat(lengthStr) : 0;
          
          // Добавляем только если есть хотя бы одно значение больше 0
          if (weight > 0 || height > 0 || depth > 0 || length > 0) {
            cargoPlaces.push({
              placeNumber: placeNum,
              weight: weight || 0,
              height: height || 0,
              depth: depth || 0,  // в таблице это "глубина", но мы называем depth
              length: length || 0
            });
          }
        }
      }
      
      // Добавляем продукт только если есть имя и хотя бы одно грузовое место
      if (name && cargoPlaces.length > 0) {
        // Генерируем id и externalCode на основе имени, так как эти столбцы были удалены
        const id = `product_${i}`;
        const externalCode = name.substring(0, 20).replace(/\s+/g, '_');
        
        products.push({
          id,
          externalCode,
          name,
          retailPrice,
          isActive: true, // По умолчанию активен, так как столбец активности был удален
          cargoPlaces
        });
      } else if (name && cargoPlaces.length === 0) {
        // Логируем товары без мест для отладки
        console.warn(`⚠️ Товар "${name}" не имеет транспортных мест (строка ${i + 1})`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Ошибка обработки строки ${i + 1}:`, error, row);
    }
  }
  
  // Сортируем по имени
  products.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  
  console.log(`✅ Успешно обработано ${products.length} товаров`);
  return products;
}

// POST метод для принудительного обновления кэша
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/furniture-products - Принудительное обновление кэша');
    
    // Полностью очищаем кэш
    cachedData = null;
    
    // Загружаем свежие данные
    const freshData = await fetchFurnitureData();
    cachedData = freshData;
    
    console.log('✅ Принудительное обновление кэша завершено:', {
      productsCount: cachedData.products.length,
      timestamp: new Date(cachedData.lastUpdated).toLocaleString('ru-RU')
    });

    return NextResponse.json({
      success: true,
      message: 'Кэш товаров принудительно обновлен из Google Sheets',
      data: cachedData.products,
      total: cachedData.products.length,
      lastUpdated: new Date(cachedData.lastUpdated).toISOString(),
      forceUpdate: true
    });

  } catch (error: any) {
    console.error('❌ Ошибка принудительного обновления кэша:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка принудительного обновления',
      data: cachedData?.products || [],
      total: cachedData?.products.length || 0
    }, { status: 500 });
  }
}