import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Отключаем статическую генерацию для этого API
export const dynamic = 'force-dynamic';

// Интерфейсы для данных ткани
interface FabricProduct {
  collection: string;
  color: string;
  meterage?: number; // метраж в наличии
  comment?: string; // комментарий (например, "по запросу")
  isAvailable: boolean;
}

// Кэш для данных
let cachedData: {
  products: FabricProduct[];
  lastUpdated: number;
  fileDate?: string; // дата файла, который был успешно загружен
} | null = null;

const CACHE_DURATION = 30 * 60 * 1000; // 30 минут

/**
 * Форматирует дату в формат DDMMYY
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

/**
 * Генерирует URL для файла с указанной датой
 */
function generateFileUrl(date: Date): string {
  const dateStr = formatDate(date);
  return `https://api.vektor.club/static/remainders_files/${dateStr}_MSK.xlsx`;
}

/**
 * Проверяет наличие файла по URL
 */
async function checkFileExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Находит доступный файл, проверяя начиная с сегодняшней даты по убыванию
 */
async function findAvailableFile(maxDays: number = 30): Promise<{ url: string; date: string } | null> {
  const today = new Date();
  
  for (let i = 0; i < maxDays; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    
    const url = generateFileUrl(checkDate);
    const dateStr = formatDate(checkDate);
    
    console.log(`🔍 Проверяем файл за ${dateStr}: ${url}`);
    
    const exists = await checkFileExists(url);
    if (exists) {
      console.log(`✅ Файл найден: ${url}`);
      return { url, date: dateStr };
    }
  }
  
  return null;
}

/**
 * Скачивает и парсит Excel файл
 */
