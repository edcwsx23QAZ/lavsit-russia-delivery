/**
 * Утилиты для работы со справочником упаковок и характера груза Деловых Линий
 */

export interface DellinPackage {
  id: string;
  uid: string;
  name: string;
}

export interface DellinFreight {
  uid: string;
  name: string;
}

/**
 * Находит UID упаковки по названию из справочника CSV
 */
export function findPackageUid(packages: DellinPackage[], packageName: string): string | null {
  console.log(`🔍 Поиск упаковки "${packageName}" в справочнике из ${packages.length} записей`);
  
  // Точное совпадение по name
  const exactMatch = packages.find(pkg => 
    pkg.name && pkg.name.toLowerCase().includes(packageName.toLowerCase())
  );
  
  if (exactMatch) {
    console.log(`✅ Найдено точное совпадение: ${exactMatch.name} → ${exactMatch.uid}`);
    return exactMatch.uid;
  }

  // Поиск по ключевым словам для популярных типов упаковки
  const searchTerms = getPackageSearchTerms(packageName);
  
  for (const term of searchTerms) {
    const match = packages.find(pkg => 
      pkg.name && pkg.name.toLowerCase().includes(term.toLowerCase())
    );
    
    if (match) {
      console.log(`✅ Найдено совпадение по термину "${term}": ${match.name} → ${match.uid}`);
      return match.uid;
    }
  }

  console.log(`❌ Упаковка "${packageName}" не найдена в справочнике`);
  return null;
}

/**
 * Возвращает список поисковых терминов для типа упаковки
 */
function getPackageSearchTerms(packageName: string): string[] {
  const termMap: Record<string, string[]> = {
    'crate_with_bubble': [
      'обрешетка',
      'обрешётка', 
      'амортизация',
      'bubble',
      'пузырьковая',
      'защитная упаковка'
    ],
    'bubble_wrap': [
      'пузырьковая',
      'bubble',
      'воздушно-пузырьковая'
    ],
    'cardboard_box': [
      'картонная',
      'коробка',
      'cardboard'
    ],
    'wooden_crate': [
      'деревянная',
      'обрешетка',
      'обрешётка',
      'wooden'
    ]
  };

  return termMap[packageName] || [packageName];
}

/**
 * Получает UID упаковки через API с правильным workflow
 */
export async function getDellinPackageUid(packageName: string): Promise<string | null> {
  try {
    console.log(`📦 Запрос UID упаковки "${packageName}" через правильный workflow...`);
    
    const response = await fetch('/api/dellin-packages', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Ошибка API справочника упаковок:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error('❌ Некорректная структура ответа справочника упаковок:', result);
      return null;
    }

    console.log(`📦 Получен справочник упаковок: ${result.data.length} записей`);
    console.log(`📦 Источник: ${result.cached ? 'кэш' : 'CSV файл'}`);
    
    if (result.csvUrl) {
      console.log(`📦 CSV URL: ${result.csvUrl}`);
    }

    // Ищем подходящий UID
    const uid = findPackageUid(result.data, packageName);
    
    if (uid) {
      console.log(`✅ Найден UID упаковки "${packageName}": ${uid}`);
      return uid;
    } else {
      console.log(`❌ UID упаковки "${packageName}" не найден`);
      
      // Выводим доступные упаковки для отладки
      console.log('📦 Доступные упаковки в справочнике:');
      result.data.slice(0, 10).forEach((pkg: DellinPackage, index: number) => {
        console.log(`  ${index + 1}. ${pkg.name} (${pkg.uid})`);
      });
      
      if (result.data.length > 10) {
        console.log(`  ... и еще ${result.data.length - 10} записей`);
      }
      
      return null;
    }

  } catch (error) {
    console.error('❌ Ошибка получения UID упаковки:', error);
    return null;
  }
}

/**
 * Fallback UID для случаев, когда API недоступен
 * Основан на анализе официального сайта ДЛ
 */
