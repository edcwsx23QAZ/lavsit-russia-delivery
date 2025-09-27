import { 
  FurnitureProduct, 
  CargoPlace, 
  CargoWithMetadata, 
  ProductInForm 
} from './furniture-types';

// 🔧 Утилиты для работы с мебельными данными

/**
 * Преобразует CargoPlace в формат Cargo для формы
 */
export function cargoPlaceToFormCargo(
  place: CargoPlace, 
  productId: string, 
  uniqueId: string
): CargoWithMetadata {
  return {
    id: uniqueId,
    length: place.length,
    width: place.depth,  // в таблице depth, в форме width
    height: place.height,
    weight: place.weight,
    productId,
    placeNumber: place.placeNumber,
    isFromProduct: true
  };
}

/**
 * Поиск товаров по запросу с поддержкой нечеткого поиска
 */
export function searchProducts(products: FurnitureProduct[], query: string): FurnitureProduct[] {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Разбиваем запрос на отдельные слова
  const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
  
  const searchResults = products.filter(product => {
    if (!product.isActive) return false;
    
    const productText = (product.name + ' ' + product.externalCode).toLowerCase();
    
    // Проверяем, что все слова из запроса содержатся в тексте товара
    const allWordsMatch = queryWords.every(word => productText.includes(word));
    
    // Альтернативно: проверяем частичное совпадение любого слова
    const anyWordMatch = queryWords.some(word => {
      // Поиск по началу слов в названии товара
      const productWords = productText.split(/\s+/);
      return productWords.some(productWord => 
        productWord.startsWith(word) || productWord.includes(word)
      );
    });
    
    return allWordsMatch || (queryWords.length === 1 && anyWordMatch);
  });
  
  // Сортируем результаты по релевантности
  return searchResults.sort((a, b) => {
    const aText = a.name.toLowerCase();
    const bText = b.name.toLowerCase();
    
    // Точное совпадение в начале названия имеет приоритет
    const aStartsWithQuery = aText.startsWith(normalizedQuery);
    const bStartsWithQuery = bText.startsWith(normalizedQuery);
    
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;
    
    // Если оба или ни один не начинается с запроса, сортируем по алфавиту
    return aText.localeCompare(bText, 'ru');
  }).slice(0, 50); // Увеличиваем лимит до 50 результатов
}

/**
 * Валидация товара
 */
export function validateProduct(product: FurnitureProduct): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!product.name?.trim()) {
    errors.push('Отсутствует название товара');
  }
  
  if (!product.cargoPlaces || product.cargoPlaces.length === 0) {
    errors.push('Отсутствуют грузовые места');
  }
  
  if (product.retailPrice < 0) {
    errors.push('Некорректная цена товара');
  }
  
  // Проверяем грузовые места
  product.cargoPlaces?.forEach((place, index) => {
    if (place.weight <= 0 && place.length <= 0 && place.depth <= 0 && place.height <= 0) {
      errors.push(`Грузовое место №${place.placeNumber} не содержит размеров`);
    }
    
    if (place.weight > 10000) {
      errors.push(`Грузовое место №${place.placeNumber} имеет слишком большой вес: ${place.weight}кг`);
    }
    
    const maxDimension = Math.max(place.length, place.depth, place.height);
    if (maxDimension > 1000) {
      errors.push(`Грузовое место №${place.placeNumber} имеет слишком большие размеры: ${maxDimension}см`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Расчет общей стоимости товаров
 */
export function calculateTotalValue(productsInForm: ProductInForm[]): number {
  return productsInForm.reduce((total, item) => {
    return total + (item.product.retailPrice * item.quantity);
  }, 0);
}

/**
 * Генерация уникального ID для груза
 */
export function generateCargoId(productId: string, placeNumber: number, timestamp: number): string {
  return `${productId}_p${placeNumber}_${timestamp}`;
}

/**
 * Создание грузовых мест для товара с учетом количества
 */
export function createCargosForProduct(
  product: FurnitureProduct, 
  quantity: number, 
  timestamp: number
): CargoWithMetadata[] {
  const cargos: CargoWithMetadata[] = [];
  
  for (let q = 0; q < quantity; q++) {
    product.cargoPlaces.forEach(place => {
      const uniqueId = generateCargoId(product.id, place.placeNumber, timestamp + q * 1000 + place.placeNumber);
      const cargo = cargoPlaceToFormCargo(place, product.id, uniqueId);
      cargos.push(cargo);
    });
  }
  
  return cargos;
}

/**
 * Поиск индексов грузов, принадлежащих конкретному товару
 */
export function findCargoIndexesForProduct(
  cargos: CargoWithMetadata[], 
  productId: string, 
  addedAt: number
): number[] {
  const indexes: number[] = [];
  
  cargos.forEach((cargo, index) => {
    if (cargo.productId === productId && cargo.id.includes(`_${addedAt}`)) {
      indexes.push(index);
    }
  });
  
  return indexes;
}

/**
 * Удаление всех грузов товара
 */
export function removeCargosForProduct(
  cargos: CargoWithMetadata[], 
  productId: string, 
  addedAt: number
): CargoWithMetadata[] {
  return cargos.filter(cargo => {
    return !(cargo.productId === productId && cargo.id.includes(`_${addedAt}`));
  });
}

/**
 * Форматирование цены
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

/**
 * Форматирование габаритов
 */
export function formatDimensions(length: number, width: number, height: number): string {
  return `${length}×${width}×${height} см`;
}

/**
 * Получение краткого описания товара
 */
export function getProductSummary(product: FurnitureProduct): string {
  const placesCount = product.cargoPlaces.length;
  const totalWeight = product.cargoPlaces.reduce((sum, place) => sum + place.weight, 0);
  
  return `${placesCount} ${getPlaceWord(placesCount)}, ${totalWeight}кг`;
}

/**
 * Склонение слова "место"
 */
function getPlaceWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'место';
  } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'места';
  } else {
    return 'мест';
  }
}

/**
 * Кэширование продуктов в localStorage
 */
export function cacheProducts(products: FurnitureProduct[]): void {
  try {
    const cacheData = {
      products,
      timestamp: Date.now()
    };
    localStorage.setItem('furniture_products_cache', JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Не удалось кэшировать продукты:', error);
  }
}

/**
 * Получение продуктов из кэша
 */
export function getCachedProducts(): FurnitureProduct[] | null {
  try {
    const cached = localStorage.getItem('furniture_products_cache');
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const now = Date.now();
    const cacheAge = now - cacheData.timestamp;
    
    // Кэш действителен 30 минут
    if (cacheAge > 30 * 60 * 1000) {
      localStorage.removeItem('furniture_products_cache');
      return null;
    }
    
    return cacheData.products;
  } catch (error) {
    console.warn('Ошибка чтения кэша продуктов:', error);
    return null;
  }
}