async function downloadAndParseExcel(url: string): Promise<FabricProduct[]> {
  console.log(`📥 Скачиваем файл: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ошибка загрузки файла: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Берем первый лист
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Конвертируем в JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
  
  console.log(`📊 Загружено строк: ${data.length}`);
  
  return parseFabricData(data);
}

/**
 * Парсит данные ткани из массива строк Excel
 */
function parseFabricData(rows: any[][]): FabricProduct[] {
  const products: FabricProduct[] = [];
  
  if (rows.length < 2) {
    console.warn('⚠️ Недостаточно данных в таблице');
    return products;
  }
  
  // Пропускаем заголовок (первая строка)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Проверяем, что строка имеет достаточно колонок
    if (!row || row.length < 6) {
      continue;
    }
    
    try {
      // Столбец D (индекс 3) - коллекция и цвет
      const columnD = String(row[3] || '').trim();
      
      // Игнорируем пустые строки
      if (!columnD) {
        continue;
      }
      
      // Игнорируем строки со словом "Сетка" (любой регистр)
      if (columnD.toLowerCase().includes('сетка')) {
        continue;
      }
      
      // Проверяем наличие слова "ткань" в столбце D
      if (!columnD.toLowerCase().includes('ткань')) {
        continue;
      }
      
      // Парсим коллекцию и цвет из столбца D
      // Текст до цифр - коллекция, цифры и после - цвет
      // Игнорируем слово "ткань" при парсинге
      const { collection, color } = parseCollectionAndColor(columnD);
      
      // Столбец F (индекс 5) - метраж с наличием
      const columnF = String(row[5] || '').trim();
      const { meterage, comment, isAvailable } = parseAvailability(columnF);
      
      products.push({
        collection,
        color,
        meterage,
        comment,
        isAvailable
      });
      
    } catch (error) {
      console.warn(`⚠️ Ошибка обработки строки ${i + 1}:`, error, row);
    }
  }
  
  console.log(`✅ Обработано товаров: ${products.length}`);
  return products;
}

/**
 * Парсит коллекцию и цвет из текста столбца D
 * Игнорирует слово "ткань" при парсинге
 * Текст до цифр - коллекция, цифры и все что после - цвет
 */
function parseCollectionAndColor(text: string): { collection: string; color: string } {
  // Убираем слово "ткань" (любой регистр) из текста
  let cleanedText = text.replace(/\bткань\b/gi, '').trim();
  
  // Убираем лишние пробелы
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  
  // Ищем первую цифру в тексте (может быть в начале, середине или конце)
  const match = cleanedText.match(/^(.+?)(\d.*)$/);
  
  if (match) {
    const collection = match[1].trim();
    const color = match[2].trim();
    
    // Если коллекция пустая после удаления "ткань", берем весь текст до цифр
    if (!collection) {
      return { collection: cleanedText, color: '' };
    }
    
    return { collection, color };
  }
  
  // Если цифр нет, весь текст - коллекция, цвет пустой
  return { collection: cleanedText, color: '' };
}

/**
 * Парсит наличие из столбца F
 * Если есть цифры - в наличии, пишем в метраж
 * Если есть текст или "по запросу" - не в наличии, пишем в комментарий
 */
function parseAvailability(text: string): { meterage?: number; comment?: string; isAvailable: boolean } {
  if (!text) {
    return { isAvailable: false, comment: 'по запросу' };
  }
  
  // Проверяем наличие фразы "по запросу" (любой регистр)
  if (text.toLowerCase().includes('по запросу')) {
    return { isAvailable: false, comment: 'по запросу' };
  }
  
  // Ищем цифры в тексте
  const numbers = text.match(/[\d.,]+/g);
  
  if (numbers && numbers.length > 0) {
    // Берем первое число и конвертируем в число
    const meterageStr = numbers[0].replace(',', '.');
    const meterage = parseFloat(meterageStr);
    
    if (!isNaN(meterage) && meterage > 0) {
      return { meterage, isAvailable: true };
    }
  }
  
  // Если есть текст, но нет цифр - не в наличии
  if (text.trim().length > 0) {
    return { isAvailable: false, comment: text.trim() };
  }
  
  return { isAvailable: false, comment: 'по запросу' };
}

/**
 * Загружает данные из файла Vektor
 */
async function fetchVektorData(): Promise<{ products: FabricProduct[]; lastUpdated: number; fileDate?: string }> {
  try {
    // Ищем доступный файл
    const fileInfo = await findAvailableFile(30);
    
    if (!fileInfo) {
      throw new Error('Не удалось найти доступный файл за последние 30 дней');
    }
    
    // Скачиваем и парсим файл
    const products = await downloadAndParseExcel(fileInfo.url);
    
    return {
      products,
      lastUpdated: Date.now(),
      fileDate: fileInfo.date
    };
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных Vektor:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const forceUpdate = searchParams.get('update') === 'true';
    
    // Проверяем кэш
    const now = Date.now();
    if (!cachedData || (now - cachedData.lastUpdated) > CACHE_DURATION || forceUpdate) {
      console.log(forceUpdate ? '🔄 Принудительное обновление данных Vektor...' : '🔄 Обновляем кэш данных Vektor...');
      cachedData = await fetchVektorData();
    }
    
    // Фильтруем по поисковому запросу
    let products = cachedData.products;
    if (query) {
      products = products.filter(product => 
        product.collection.toLowerCase().includes(query) ||
        product.color.toLowerCase().includes(query)
      );
    }
    
    // Ограничиваем количество результатов
    const limit = parseInt(searchParams.get('limit') || '0');
    if (limit > 0) {
      products = products.slice(0, limit);
    }
    
    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
      cached: true,
      lastUpdated: new Date(cachedData.lastUpdated).toISOString(),
      fileDate: cachedData.fileDate
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка API vektor:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Неизвестная ошибка',
      data: [],
      total: 0
    }, { status: 500 });
  }
}

// POST метод для принудительного обновления кэша
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/vektor - Принудительное обновление кэша');
    
    // Полностью очищаем кэш
    cachedData = null;
    
    // Загружаем свежие данные
    const freshData = await fetchVektorData();
    cachedData = freshData;
    
    console.log('✅ Принудительное обновление кэша завершено:', {
      productsCount: cachedData.products.length,
      fileDate: cachedData.fileDate,
      timestamp: new Date(cachedData.lastUpdated).toLocaleString('ru-RU')
    });

    return NextResponse.json({
      success: true,
      message: 'Кэш данных Vektor принудительно обновлен',
      data: cachedData.products,
      total: cachedData.products.length,
      lastUpdated: new Date(cachedData.lastUpdated).toISOString(),
      fileDate: cachedData.fileDate,
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