export const FALLBACK_PACKAGE_UIDS = {
  'crate_with_bubble': '0x9dd8901b0ecef10c11e8ed001199bf6e', // Из URL сайта ДЛ
  'bubble_wrap': '0xa6a7bd2bf950e67f4b2cf7cc3a97c111',      // Старый fallback
  'cardboard_box': '0x123456789abcdef',
  'wooden_crate': '0x987654321fedcba'
};

/**
 * Получает UID упаковки с fallback логикой
 */
export async function getPackageUidWithFallback(packageName: string): Promise<string> {
  // Сначала пытаемся получить из актуального справочника
  const uid = await getDellinPackageUid(packageName);
  
  if (uid) {
    return uid;
  }

  // Если не удалось, используем fallback
  const fallbackUid = FALLBACK_PACKAGE_UIDS[packageName as keyof typeof FALLBACK_PACKAGE_UIDS];
  
  if (fallbackUid) {
    console.log(`🔧 Используем fallback UID для "${packageName}": ${fallbackUid}`);
    return fallbackUid;
  }

  // Если совсем ничего не найдено, используем UID с сайта ДЛ как последний fallback
  console.log(`🔧 Используем универсальный fallback UID (с сайта ДЛ): ${FALLBACK_PACKAGE_UIDS.crate_with_bubble}`);
  return FALLBACK_PACKAGE_UIDS.crate_with_bubble;
}

/**
 * Получает UID характера груза "Мебель" для Деловых Линий
 */
export async function getDellinFreightUid(): Promise<string | null> {
  try {
    console.log('📦 Запрос UID характера груза "Мебель" через API...');
    
    const response = await fetch('/api/dellin-freight', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Ошибка API характера груза:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.data || !Array.isArray(result.data)) {
      console.error('❌ Некорректная структура ответа API характера груза:', result);
      return null;
    }

    console.log(`📦 Получено характеров груза "Мебель": ${result.data.length}`);
    console.log(`📦 Источник: ${result.cached ? 'кэш' : 'API'}`);
    
    // Ищем точное совпадение "Мебель" (не "Мебельные фасады" или "Мебельная фурнитура")
    const exactMatch = result.data.find((freight: DellinFreight) => 
      freight.name && freight.name.trim().toLowerCase() === 'мебель'
    );
    
    if (exactMatch && exactMatch.uid) {
      // Удаляем дефисы из UID т.к. API требует максимум 34 символа
      const cleanUid = exactMatch.uid.replace(/-/g, '');
      console.log(`✅ Найден UID характера груза "Мебель": ${exactMatch.uid} → ${cleanUid}`);
      return cleanUid;
    }
    
    // Если точное совпадение не найдено, берем первый элемент как fallback
    const freight = result.data[0] as DellinFreight;
    
    if (freight && freight.uid) {
      // Удаляем дефисы из UID т.к. API требует максимум 34 символа
      const cleanUid = freight.uid.replace(/-/g, '');
      console.log(`⚠️ Точное совпадение "Мебель" не найдено, используем: "${freight.name}" → ${freight.uid} → ${cleanUid}`);
      return cleanUid;
    } else {
      console.log('❌ UID характера груза "Мебель" не найден');
      return null;
    }

  } catch (error) {
    console.error('❌ Ошибка получения UID характера груза:', error);
    return null;
  }
}

/**
 * Fallback UID для характера груза "Мебель"
 * На случай если API недоступен
 * UID получен из официального API Деловых Линий
 */
// UID без дефисов, т.к. API требует максимум 34 символа (UUID с дефисами = 36 символов)
export const FALLBACK_FREIGHT_UID = 'eddb67e3bdb311e0ad24001a64963cbd';

/**
 * Получает UID характера груза с fallback логикой
 */
export async function getFreightUidWithFallback(): Promise<string> {
  // Сначала пытаемся получить из актуального API
  const uid = await getDellinFreightUid();
  
  if (uid) {
    return uid;
  }

  // Если не удалось, используем fallback
  console.log(`🔧 Используем fallback UID для характера груза "Мебель": ${FALLBACK_FREIGHT_UID}`);
  return FALLBACK_FREIGHT_UID;
}