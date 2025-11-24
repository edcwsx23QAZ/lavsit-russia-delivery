// Система кэширования для API сессий и результатов расчетов

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

interface SessionCache {
  token: string | null;
  timestamp: number;
  expires: number;
}

interface CalculationCacheKey {
  fromCity: string;
  toCity: string;
  cargos: Array<{ length: number; width: number; height: number; weight: number }>;
  declaredValue: number;
  needPackaging: boolean;
  needInsurance: boolean;
  fromAddressDelivery: boolean;
  toAddressDelivery: boolean;
  needLoading: boolean;
  needCarry: boolean;
  floor: number;
  hasFreightLift: boolean;
}

class CacheManager {
  private sessionCache: Map<string, SessionCache> = new Map();
  private calculationCache: Map<string, CacheEntry<any>> = new Map();
  private cityCache: Map<string, CacheEntry<any>> = new Map();

  // Кэш сессий API (5 минут)
  private readonly SESSION_TTL = 5 * 60 * 1000; // 5 минут
  
  // Кэш расчетов (30 минут)
  private readonly CALCULATION_TTL = 30 * 60 * 1000; // 30 минут
  
  // Кэш городов (24 часа)
  private readonly CITY_TTL = 24 * 60 * 60 * 1000; // 24 часа

  // Получение кэшированной сессии
  getSession(company: string): string | null {
    const cache = this.sessionCache.get(company);
    if (!cache) return null;
    
    if (Date.now() > cache.expires) {
      this.sessionCache.delete(company);
      return null;
    }
    
    console.log(`🔑 Используем кэшированную сессию для ${company}`);
    return cache.token;
  }

  // Сохранение сессии
  setSession(company: string, token: string): void {
    this.sessionCache.set(company, {
      token,
      timestamp: Date.now(),
      expires: Date.now() + this.SESSION_TTL
    });
    console.log(`💾 Сессия для ${company} закэширована на ${this.SESSION_TTL / 1000}с`);
  }

  // Генерация ключа для кэша расчетов
  private generateCalculationKey(key: CalculationCacheKey): string {
    const sortedCargos = [...key.cargos]
      .sort((a, b) => a.length - b.length || a.width - b.width || a.height - b.height || a.weight - b.weight);
    
    return JSON.stringify({
      from: key.fromCity.toLowerCase().trim(),
      to: key.toCity.toLowerCase().trim(),
      cargos: sortedCargos,
      value: key.declaredValue,
      packaging: key.needPackaging,
      insurance: key.needInsurance,
      fromAddr: key.fromAddressDelivery,
      toAddr: key.toAddressDelivery,
      loading: key.needLoading,
      carry: key.needCarry,
      floor: key.floor,
      lift: key.hasFreightLift
    });
  }

  // Получение кэшированного расчета
  getCachedCalculation(company: string, key: CalculationCacheKey): any | null {
    const cacheKey = `${company}_${this.generateCalculationKey(key)}`;
    const cache = this.calculationCache.get(cacheKey);
    
    if (!cache) return null;
    
    if (Date.now() > cache.expires) {
      this.calculationCache.delete(cacheKey);
      return null;
    }
    
    console.log(`💰 Используем кэшированный расчет для ${company}`);
    return cache.data;
  }

