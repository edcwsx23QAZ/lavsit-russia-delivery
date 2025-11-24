import { cacheManager, createCalculationCacheKey } from './cache-manager';
import { enhancedApiRequest, PerformanceMonitor } from './api-utils';

interface ApiRequest {
  company: string;
  method: string;
  url: string;
  options: RequestInit;
  context: { operation: string; company: string };
  requiresAuth?: boolean;
  cacheKey?: string;
}

interface BatchResult {
  company: string;
  result: any;
  error?: string;
  duration: number;
  fromCache?: boolean;
}

class OptimizedApiClient {
  // Параллельное выполнение множественных API запросов
  async batchApiRequests(requests: ApiRequest[]): Promise<BatchResult[]> {
    const startTime = performance.now();
    
    console.log(`🚀 Запуск ${requests.length} параллельных API запросов...`);
    
    // Создаем массив промисов с таймаутами и мониторингом
    const requestPromises = requests.map(async (request): Promise<BatchResult> => {
      const requestStart = performance.now();
      const endTiming = PerformanceMonitor.startMeasurement(`${request.company}_${request.method}`);
      
      try {
        // Проверяем кэш для GET запросов
        if (request.method === 'GET' && request.cacheKey) {
          const cached = cacheManager.getCachedData(request.cacheKey);
          if (cached) {
            const duration = performance.now() - requestStart;
            endTiming();
            return {
              company: request.company,
              result: cached,
              duration,
              fromCache: true
            };
          }
        }

        // Выполняем запрос
        const response = await enhancedApiRequest(
          request.url,
          request.options,
          request.context,
          { maxRetries: 2, baseDelay: 1000 }
        );

        if (response && typeof response === 'object' && 'success' in response && !response.success) {
          throw new Error(response.error?.message || 'API request failed');
        }

        const result = response as Response;
        let data;
        
        try {
          data = await result.json();
        } catch (parseError) {
          throw new Error(`Failed to parse API response: ${parseError}`);
        }

        // Кэшируем успешные GET запросы
        if (request.method === 'GET' && result.ok && request.cacheKey) {
          cacheManager.setCachedData(request.cacheKey, data);
        }

        const duration = performance.now() - requestStart;
        endTiming();
        
        return {
          company: request.company,
          result: data,
          duration,
          fromCache: false
        };

      } catch (error) {
        const duration = performance.now() - requestStart;
        endTiming();
        
        console.error(`❌ Ошибка API запроса ${request.company}:`, error);
        
        return {
          company: request.company,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        };
      }
    });

    // Ждем завершения всех запросов
    const results = await Promise.allSettled(requestPromises);
    
    // Обрабатываем результаты
    const batchResults: BatchResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`❌ Критическая ошибка запроса ${requests[index].company}:`, result.reason);
        return {
          company: requests[index].company,
          result: null,
          error: `Critical error: ${result.reason}`,
          duration: 0
        };
      }
    });

    const totalDuration = performance.now() - startTime;
    const successCount = batchResults.filter(r => !r.error).length;
    const cacheHitCount = batchResults.filter(r => r.fromCache).length;
    
    console.log(`✅ Пакетный запрос завершен за ${totalDuration.toFixed(0)}мс`);
    console.log(`📊 Успешно: ${successCount}/${requests.length}, Из кэша: ${cacheHitCount}`);
    
    return batchResults;
  }

  // Оптимизированный расчет стоимости с кэшированием
  async calculateWithCache(
    company: string,
    calculationFunction: () => Promise<any>,
    form: any
  ): Promise<any> {
    const cacheKey = createCalculationCacheKey(form);
    
    // Проверяем кэш
    const cached = cacheManager.getCachedCalculation(company, cacheKey);
    if (cached) {
      console.log(`💰 Используем кэшированный расчет для ${company}`);
      return cached;
    }

    // Выполняем расчет
    console.log(`🔄 Выполняем расчет для ${company}...`);
    const result = await calculationFunction();
    
    // Кэшируем успешный результат
    if (result && !result.error) {
      cacheManager.setCachedCalculation(company, cacheKey, result);
    }
    
    return result;
  }

  // Параллельная предзагрузка всех необходимых данных
  async preloadCalculationData(form: any): Promise<void> {
    console.log('🚀 Предзагрузка данных для расчетов...');
    
    const preloadPromises: Promise<void>[] = [];
    
    // Предзагрузка сессий
    preloadPromises.push(cacheManager.preloadAllSessions());
    
    // Предзагрузка данных городов если нужно
    if (form.fromCity && form.toCity) {
      preloadPromises.push(this.preloadCityData(form.fromCity, form.toCity));
    }
    
    await Promise.allSettled(preloadPromises);
    console.log('✅ Предзагрузка данных завершена');
  }

  // Предзагрузка данных городов
  private async preloadCityData(fromCity: string, toCity: string): Promise<void> {
    const cityPromises = [
      this.preloadDellinCities(fromCity, toCity),
      this.preloadPekZones(fromCity, toCity)
    ];
    
    await Promise.allSettled(cityPromises);
  }

  // Предзагрузка городов Деловых Линий
  private async preloadDellinCities(fromCity: string, toCity: string): Promise<void> {
    try {
      const cacheKey = `dellin_cities_${fromCity}_${toCity}`;
      const cached = cacheManager.getCachedData(cacheKey);
      
      if (cached) return;
      
      console.log('🏙️ Предзагрузка городов Деловых Линий...');
      
      // Загружаем справочник городов
      const response = await fetch('/data/dellin-cities.json');
      if (response.ok) {
        const data = await response.json();
        cacheManager.setCachedData(cacheKey, data.cities, 24 * 60 * 60 * 1000); // 24 часа
        console.log('✅ Города Деловых Линий предзагружены');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка предзагрузки городов Деловых Линий:', error);
    }
  }

  // Предзагрузка зон ПЭК
  private async preloadPekZones(fromCity: string, toCity: string): Promise<void> {
    try {
      const fromCacheKey = `pek_zone_${fromCity}`;
      const toCacheKey = `pek_zone_${toCity}`;
      
      const fromCached = cacheManager.getCachedData(fromCacheKey);
      const toCached = cacheManager.getCachedData(toCacheKey);
      
      if (fromCached && toCached) return;
      
      console.log('🏙️ Предзагрузка зон ПЭК...');
      
      // Параллельно загружаем зоны для обоих городов
      const zonePromises: Promise<{ city: string; data: any }>[] = [];
      
      if (!fromCached) {
        zonePromises.push(
          enhancedApiRequest(
            '/api/pek',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                method: 'findzonebyaddress',
                address: fromCity
              })
            },
            { operation: 'findzonebyaddress', company: 'ПЭК' }
          ).then(response => response.json()).then(data => ({ city: fromCity, data }))
        );
      }
      
      if (!toCached) {
        zonePromises.push(
          enhancedApiRequest(
            '/api/pek',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                method: 'findzonebyaddress',
                address: toCity
              })
            },
            { operation: 'findzonebyaddress', company: 'ПЭК' }
          ).then(response => response.json()).then(data => ({ city: toCity, data }))
        );
      }
      
      const results = await Promise.allSettled(zonePromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          const cacheKey = `pek_zone_${result.value.city}`;
          cacheManager.setCachedData(cacheKey, result.value.data, 30 * 60 * 1000); // 30 минут
        }
      });
      
      console.log('✅ Зоны ПЭК предзагружены');
    } catch (error) {
      console.warn('⚠️ Ошибка предзагрузки зон ПЭК:', error);
    }
  }

  // Получение статистики производительности
  getPerformanceStats(): {
    cache: any;
    apiMetrics: any;
  } {
    return {
      cache: cacheManager.getCacheStats(),
      apiMetrics: PerformanceMonitor.getMetrics()
    };
  }
}

// Экспорт синглтона
export const optimizedApiClient = new OptimizedApiClient();

export default optimizedApiClient;