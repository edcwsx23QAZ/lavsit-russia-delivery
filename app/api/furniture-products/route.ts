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
    
    // Проверяем кэш
    const now = Date.now();
    if (!cachedData || (now - cachedData.lastUpdated) > CACHE_DURATION) {
      console.log('🔄 Обновляем кэш данных мебели...');
      cachedData = await fetchFurnitureData();
    }
    
    // Фильтруем по поисковому запросу
    let products = cachedData.products;
    if (query) {
      products = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.externalCode.toLowerCase().includes(query)
      );
    }
    
    // Ограничиваем количество результатов для автокомплита
    const limit = parseInt(searchParams.get('limit') || '20');
    products = products.slice(0, limit);
    
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
      const cleanedCells = cells.map(cell => 
        cell.replace(/^"(.*)"$/, '$1').replace(/\r/g, '').trim()
      );
      
      result.push(cleanedCells);
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
    
    if (row.length < 6) {
      console.warn(`⚠️ Строка ${i + 1} содержит недостаточно данных:`, row);
      continue;
    }
    
    try {
      // Маппинг колонок (согласно структуре таблицы)
      const id = row[0] || '';
      const externalCode = row[1] || '';
      const isActive = row[2]?.toLowerCase() === 'да';
      const name = row[3] || '';
      const priceStr = row[4] || '0';
      
      // Очищаем цену от лишних символов
      const retailPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      
      // Извлекаем грузовые места (начиная с колонки 5)
      const cargoPlaces: CargoPlace[] = [];
      
      // В таблице может быть до 7 мест (Место 1-7)
      // Колонки: ID(0), Код(1), Активность(2), Товар(3), Цена(4), 
      // Место1: Вес(5), Высота(6), Глубина(7), Длина(8)
      // Место2: Вес(9), Высота(10), Глубина(11), Длина(12) и т.д.
      for (let placeNum = 1; placeNum <= 7; placeNum++) {
        const baseIndex = 5 + (placeNum - 1) * 4; // 5, 9, 13, 17, 21, 25, 29
        
        if (baseIndex + 3 < row.length) {
          const weight = parseFloat(row[baseIndex]) || 0;      // Вес
          const height = parseFloat(row[baseIndex + 1]) || 0;  // Высота
          const depth = parseFloat(row[baseIndex + 2]) || 0;   // Глубина (ширина)
          const length = parseFloat(row[baseIndex + 3]) || 0;  // Длина
          
          // Добавляем только если есть хотя бы одно значение больше 0
          if (weight > 0 || height > 0 || depth > 0 || length > 0) {
            cargoPlaces.push({
              placeNumber: placeNum,
              weight,
              height,
              depth,  // в таблице это "глубина", но мы называем depth
              length
            });
          }
        }
      }
      
      // Добавляем продукт только если есть имя и хотя бы одно грузовое место
      if (name && cargoPlaces.length > 0) {
        products.push({
          id,
          externalCode,
          name: name.trim(),
          retailPrice,
          isActive,
          cargoPlaces
        });
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