  // Сохранение расчета
  setCachedCalculation(company: string, key: CalculationCacheKey, result: any): void {
    const cacheKey = `${company}_${this.generateCalculationKey(key)}`;
    this.calculationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      expires: Date.now() + this.CALCULATION_TTL
    });
    console.log(`💾 Расчет для ${company} закэширован на ${this.CALCULATION_TTL / 1000}с`);
  }

  // Кэширование данных городов
  getCachedData(key: string): any | null {
    const cache = this.cityCache.get(key);
    if (!cache) return null;
    
    if (Date.now() > cache.expires) {
      this.cityCache.delete(key);
      return null;
    }
    
    return cache.data;
  }

  setCachedData(key: string, data: any, ttl: number = this.CITY_TTL): void {
    this.cityCache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    });
  }

  // Очистка кэша
  clearCache(type?: 'sessions' | 'calculations' | 'cities' | 'all'): void {
    if (!type || type === 'all') {
      this.sessionCache.clear();
      this.calculationCache.clear();
      this.cityCache.clear();
      console.log('🧹 Весь кэш очищен');
      return;
    }

    switch (type) {
      case 'sessions':
        this.sessionCache.clear();
        console.log('🧹 Кэш сессий очищен');
        break;
      case 'calculations':
        this.calculationCache.clear();
        console.log('🧹 Кэш расчетов очищен');
        break;
      case 'cities':
        this.cityCache.clear();
        console.log('🧹 Кэш городов очищен');
        break;
    }
  }

  // Получение статистики кэша
  getCacheStats(): {
    sessions: number;
    calculations: number;
    cities: number;
    totalMemory: number;
  } {
    const sessions = this.sessionCache.size;
    const calculations = this.calculationCache.size;
    const cities = this.cityCache.size;
    
    // Примерная оценка памяти в байтах
    const totalMemory = (sessions + calculations + cities) * 1024; // ~1KB на запись
    
    return {
      sessions,
      calculations,
      cities,
      totalMemory
    };
  }

  // Предзагрузка всех сессий параллельно
  async preloadAllSessions(): Promise<void> {
    console.log('🚀 Предзагрузка сессий...');
    
    const sessionPromises = [
      this.preloadDellinSession(),
      this.preloadPekSession(),
      // Добавить другие компании по мере необходимости
    ];

    await Promise.allSettled(sessionPromises);
    console.log('✅ Предзагрузка сессий завершена');
  }

  // Предзагрузка сессии Деловых Линий
  private async preloadDellinSession(): Promise<void> {
    try {
      const cached = this.getSession('dellin');
      if (cached) return;

      console.log('🔑 Предзагрузка сессии Деловых Линий...');
      
      const response = await fetch('https://api.dellin.ru/v3/auth/login.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
          login: 'service@lavsit.ru',
          password: 'edcwsx123QAZ'
        })
      });

      const data = await response.json();
      let sessionID = null;
      
      if (data.data?.sessionID) {
        sessionID = data.data.sessionID;
      } else if (data.sessionID) {
        sessionID = data.sessionID;
      } else if (data.data?.session) {
        sessionID = data.data.session;
      }

      if (response.ok && sessionID) {
        this.setSession('dellin', sessionID);
        console.log('✅ Сессия Деловых Линий предзагружена');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка предзагрузки сессии Деловых Линий:', error);
    }
  }

  // Предзагрузка сессии ПЭК
  private async preloadPekSession(): Promise<void> {
    try {
      const cached = this.getSession('pek');
      if (cached) return;

      console.log('🔑 Предзагрузка сессии ПЭК...');
      
      // ПЭК использует API ключ, не требует сессии
      // Но можно проверить доступность
      const PEK_API_KEY = process.env.PEK_API_KEY || '624FC93CA677B23673BB476D4982294DC27E246F';
      
      if (PEK_API_KEY) {
        this.setSession('pek', PEK_API_KEY);
        console.log('✅ Ключ ПЭК закэширован');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка предзагрузки сессии ПЭК:', error);
    }
  }
}

// Экспорт синглтона
export const cacheManager = new CacheManager();

// Утилиты для работы с кэшем
export const createCalculationCacheKey = (form: any): CalculationCacheKey => ({
  fromCity: form.fromCity || '',
  toCity: form.toCity || '',
  cargos: form.cargos || [],
  declaredValue: form.declaredValue || 0,
  needPackaging: form.needPackaging || false,
  needInsurance: form.needInsurance || false,
  fromAddressDelivery: form.fromAddressDelivery || false,
  toAddressDelivery: form.toAddressDelivery || false,
  needLoading: form.needLoading || false,
  needCarry: form.needCarry || false,
  floor: form.floor || 1,
  hasFreightLift: form.hasFreightLift || false
});

export default cacheManager;