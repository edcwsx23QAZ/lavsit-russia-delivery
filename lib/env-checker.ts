// Утилита для проверки наличия переменных окружения для транспортных компаний

export interface CompanyEnvConfig {
  apiKey: string;
  requiredVars: string[];
  optionalVars?: string[];
}

// Конфигурация переменных окружения для каждой компании
export const COMPANY_ENV_CONFIGS: Record<string, CompanyEnvConfig> = {
  pek: {
    apiKey: 'pek',
    requiredVars: ['PEK_LOGIN', 'PEK_API_KEY']
  },
  kit: {
    apiKey: 'kit',
    requiredVars: ['KIT_API_TOKEN'],
    optionalVars: []
  },
  vozovoz: {
    apiKey: 'vozovoz',
    requiredVars: [], // Возовоз может работать без переменных (использует публичный API)
    optionalVars: []
  },
  dellin: {
    apiKey: 'dellin',
    requiredVars: [], // Деловые Линии имеют хардкоженные credentials в коде
    optionalVars: []
  },
  cdek: {
    apiKey: 'cdek',
    requiredVars: [], // СДЭК имеет хардкоженные credentials в коде
    optionalVars: []
  },
  nordwheel: {
    apiKey: 'nordwheel',
    requiredVars: [],
    optionalVars: []
  },
  railcontinent: {
    apiKey: 'railcontinent',
    requiredVars: [],
    optionalVars: []
  }
};

/**
 * Проверяет наличие всех обязательных переменных окружения для компании
 * @param companyKey - ключ компании (apiKey)
 * @returns объект с результатом проверки
 */
export function checkCompanyEnvVars(companyKey: string): {
  hasAllRequired: boolean;
  missingVars: string[];
  hasAnyOptional: boolean;
} {
  const config = COMPANY_ENV_CONFIGS[companyKey];
  
  if (!config) {
    // Если конфигурации нет, считаем что переменные не требуются
    return {
      hasAllRequired: true,
      missingVars: [],
      hasAnyOptional: true
    };
  }

  const missingVars: string[] = [];
  
  // Проверяем обязательные переменные (только на сервере)
  if (typeof window === 'undefined') {
    for (const varName of config.requiredVars) {
      if (!process.env[varName] || process.env[varName] === '') {
        missingVars.push(varName);
      }
    }
  }

  // Проверяем опциональные переменные
  const hasAnyOptional = config.optionalVars 
    ? config.optionalVars.some(varName => process.env[varName] && process.env[varName] !== '')
    : true;

  return {
    hasAllRequired: missingVars.length === 0,
    missingVars,
    hasAnyOptional
  };
}

/**
 * Получает статус доступности компании на основе переменных окружения
 * @param companyKey - ключ компании
 * @returns статус: 'available' | 'missing_env' | 'unknown'
 */
export function getCompanyAvailabilityStatus(companyKey: string): 'available' | 'missing_env' | 'unknown' {
  // На клиенте всегда возвращаем 'unknown', так как env vars недоступны
  if (typeof window !== 'undefined') {
    return 'unknown';
  }

  const check = checkCompanyEnvVars(companyKey);
  
  if (check.hasAllRequired) {
    return 'available';
  }
  
  return 'missing_env';
}

/**
 * Проверяет, может ли компания работать (имеет все необходимые переменные)
 * @param companyKey - ключ компании
 * @returns true если компания может работать
 */
export function canCompanyWork(companyKey: string): boolean {
  if (typeof window !== 'undefined') {
    // На клиенте не можем проверить, возвращаем true чтобы не блокировать UI
    return true;
  }
  
  return checkCompanyEnvVars(companyKey).hasAllRequired;
}

