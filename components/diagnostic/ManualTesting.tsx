'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Save, RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Test case structure
interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  expectedResult: string;
  testData: {
    fromCity: string;
    toCity: string;
    fromAddress?: string;
    toAddress?: string;
    fromTerminal?: boolean;
    toTerminal?: boolean;
    cargo: {
      length: number;
      width: number;
      height: number;
      weight: number;
    }[];
    packaging?: boolean;
    insurance?: boolean;
    loading?: boolean;
    lifting?: boolean;
  };
}

interface TestResult {
  id: string;
  status: 'passed' | 'failed' | 'pending';
  ourPrice?: number;
  officialPrice?: number;
  difference?: number;
  notes?: string;
  testedAt?: string;
  testerName?: string;
}

// Transport companies
const transportCompanies = [
  { id: 'pek', name: 'ПЭК', officialSite: 'https://pecom.ru/calc/' },
  { id: 'dellin', name: 'Деловые Линии', officialSite: 'https://www.dellin.ru/calculator/' },
  { id: 'railcontinent', name: 'Rail Continent', officialSite: 'https://railcont.ru/calc/' },
  { id: 'vozovoz', name: 'Возовоз', officialSite: 'https://vozovoz.ru/calculator/' },
];

// Test cases for each company
const generateTestCases = (companyId: string): TestCase[] => [
  // Terminal to Terminal tests
  {
    id: `${companyId}_t2t_single`,
    name: 'Терминал → Терминал (1 место)',
    description: 'Доставка одного места стандартного размера от терминала до терминала',
    category: 'terminal_to_terminal',
    priority: 'high',
    expectedResult: 'Расчет должен совпадать с официальным сайтом ±100₽',
    testData: {
      fromCity: 'Москва',
      toCity: 'Санкт-Петербург',
      fromTerminal: true,
      toTerminal: true,
      cargo: [{ length: 120, width: 80, height: 100, weight: 50 }]
    }
  },
  {
    id: `${companyId}_t2t_multi`,
    name: 'Терминал → Терминал (3 места)',
    description: 'Доставка нескольких мест разного размера',
    category: 'terminal_to_terminal',
    priority: 'high',
    expectedResult: 'Расчет должен совпадать с официальным сайтом ±100₽',
    testData: {
      fromCity: 'Москва',
      toCity: 'Екатеринбург',
      fromTerminal: true,
      toTerminal: true,
      cargo: [
        { length: 120, width: 80, height: 100, weight: 50 },
        { length: 60, width: 40, height: 30, weight: 15 },
        { length: 200, width: 100, height: 150, weight: 80 }
      ]
    }
  },
  {
    id: `${companyId}_t2t_oversized`,
    name: 'Терминал → Терминал (негабарит 250см)',
    description: 'Доставка негабаритного груза с одной стороной 250см',
    category: 'terminal_to_terminal',
    priority: 'high',
    expectedResult: 'Расчет должен включать доплату за негабарит',
    testData: {
      fromCity: 'Москва',
      toCity: 'Новосибирск',
      fromTerminal: true,
      toTerminal: true,
      cargo: [{ length: 250, width: 120, height: 100, weight: 200 }]
    }
  },
  
  // Terminal to Address tests
  {
    id: `${companyId}_t2a_single`,
    name: 'Терминал → Адрес (1 место)',
    description: 'Доставка от терминала до адреса получателя',
    category: 'terminal_to_address',
    priority: 'high',
    expectedResult: 'Расчет должен включать доставку до адреса',
    testData: {
      fromCity: 'Москва',
      toCity: 'Казань',
      toAddress: 'ул. Баумана, 58',
      fromTerminal: true,
      toTerminal: false,
      cargo: [{ length: 100, width: 70, height: 80, weight: 35 }]
    }
  },
  {
    id: `${companyId}_t2a_lifting`,
    name: 'Терминал → Адрес + подъем',
    description: 'Доставка с подъемом на этаж',
    category: 'terminal_to_address',
    priority: 'medium',
    expectedResult: 'Расчет должен включать стоимость подъема',
    testData: {
      fromCity: 'Санкт-Петербург',
      toCity: 'Москва',
      toAddress: 'ул. Тверская, 1, кв. 15, 3 этаж',
      fromTerminal: true,
      toTerminal: false,
      lifting: true,
      cargo: [{ length: 150, width: 100, height: 120, weight: 75 }]
    }
  },

  // Address to Terminal tests  
  {
    id: `${companyId}_a2t_single`,
    name: 'Адрес → Терминал (1 место)',
    description: 'Забор груза с адреса до терминала',
    category: 'address_to_terminal',
    priority: 'high',
    expectedResult: 'Расчет должен включать забор с адреса',
    testData: {
      fromCity: 'Москва',
      fromAddress: 'ул. Арбат, 25',
      toCity: 'Уфа',
      fromTerminal: false,
      toTerminal: true,
      cargo: [{ length: 90, width: 60, height: 70, weight: 25 }]
    }
  },
  {
    id: `${companyId}_a2t_loading`,
    name: 'Адрес → Терминал + погрузка',
    description: 'Забор с адреса с услугой погрузки',
    category: 'address_to_terminal',
    priority: 'medium',
    expectedResult: 'Расчет должен включать стоимость погрузки',
    testData: {
      fromCity: 'Екатеринбург',
      fromAddress: 'ул. Ленина, 10',
      toCity: 'Челябинск',
      fromTerminal: false,
      toTerminal: true,
      loading: true,
      cargo: [{ length: 180, width: 120, height: 100, weight: 150 }]
    }
  },

  // Address to Address tests
  {
    id: `${companyId}_a2a_single`,
    name: 'Адрес → Адрес (1 место)',
    description: 'Доставка от адреса до адреса',
    category: 'address_to_address',
    priority: 'high',
    expectedResult: 'Расчет должен включать забор и доставку',
    testData: {
      fromCity: 'Москва',
      fromAddress: 'ул. Садовая, 15',
      toCity: 'Воронеж',
      toAddress: 'ул. Революции, 25',
      fromTerminal: false,
      toTerminal: false,
      cargo: [{ length: 110, width: 80, height: 90, weight: 45 }]
    }
  },
  {
    id: `${companyId}_a2a_full_service`,
    name: 'Адрес → Адрес (полный сервис)',
    description: 'Доставка с упаковкой, страховкой, погрузкой и подъемом',
    category: 'address_to_address',
    priority: 'medium',
    expectedResult: 'Расчет должен включать все дополнительные услуги',
    testData: {
      fromCity: 'Санкт-Петербург',
      fromAddress: 'Невский пр., 100',
      toCity: 'Краснодар',
      toAddress: 'ул. Красная, 50, 5 этаж',
      fromTerminal: false,
      toTerminal: false,
      packaging: true,
      insurance: true,
      loading: true,
      lifting: true,
      cargo: [{ length: 160, width: 90, height: 110, weight: 85 }]
    }
  },

  // Package and insurance tests
  {
    id: `${companyId}_packaging_test`,
    name: 'Тест упаковки',
    description: 'Сравнение расчета с упаковкой и без',
    category: 'packaging',
    priority: 'medium',
    expectedResult: 'Разница должна соответствовать стоимости упаковки',
    testData: {
      fromCity: 'Москва',
      toCity: 'Нижний Новгород',
      fromTerminal: true,
      toTerminal: true,
      packaging: true,
      cargo: [{ length: 100, width: 80, height: 60, weight: 30 }]
    }
  },
  {
    id: `${companyId}_insurance_test`,
    name: 'Тест страхования',
    description: 'Сравнение расчета со страхованием и без',
    category: 'insurance',
    priority: 'medium',
    expectedResult: 'Разница должна составлять % от объявленной стоимости',
    testData: {
      fromCity: 'Москва',
      toCity: 'Самара',
      fromTerminal: true,
      toTerminal: true,
      insurance: true,
      cargo: [{ length: 120, width: 100, height: 80, weight: 60 }]
    }
  },

  // Heavy cargo test
  {
    id: `${companyId}_heavy_cargo`,
    name: 'Тяжелый груз (500кг)',
    description: 'Доставка тяжелого груза',
    category: 'heavy_cargo',
    priority: 'low',
    expectedResult: 'Должен быть расчет по весу или объему в зависимости от коэффициента',
    testData: {
      fromCity: 'Москва',
      toCity: 'Ростов-на-Дону',
      fromTerminal: true,
      toTerminal: true,
      cargo: [{ length: 200, width: 120, height: 100, weight: 500 }]
    }
  }
];

