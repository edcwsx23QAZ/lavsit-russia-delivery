import { NextResponse } from 'next/server';
import { COMPANY_ENV_CONFIGS, checkCompanyEnvVars } from '@/lib/env-checker';

/**
 * API endpoint для проверки наличия переменных окружения для компаний
 * Используется на клиенте, так как переменные окружения недоступны в браузере
 */
export async function GET() {
  const companyStatuses: Record<string, {
    hasAllRequired: boolean;
    missingVars: string[];
    canWork: boolean;
  }> = {};

  // Проверяем каждую компанию из конфигурации
  Object.keys(COMPANY_ENV_CONFIGS).forEach(companyKey => {
    const check = checkCompanyEnvVars(companyKey);
    companyStatuses[companyKey] = {
      hasAllRequired: check.hasAllRequired,
      missingVars: check.missingVars,
      canWork: check.hasAllRequired
    };
  });

  return NextResponse.json({
    success: true,
    companies: companyStatuses,
    timestamp: new Date().toISOString()
  });
}

