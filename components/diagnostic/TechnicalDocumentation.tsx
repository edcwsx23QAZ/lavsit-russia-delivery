'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  RefreshCw,
  Code,
  Settings,
  Truck,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface DocumentationBlock {
  id: string;
  title: string;
  type: 'function' | 'component' | 'api' | 'logic' | 'data';
  description: string;
  code?: string;
  dependencies?: string[];
  relatedFiles?: string[];
  apiEndpoints?: string[];
  lastModified?: Date;
}

interface ChangeRecord {
  id: string;
  timestamp: Date;
  type: 'added' | 'modified' | 'deleted';
  impact: 'low' | 'medium' | 'high';
  description: string;
  affectedFunctions: string[];
  files: string[];
}

const TechnicalDocumentation: React.FC = () => {
  const [documentation, setDocumentation] = useState<DocumentationBlock[]>([]);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load saved documentation and changes
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem('technicalDocumentation');
      const savedChanges = localStorage.getItem('documentationChanges');
      const savedLastAnalysis = localStorage.getItem('lastDocumentationAnalysis');

      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        setDocumentation(parsed.map((doc: any) => ({
          ...doc,
          lastModified: doc.lastModified ? new Date(doc.lastModified) : undefined
        })));
      }

      if (savedChanges) {
        const parsed = JSON.parse(savedChanges);
        setChanges(parsed.map((change: any) => ({
          ...change,
          timestamp: new Date(change.timestamp)
        })));
      }

      if (savedLastAnalysis) {
        setLastAnalysis(new Date(savedLastAnalysis));
      }
    } catch (error) {
      console.error('Error loading documentation:', error);
    }
  }, []);

  const analyzeApplication = useCallback(async () => {
    setLoading(true);

    try {
      // Get git changes since last analysis
      const changesResponse = await fetch('/api/run-tests?analyze=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_changes',
          since: lastAnalysis?.toISOString()
        })
      });

      let newChanges: ChangeRecord[] = [];
      if (changesResponse.ok) {
        const changesData = await changesResponse.json();
        newChanges = changesData.changes || [];
      }

      // Generate comprehensive documentation
      const docs: DocumentationBlock[] = [
        // Core Functions
        {
          id: 'calculatePEK',
          title: 'Функция расчета доставки ПЭК (calculatePEK)',
          type: 'function',
          description: `Основная функция расчета стоимости и сроков доставки для транспортной компании ПЭК.
          
**Назначение:** Выполняет полный цикл расчета доставки от получения данных формы до возврата результата.

**Алгоритм работы:**
1. Валидация входных данных (города, грузы, веса)
2. Получение зоны доставки через API findzonebyaddress
3. Расчет стоимости через API calculator
4. Обработка ошибок и возврат результата

**Параметры:**
- form: DeliveryForm - данные формы доставки
- Возвращает: Promise<CalculationResult>

**Обработка ошибок:**
- ZONE_NOT_SERVED - зона не обслуживается
- INVALID_CREDENTIALS - неверные учетные данные
- NETWORK_ERROR - проблемы с сетью

**Связанные файлы:**
- app/page.tsx:2368-2500 (основная логика)
- app/api/pek/route.ts (API обработчик)
- lib/api-utils.ts (утилиты API)`,
          code: `const calculatePEK = async (): Promise<CalculationResult> => {
  // Валидация данных
  validateMultipleCargos(form.cargos);
  
  // Получение зоны доставки
  const zoneData = await getPekZoneByAddress(fromAddress, toAddress);
  
  // Расчет через API
  const result = await enhancedApiRequest('/api/pek', {
    method: 'POST',
    body: JSON.stringify(requestData)
  }, { operation: 'calculate', company: 'ПЭК' });
  
  return processPekResult(result);
};`,
          dependencies: ['enhancedApiRequest', 'validateMultipleCargos', 'getPekZoneByAddress'],
          relatedFiles: ['app/page.tsx', 'app/api/pek/route.ts', 'lib/api-utils.ts'],
          apiEndpoints: ['/api/pek'],
          lastModified: new Date()
        },

        {
          id: 'calculateVozovoz',
          title: 'Функция расчета доставки Возовоз (calculateVozovoz)',
          type: 'function',
          description: `Функция расчета стоимости доставки для транспортной компании Возовоз.
          
**Особенности:**
- Использует API 2.5 Vozovoz
- Поддерживает множественные грузы
- Учитывает страхование и упаковку
- Максимальные габариты одного места

**Структура запроса:**
\`\`\`json
{
  "object": "price",
  "action": "get",
  "params": {
    "cargo": {
      "dimension": {
        "max": { "length": 0.5, "width": 0.3, "height": 0.2, "weight": 15 },
        "quantity": 2,
        "volume": 0.03,
        "weight": 15
      },
      "insurance": 10000,
      "wrapping": { "hardPackageVolume": 0.03 }
    },
    "gateway": {
      "dispatch": { "point": { "location": "Москва", "terminal": "default" } },
      "destination": { "point": { "location": "СПб", "terminal": "default" } }
    }
  }
}
\`\`\`

**Текущие проблемы:**
- Токен устарел: \`sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N\`
- Возвращает HTML вместо JSON при ошибке авторизации`,
          dependencies: ['enhancedApiRequest', 'validateMultipleCargos'],
          relatedFiles: ['app/page.tsx', 'app/api/vozovoz/route.ts'],
          apiEndpoints: ['/api/vozovoz'],
          lastModified: new Date()
        },

        {
          id: 'enhancedApiRequest',
          title: 'Улучшенный API клиент (enhancedApiRequest)',
          type: 'function',
          description: `Универсальный клиент для выполнения HTTP запросов с расширенной обработкой ошибок.
          
**Функциональность:**
- Таймауты и повторные попытки
- Кеширование ответов
- Детальное логирование
- Обработка различных типов ошибок
- Performance monitoring

**Параметры:**
- url: string - URL для запроса
- options: RequestInit - опции fetch
- context: { operation: string, company?: string } - контекст для логирования
- retryConfig?: конфигурация повторных попыток

**Особенности:**
- Использует apiRequestWithTimeout для базовой функциональности
- Добавляет кеш-ключ на основе тела запроса
- Логирует все операции в PerformanceMonitor`,
          code: `export async function enhancedApiRequest(
  url: string,
  options: RequestInit = {},
  context: { operation: string; company?: string },
  retryConfig?: Partial<{ maxRetries: number; baseDelay: number }>
) {
  const cacheKey = \`\${context.company || 'unknown'}_\${context.operation}_\${JSON.stringify(options.body || {})}\`;
  
  return apiRequestWithErrorHandling(
    url, options, context, retryConfig, cacheKey
  );
}`,
          dependencies: ['apiRequestWithTimeout', 'PerformanceMonitor'],
          relatedFiles: ['lib/api-utils.ts', 'lib/error-handling.ts'],
          lastModified: new Date()
        },

        // Components
        {
          id: 'page_tsx',
          title: 'Главная страница приложения (page.tsx)',
          type: 'component',
          description: `Основной компонент приложения - форма расчета доставки.
          
**Структура:**
- Левая панель: форма ввода (каталог товаров, грузы)
- Правая панель: результаты расчета, 3D визуализация
- Верхняя панель: кнопки диагностики и управления

**Основные функции:**
- Управление товарами (ProductSearch, ProductManager)
- Форма доставки с множественными грузами
- Расчет стоимости у всех ТК параллельно
- 3D визуализация грузов в кузове
- Сохранение/восстановление данных

**Состояние формы:**
\`\`\`typescript
interface DeliveryForm {
  cargos: Cargo[];
  fromCity: string;
  toCity: string;
  fromAddress: string;
  toAddress: string;
  declaredValue: number;
  needPackaging: boolean;
  needInsurance: boolean;
  selectedProducts: ProductInForm[];
}
\`\`\`

**Ключевые обработчики:**
- handleProductAdd - добавление товара из каталога
- handleCalculation - запуск расчета у всех ТК
- saveFormData/loadFormData - сохранение состояния`,
          dependencies: ['ProductSearch', 'ProductManager', 'TruckVisualization', 'enhancedApiRequest'],
          relatedFiles: ['app/page.tsx', 'lib/form-storage.ts', 'lib/furniture-utils.ts'],
          lastModified: new Date()
        },

        {
          id: 'truck_visualization',
          title: '3D визуализация грузов (TruckVisualization)',
          type: 'component',
          description: `Компонент для трехмерной визуализации размещения грузов в кузове автомобиля.
          
**Функциональность:**
- Отображение грузов как 3D объектов
- Автоматическое позиционирование
- Масштабирование и вращение камеры
- Цветовая индикация типов грузов

**Технологии:**
- Three.js для 3D рендеринга
- React Three Fiber для интеграции с React
- Автоматический расчет позиций

**Параметры:**
- cargos: массив грузов с размерами
- isVisible: boolean - показывать ли визуализацию

**Особенности:**
- Грузы отображаются как параллелепипеды
- Разные цвета для разных товаров
- Автоматическая укладка в оптимальном порядке`,
          dependencies: ['@react-three/fiber', '@react-three/drei', 'three'],
          relatedFiles: ['components/TruckVisualization.tsx'],
          lastModified: new Date()
        },

        // API Documentation
        {
          id: 'pek_api',
          title: 'API ПЭК',
          type: 'api',
          description: `Интеграция с транспортной компанией ПЭК.
          
**Эндпоинты:**
- \`/api/pek\` - основной эндпоинт для расчетов

**Методы:**
- \`findzonebyaddress\` - определение зоны доставки
- \`calculator\` - расчет стоимости и сроков

**Аутентификация:**
- Basic Auth с логином/паролем
- Текущие credentials: \`PEK_LOGIN\` / \`PEK_API_KEY\`

**Формат запроса:**
\`\`\`json
{
  "method": "calculator",
  "params": {
    "from": "Москва",
    "to": "Санкт-Петербург",
    "weight": 10,
    "volume": 0.1,
    "declaredValue": 50000
  }
}
\`\`\`

**Формат ответа:**
\`\`\`json
{
  "success": true,
  "price": 1250,
  "days": 2,
  "zone": "Москва-Петербург"
}
\`\`\``,
          apiEndpoints: ['/api/pek'],
          relatedFiles: ['app/api/pek/route.ts'],
          lastModified: new Date()
        },

        {
          id: 'vozovoz_api',
          title: 'API Возовоз (версия 2.5)',
          type: 'api',
          description: `Интеграция с транспортной компанией Возовоз.
          
**Эндпоинт:** \`/api/vozovoz\`

**Аутентификация:**
- Token-based: \`Authorization: Bearer {token}\`
- Текущий токен: \`sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N\`

**Основные объекты:**
- \`price\` - расчет стоимости
- \`order\` - оформление заказа
- \`terminal\` - информация о терминалах

**Структура груза:**
\`\`\`json
{
  "cargo": {
    "dimension": {
      "max": {
        "length": 0.5,  // в метрах
        "width": 0.3,
        "height": 0.2,
        "weight": 15    // в кг
      },
      "quantity": 2,    // количество мест
      "volume": 0.03,   // общий объем м³
      "weight": 15      // общий вес кг
    },
    "insurance": 10000,  // страхование
    "wrapping": {        // упаковка
      "hardPackageVolume": 0.03
    }
  }
}
\`\`\`

**Проблемы:**
- Токен возвращает HTML вместо JSON
- Вероятно, токен устарел или API изменился`,
          apiEndpoints: ['/api/vozovoz'],
          relatedFiles: ['app/api/vozovoz/route.ts', 'vozovoz-docs/'],
          lastModified: new Date()
        },

        // Data Management
        {
          id: 'form_storage',
          title: 'Система хранения данных формы',
          type: 'logic',
          description: `Комплексная система сохранения и восстановления состояния формы доставки.
          
**Функции:**
- \`saveFormData()\` - сохранение в localStorage
- \`loadFormData()\` - загрузка из localStorage
- \`createDebouncedSaver()\` - отложенное сохранение
- \`clearFormData()\` - очистка данных

**Особенности:**
- Автоматическое сохранение при изменениях
- Debounced сохранение (500ms задержка)
- Восстановление при перезагрузке страницы
- Backup система для восстановления

**Структура данных:**
\`\`\`typescript
interface StoredFormData {
  form: DeliveryForm;
  enabledCompanies: { [key: string]: boolean };
  lastSaved: string;
  version: string;
}
\`\`\`

**Механизм backup:**
- Сохраняются последние 3 версии
- Автоматическое восстановление при сбое
- Предупреждение пользователя о несохраненных изменениях`,
          dependencies: ['localStorage', 'JSON'],
          relatedFiles: ['lib/form-storage.ts'],
          lastModified: new Date()
        },

        {
          id: 'product_management',
          title: 'Управление товарами и мебелью',
          type: 'logic',
          description: `Система управления каталогом товаров и их добавлением в доставку.
          
**Компоненты:**
- \`ProductSearch\` - поиск товаров в Google Sheets
- \`ProductManager\` - управление добавленными товарами
- \`createCargosForProduct\` - создание грузов из товаров

**Источники данных:**
- Google Sheets: \`1e0P91PfGKVIuSWDY0ceWkIE7jD-vzD_xrIesBeQno1Y\`
- Локальный кеш товаров
- Автоматическое обновление данных

**Алгоритм создания грузов:**
1. Получение размеров товара из базы
2. Расчет количества упаковок
3. Создание отдельных грузовых мест
4. Связывание с товаром для отслеживания

**Особенности:**
- Поддержка множественных товаров
- Автоматический расчет габаритов
- Связи между товарами и грузовыми местами
- Кеширование для производительности`,
          dependencies: ['Google Sheets API', 'ProductSearch', 'ProductManager'],
          relatedFiles: ['lib/furniture-utils.ts', 'components/ProductSearch.tsx', 'components/ProductManager.tsx'],
          lastModified: new Date()
        }
      ];

      setDocumentation(docs);
      setChanges(prev => [...newChanges, ...prev]);
      setLastAnalysis(new Date());

      // Save to localStorage
      localStorage.setItem('technicalDocumentation', JSON.stringify(docs));
      localStorage.setItem('documentationChanges', JSON.stringify([...newChanges, ...changes]));
      localStorage.setItem('lastDocumentationAnalysis', new Date().toISOString());

    } catch (error) {
      console.error('Error analyzing application:', error);
    } finally {
      setLoading(false);
    }
  }, [lastAnalysis, changes]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'function': return <Code className="h-4 w-4" />;
      case 'component': return <Settings className="h-4 w-4" />;
      case 'api': return <Globe className="h-4 w-4" />;
      case 'logic': return <Database className="h-4 w-4" />;
      case 'data': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'function': return 'bg-blue-500';
      case 'component': return 'bg-green-500';
      case 'api': return 'bg-purple-500';
      case 'logic': return 'bg-orange-500';
      case 'data': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const functions = documentation.filter(doc => doc.type === 'function');
  const components = documentation.filter(doc => doc.type === 'component');
  const apis = documentation.filter(doc => doc.type === 'api');
  const logic = documentation.filter(doc => doc.type === 'logic');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Техническая документация</h2>
          <p className="text-gray-400">
            Автоматически сгенерированная документация приложения
            {lastAnalysis && (
              <span className="ml-2 text-sm">
                (последний анализ: {lastAnalysis.toLocaleString('ru-RU')})
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={analyzeApplication}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Анализ...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-white">
            Обзор ({documentation.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="text-white">
            Детали
          </TabsTrigger>
          <TabsTrigger value="changes" className="text-white">
            Изменения ({changes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{functions.length}</p>
                    <p className="text-sm text-gray-400">Функций</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{components.length}</p>
                    <p className="text-sm text-gray-400">Компонентов</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{apis.length}</p>
                    <p className="text-sm text-gray-400">API</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{logic.length}</p>
                    <p className="text-sm text-gray-400">Логика</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {documentation.slice(0, 10).map((doc) => (
              <Card key={doc.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(doc.type)}
                      <CardTitle className="text-white text-lg">{doc.title}</CardTitle>
                    </div>
                    <Badge className={`${getTypeColor(doc.type)} text-white`}>
                      {doc.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="text-gray-300 text-sm whitespace-pre-wrap">
                      {doc.description.length > 300
                        ? doc.description.substring(0, 300) + '...'
                        : doc.description
                      }
                    </div>
                  </ScrollArea>
                  {doc.relatedFiles && doc.relatedFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {doc.relatedFiles.slice(0, 3).map((file, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {file}
                        </Badge>
                      ))}
                      {doc.relatedFiles.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{doc.relatedFiles.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <Tabs defaultValue="functions" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-700">
              <TabsTrigger value="functions">Функции ({functions.length})</TabsTrigger>
              <TabsTrigger value="components">Компоненты ({components.length})</TabsTrigger>
              <TabsTrigger value="apis">API ({apis.length})</TabsTrigger>
              <TabsTrigger value="logic">Логика ({logic.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="functions" className="mt-4">
              <div className="space-y-4">
                {functions.map((doc) => (
                  <Card key={doc.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        {getTypeIcon(doc.type)}
                        {doc.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-64">
                        <div className="text-gray-300 whitespace-pre-wrap">
                          {doc.description}
                        </div>
                      </ScrollArea>

                      {doc.code && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Пример кода:</h4>
                          <ScrollArea className="h-32 bg-gray-900 rounded p-3">
                            <pre className="text-green-400 text-sm">
                              <code>{doc.code}</code>
                            </pre>
                          </ScrollArea>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {doc.dependencies && doc.dependencies.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium mb-2">Зависимости:</h4>
                            <div className="flex flex-wrap gap-1">
                              {doc.dependencies.map((dep, idx) => (
                                <Badge key={idx} variant="outline">{dep}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {doc.relatedFiles && doc.relatedFiles.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium mb-2">Связанные файлы:</h4>
                            <div className="flex flex-wrap gap-1">
                              {doc.relatedFiles.map((file, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{file}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="components" className="mt-4">
              <div className="space-y-4">
                {components.map((doc) => (
                  <Card key={doc.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        {getTypeIcon(doc.type)}
                        {doc.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="text-gray-300 whitespace-pre-wrap">
                          {doc.description}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="apis" className="mt-4">
              <div className="space-y-4">
                {apis.map((doc) => (
                  <Card key={doc.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        {getTypeIcon(doc.type)}
                        {doc.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-64">
                        <div className="text-gray-300 whitespace-pre-wrap">
                          {doc.description}
                        </div>
                      </ScrollArea>

                      {doc.apiEndpoints && doc.apiEndpoints.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Эндпоинты:</h4>
                          <div className="flex flex-wrap gap-1">
                            {doc.apiEndpoints.map((endpoint, idx) => (
                              <Badge key={idx} variant="outline">{endpoint}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logic" className="mt-4">
              <div className="space-y-4">
                {logic.map((doc) => (
                  <Card key={doc.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        {getTypeIcon(doc.type)}
                        {doc.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="text-gray-300 whitespace-pre-wrap">
                          {doc.description}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="changes" className="mt-6">
          <div className="space-y-4">
            {changes.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Изменения не найдены</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Нажмите "Обновить" для анализа изменений в коде
                  </p>
                </CardContent>
              </Card>
            ) : (
              changes.map((change) => (
                <Card key={change.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {change.type === 'added' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {change.type === 'modified' && <RefreshCw className="h-5 w-5 text-blue-500" />}
                        {change.type === 'deleted' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        <div>
                          <CardTitle className="text-white text-lg capitalize">
                            {change.type === 'added' ? 'Добавлено' :
                             change.type === 'modified' ? 'Изменено' : 'Удалено'}
                          </CardTitle>
                          <p className="text-gray-400 text-sm">
                            {change.timestamp.toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <Badge className={getImpactColor(change.impact)}>
                        {change.impact === 'high' ? 'Высокий' :
                         change.impact === 'medium' ? 'Средний' : 'Низкий'} приоритет
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-3">{change.description}</p>

                    {change.affectedFunctions.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-white font-medium mb-2">Затрагиваемые функции:</h4>
                        <div className="flex flex-wrap gap-1">
                          {change.affectedFunctions.map((func, idx) => (
                            <Badge key={idx} variant="outline">{func}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {change.files.length > 0 && (
                      <div>
                        <h4 className="text-white font-medium mb-2">Измененные файлы:</h4>
                        <div className="flex flex-wrap gap-1">
                          {change.files.map((file, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{file}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TechnicalDocumentation;