export default function ManualTesting() {
  const [selectedCompany, setSelectedCompany] = useState<string>('pek');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['terminal_to_terminal']));
  const [testerName, setTesterName] = useState<string>('');

  // Load saved test results and tester name
  useEffect(() => {
    const savedResults = localStorage.getItem('manualTestResults');
    if (savedResults) {
      try {
        setTestResults(JSON.parse(savedResults));
      } catch (error) {
        console.error('Error loading test results:', error);
      }
    }

    const savedTester = localStorage.getItem('testerName');
    if (savedTester) {
      setTesterName(savedTester);
    }
  }, []);

  // Save test results to localStorage
  const saveTestResults = () => {
    localStorage.setItem('manualTestResults', JSON.stringify(testResults));
    localStorage.setItem('testerName', testerName);
  };

  // Update test result
  const updateTestResult = (testId: string, updates: Partial<TestResult>) => {
    setTestResults(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        id: testId,
        ...updates,
        testedAt: new Date().toLocaleString('ru-RU'),
        testerName: testerName
      }
    }));
  };

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get test cases for selected company
  const testCases = generateTestCases(selectedCompany);
  
  // Group test cases by category
  const categorizedTests = testCases.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, TestCase[]>);

  // Category names for display
  const categoryNames = {
    terminal_to_terminal: 'Терминал → Терминал',
    terminal_to_address: 'Терминал → Адрес',
    address_to_terminal: 'Адрес → Терминал',
    address_to_address: 'Адрес → Адрес',
    packaging: 'Упаковка',
    insurance: 'Страхование',
    heavy_cargo: 'Тяжелые грузы'
  };

  // Calculate statistics
  const stats = {
    total: testCases.length,
    passed: Object.values(testResults).filter(r => r.status === 'passed').length,
    failed: Object.values(testResults).filter(r => r.status === 'failed').length,
    pending: testCases.length - Object.values(testResults).filter(r => r.status !== 'pending').length
  };

  const currentCompany = transportCompanies.find(c => c.id === selectedCompany);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Ручное тестирование 2.0 - Проверка точности расчетов
          </CardTitle>
          <div className="text-sm text-gray-600">
            Сравнение расчетов нашего приложения с официальными сайтами ТК (точность ±100₽)
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Tester name input */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Тестировщик:</label>
              <Input
                value={testerName}
                onChange={(e) => setTesterName(e.target.value)}
                placeholder="Введите ваше имя"
                className="max-w-xs"
              />
              <Button onClick={saveTestResults} variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                Сохранить
              </Button>
            </div>

            {/* Company selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Транспортная компания:</label>
              <div className="flex gap-2">
                {transportCompanies.map(company => (
                  <Button
                    key={company.id}
                    variant={selectedCompany === company.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCompany(company.id)}
                  >
                    {company.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Всего: {stats.total}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Пройдено: {stats.passed}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Провалено: {stats.failed}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Ожидают: {stats.pending}
                </Badge>
              </div>
            </div>

            {/* Official site link */}
            {currentCompany && (
              <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="text-sm">
                  <strong>Официальный калькулятор {currentCompany.name}:</strong>
                  <a
                    href={currentCompany.officialSite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {currentCompany.officialSite}
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test cases by category */}
      {Object.entries(categorizedTests).map(([category, tests]) => (
        <Card key={category}>
          <Collapsible 
            open={openCategories.has(category)}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {openCategories.has(category) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    {categoryNames[category as keyof typeof categoryNames]} ({tests.length})
                  </span>
                  <div className="flex gap-1">
                    {tests.map(test => {
                      const result = testResults[test.id];
                      const status = result?.status || 'pending';
                      return (
                        <div
                          key={test.id}
                          className={`w-3 h-3 rounded-full ${
                            status === 'passed' ? 'bg-green-500' :
                            status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                          }`}
                        />
                      );
                    })}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                {tests.map(test => (
                  <TestCaseComponent
                    key={test.id}
                    test={test}
                    result={testResults[test.id]}
                    onUpdateResult={(updates) => updateTestResult(test.id, updates)}
                    companyName={currentCompany?.name || ''}
                  />
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {/* Reset button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => {
            if (confirm('Вы уверены, что хотите сбросить все результаты тестов?')) {
              setTestResults({});
              localStorage.removeItem('manualTestResults');
            }
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Сбросить все результаты
        </Button>
      </div>
    </div>
  );
}

// Individual test case component
function TestCaseComponent({ 
  test, 
  result, 
  onUpdateResult, 
  companyName 
}: { 
  test: TestCase;
  result?: TestResult;
  onUpdateResult: (updates: Partial<TestResult>) => void;
  companyName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCargoData = (cargo: any[]) => {
    return cargo.map((item, index) => 
      `Место ${index + 1}: ${item.length}×${item.width}×${item.height}см, ${item.weight}кг`
    ).join('; ');
  };

  const difference = result?.ourPrice && result?.officialPrice ? 
    Math.abs(result.ourPrice - result.officialPrice) : null;
  
  const isWithinTolerance = difference !== null ? difference <= 100 : null;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium">{test.name}</h4>
            <Badge className={getPriorityColor(test.priority)} variant="secondary">
              {test.priority}
            </Badge>
            {result && (
              <Badge 
                variant={result.status === 'passed' ? 'default' : 
                        result.status === 'failed' ? 'destructive' : 'secondary'}
                className={result.status === 'passed' ? 'bg-green-600' : ''}
              >
                {result.status === 'passed' ? 'Пройден' :
                 result.status === 'failed' ? 'Провален' : 'Ожидает'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{test.description}</p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            {isExpanded ? 'Скрыть детали' : 'Показать детали'}
          </Button>

          {isExpanded && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-1">
              <p><strong>Маршрут:</strong> {test.testData.fromCity} → {test.testData.toCity}</p>
              <p><strong>Тип доставки:</strong> 
                {test.testData.fromTerminal ? 'Терминал' : `Адрес (${test.testData.fromAddress})`} → 
                {test.testData.toTerminal ? 'Терминал' : `Адрес (${test.testData.toAddress})`}
              </p>
              <p><strong>Груз:</strong> {formatCargoData(test.testData.cargo)}</p>
              {(test.testData.packaging || test.testData.insurance || test.testData.loading || test.testData.lifting) && (
                <p><strong>Доп. услуги:</strong> {[
                  test.testData.packaging && 'Упаковка',
                  test.testData.insurance && 'Страхование', 
                  test.testData.loading && 'Погрузка',
                  test.testData.lifting && 'Подъем'
                ].filter(Boolean).join(', ')}</p>
              )}
              <p><strong>Ожидаемый результат:</strong> {test.expectedResult}</p>
            </div>
          )}
        </div>

        <div className="ml-4 space-y-2 min-w-[300px]">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={result?.status === 'passed'}
              onCheckedChange={(checked) => 
                onUpdateResult({ status: checked ? 'passed' : 'failed' })
              }
            />
            <span className="text-sm">Тест пройден</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-gray-600">Наш расчет:</label>
              <Input
                type="number"
                value={result?.ourPrice || ''}
                onChange={(e) => onUpdateResult({ ourPrice: Number(e.target.value) })}
                placeholder="₽"
                className="h-7"
              />
            </div>
            <div>
              <label className="block text-gray-600">Офиц. сайт:</label>
              <Input
                type="number" 
                value={result?.officialPrice || ''}
                onChange={(e) => onUpdateResult({ officialPrice: Number(e.target.value) })}
                placeholder="₽"
                className="h-7"
              />
            </div>
          </div>

          {difference !== null && (
            <div className={`text-xs p-2 rounded ${isWithinTolerance ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Разница: {difference}₽ {isWithinTolerance ? '(в пределах нормы)' : '(превышает 100₽)'}
            </div>
          )}

          <Textarea
            value={result?.notes || ''}
            onChange={(e) => onUpdateResult({ notes: e.target.value })}
            placeholder="Комментарии и заметки..."
            className="text-xs h-16"
          />

          {result?.testedAt && (
            <div className="text-xs text-gray-500">
              Проверено: {result.testedAt}
              {result.testerName && ` (${result.testerName})`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}