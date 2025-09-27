'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Building2, Truck, Activity, CheckCircle, AlertCircle, XCircle, TestTube, PlayCircle } from 'lucide-react';

export default function DiagnosticPage() {
  const [isTestingPEK, setIsTestingPEK] = useState(false);
  const [isTestingDellin, setIsTestingDellin] = useState(false);
  const [isTestingRailContinent, setIsTestingRailContinent] = useState(false);
  const [isTestingVozovoz, setIsTestingVozovoz] = useState(false);
  const [isTestingNordWheel, setIsTestingNordWheel] = useState(false);
  const [isFullTesting, setIsFullTesting] = useState(false);
  
  const [diagnosticResults, setDiagnosticResults] = useState<{
    [key: string]: {
      status: 'success' | 'warning' | 'error' | 'pending';
      message: string;
      details?: any;
      response?: any;
      requestData?: any;
      timing?: number;
    }
  }>({});

  const [fullTestResults, setFullTestResults] = useState<{
    summary: {
      totalTests: number;
      successful: number;
      failed: number;
      errors: string[];
    };
    details: any[];
  } | null>(null);

  const updateResult = (service: string, result: any) => {
    setDiagnosticResults(prev => ({
      ...prev,
      [service]: result
    }));
  };

  const testPEKAPI = async () => {
    setIsTestingPEK(true);
    const startTime = Date.now();
    
    try {
      console.log('🔧 Начинаем диагностику ПЭК API...');
      
      // Тестовые данные для проверки ПЭК
      const testData = {
        fromCity: 'Москва',
        toCity: 'Санкт-Петербург',
        cargos: [{
          length: 100,
          width: 100,
          height: 100,
          weight: 10
        }],
        declaredValue: 50000,
        fromAddressDelivery: false,
        toAddressDelivery: false,
        needPackaging: false,
        needInsurance: false
      };

      const response = await fetch('/api/pek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      const timing = Date.now() - startTime;

      console.log('🔧 ПЭК API ответ:', data);

      if (response.ok && data.success) {
        updateResult('pek', {
          status: 'success',
          message: `ПЭК API работает корректно. Получен тариф: ${data.data?.price || 'N/A'} ₽`,
          details: data.data,
          response: data,
          requestData: testData,
          timing
        });
      } else {
        updateResult('pek', {
          status: 'warning',
          message: `ПЭК API вернул ошибку: ${data.error || 'Неизвестная ошибка'}`,
          details: data.details,
          response: data,
          requestData: testData,
          timing
        });
      }
    } catch (error: any) {
      console.error('🔧 ПЭК API ошибка:', error);
      updateResult('pek', {
        status: 'error',
        message: `Критическая ошибка ПЭК API: ${error.message}`,
        details: error,
        timing: Date.now() - startTime
      });
    } finally {
      setIsTestingPEK(false);
    }
  };

  const testDellinAPI = async () => {
    setIsTestingDellin(true);
    const startTime = Date.now();
    
    try {
      console.log('🔧 Начинаем диагностику Деловые Линии API...');
      
      const testData = {
        fromCity: 'Москва',
        toCity: 'Санкт-Петербург',
        cargos: [{
          length: 100,
          width: 100,
          height: 100,
          weight: 10
        }],
        declaredValue: 50000,
        fromAddressDelivery: false,
        toAddressDelivery: false,
        needPackaging: false,
        needInsurance: false
      };

      const response = await fetch('/api/dellin-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      const timing = Date.now() - startTime;

      console.log('🔧 Деловые Линии API ответ:', data);

      if (response.ok && data.success) {
        updateResult('dellin', {
          status: 'success',
          message: `Деловые Линии API работает корректно. Получен тариф: ${data.data?.price || 'N/A'} ₽`,
          details: data.data,
          response: data,
          requestData: testData,
          timing
        });
      } else {
        updateResult('dellin', {
          status: 'warning',
          message: `Деловые Линии API вернул ошибку: ${data.error || 'Неизвестная ошибка'}`,
          details: data.details,
          response: data,
          requestData: testData,
          timing
        });
      }
    } catch (error: any) {
      console.error('🔧 Деловые Линии API ошибка:', error);
      updateResult('dellin', {
        status: 'error',
        message: `Критическая ошибка Деловые Линии API: ${error.message}`,
        details: error,
        timing: Date.now() - startTime
      });
    } finally {
      setIsTestingDellin(false);
    }
  };

  const testRailContinentAPI = async () => {
    setIsTestingRailContinent(true);
    const startTime = Date.now();
    
    try {
      console.log('🔧 Начинаем диагностику Rail Continent API...');
      
      const testData = {
        city_sender: 'Москва',
        city_receiver: 'Санкт-Петербург',
        weight: 10,
        volume: 0.1,
        length: 1,
        width: 1,
        height: 1,
        declared_cost: 50000,
        pickup: '0',
        delivery: '0',
        packaging: '0',
        insurance: '0',
        tariff: 'auto'
      };

      const response = await fetch('/api/rail-continent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      const timing = Date.now() - startTime;

      console.log('🔧 Rail Continent API ответ:', data);

      if (response.ok && data.result === 'success') {
        updateResult('railcontinent', {
          status: 'success',
          message: `Rail Continent API работает корректно. Получен тариф: ${data.data?.auto?.priceTotal || 'N/A'} ₽`,
          details: data.data,
          response: data,
          requestData: testData,
          timing
        });
      } else {
        updateResult('railcontinent', {
          status: 'warning',
          message: `Rail Continent API вернул ошибку: ${data.error || 'Неизвестная ошибка'}`,
          details: data.details,
          response: data,
          requestData: testData,
          timing
        });
      }
    } catch (error: any) {
      console.error('🔧 Rail Continent API ошибка:', error);
      updateResult('railcontinent', {
        status: 'error',
        message: `Критическая ошибка Rail Continent API: ${error.message}`,
        details: error,
        timing: Date.now() - startTime
      });
    } finally {
      setIsTestingRailContinent(false);
    }
  };

  const testVozovozAPI = async () => {
    setIsTestingVozovoz(true);
    const startTime = Date.now();
    
    try {
      console.log('🔧 Начинаем диагностику Возовоз API...');
      
      const testData = {
        object: "price",
        action: "get",
        params: {
          cargo: {
            dimension: {
              quantity: 1,
              volume: 0.1,
              weight: 10
            }
          },
          gateway: {
            dispatch: {
              point: {
                location: "Москва",
                terminal: "default"
              }
            },
            destination: {
              point: {
                location: "Санкт-Петербург",
                terminal: "default"
              }
            }
          }
        }
      };

      const response = await fetch('/api/vozovoz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      const timing = Date.now() - startTime;

      console.log('🔧 Возовоз API ответ:', data);

      if (response.ok && data.response) {
        updateResult('vozovoz', {
          status: 'success',
          message: `Возовоз API работает корректно. Получен тариф: ${data.response?.price || 'N/A'} ₽`,
          details: data.response,
          response: data,
          requestData: testData,
          timing
        });
      } else {
        updateResult('vozovoz', {
          status: 'warning',
          message: `Возовоз API вернул ошибку: ${data.error || 'Неизвестная ошибка'}`,
          details: data.details,
          response: data,
          requestData: testData,
          timing
        });
      }
    } catch (error: any) {
      console.error('🔧 Возовоз API ошибка:', error);
      updateResult('vozovoz', {
        status: 'error',
        message: `Критическая ошибка Возовоз API: ${error.message}`,
        details: error,
        timing: Date.now() - startTime
      });
    } finally {
      setIsTestingVozovoz(false);
    }
  };

  const testNordWheelAPI = async () => {
    setIsTestingNordWheel(true);
    const startTime = Date.now();
    
    try {
      console.log('🔧 Начинаем диагностику Nord Wheel API...');
      
      const params = new URLSearchParams({
        from: '91', // Москва
        to: '92', // СПб
        pickup: '0',
        deliver: '0',
        weight: '10',
        volume: '0.1',
        oversized: '0',
        package: '0',
        packageCount: '1',
        insurance: '0',
        sum: '50000',
        documentsReturn: '0',
        fragile: '1',
        length: '1',
        width: '1',
        height: '1'
      });

      const apiUrl = 'https://nordw.ru/tools/api/calc/calculate/';
      const fullUrl = `${apiUrl}?${params.toString()}`;
      
      const response = await fetch(fullUrl);
      const data = await response.json();
      const timing = Date.now() - startTime;

      console.log('🔧 Nord Wheel API ответ:', data);

      if (response.ok && data.status === 'success' && data.data) {
        updateResult('nordwheel', {
          status: 'success',
          message: `Nord Wheel API работает корректно. Получен тариф: ${data.data?.total || 'N/A'} ₽`,
          details: data.data,
          response: data,
          requestData: Object.fromEntries(params),
          timing
        });
      } else {
        updateResult('nordwheel', {
          status: 'warning',
          message: `Nord Wheel API вернул ошибку: ${data.error || data.message || 'Неизвестная ошибка'}`,
          details: data.details,
          response: data,
          requestData: Object.fromEntries(params),
          timing
        });
      }
    } catch (error: any) {
      console.error('🔧 Nord Wheel API ошибка:', error);
      updateResult('nordwheel', {
        status: 'error',
        message: `Критическая ошибка Nord Wheel API: ${error.message}`,
        details: error,
        timing: Date.now() - startTime
      });
    } finally {
      setIsTestingNordWheel(false);
    }
  };

  const testAllAPIs = async () => {
    await Promise.all([
      testPEKAPI(),
      testDellinAPI(), 
      testRailContinentAPI(),
      testVozovozAPI(),
      testNordWheelAPI()
    ]);
  };

  // 🔧 Генератор тестовых данных для множественных грузовых мест
  const generateTestCargos = (count: number) => {
    const cargos = [];
    for (let i = 0; i < count; i++) {
      cargos.push({
        length: 50 + Math.floor(Math.random() * 150), // 50-200 см
        width: 30 + Math.floor(Math.random() * 120),  // 30-150 см  
        height: 20 + Math.floor(Math.random() * 180), // 20-200 см
        weight: 5 + Math.floor(Math.random() * 95)    // 5-100 кг
      });
    }
    return cargos;
  };

  // 🔧 Генератор всех комбинаций опций
  const generateOptionsCombinations = () => {
    const combinations = [];
    const options = [
      { name: 'fromAddressDelivery', values: [true, false] },
      { name: 'toAddressDelivery', values: [true, false] },
      { name: 'needPackaging', values: [true, false] },
      { name: 'needInsurance', values: [true, false] }
    ];

    // Генерируем все возможные комбинации (2^4 = 16 комбинаций)
    for (let i = 0; i < Math.pow(2, options.length); i++) {
      const combination: any = {
        fromCity: 'Москва',
        toCity: 'Санкт-Петербург',
        fromAddress: 'ул. Тверская, 1',
        toAddress: 'Невский проспект, 1',
        declaredValue: 50000
      };
      
      options.forEach((option, index) => {
        combination[option.name] = Boolean(i & (1 << index));
      });
      
      combinations.push(combination);
    }
    
    return combinations;
  };

  // 🔧 Функция тестирования одной ТК с определенными параметрами
  const testSingleTK = async (tkName: string, testData: any) => {
    const startTime = Date.now();
    let apiUrl = '';
    let requestData: any = {};
    
    try {
      switch (tkName) {
        case 'pek':
          apiUrl = '/api/pek';
          requestData = { method: 'calculateprice', ...testData };
          break;
        case 'dellin':
          // Используем прямой расчет как в главном калькуляторе
          apiUrl = 'DELLIN_DIRECT';
          requestData = testData;
          break;
        case 'railcontinent':
          apiUrl = '/api/rail-continent';
          requestData = {
            city_sender: testData.fromCity,
            city_receiver: testData.toCity,
            weight: testData.cargos.reduce((sum: number, cargo: any) => sum + cargo.weight, 0),
            volume: testData.cargos.reduce((sum: number, cargo: any) => 
              sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
            ),
            quantity: testData.cargos.length, // 🔧 Новый параметр
            length: Math.max(...testData.cargos.map((c: any) => c.length)) / 100,
            width: Math.max(...testData.cargos.map((c: any) => c.width)) / 100,
            height: Math.max(...testData.cargos.map((c: any) => c.height)) / 100,
            declared_cost: testData.declaredValue,
            pickup: testData.fromAddressDelivery ? '1' : '0',
            delivery: testData.toAddressDelivery ? '1' : '0',
            packaging: testData.needPackaging ? '1' : '0',
            insurance: testData.needInsurance ? '1' : '0',
            tariff: 'auto'
          };
          break;
        case 'vozovoz':
          apiUrl = '/api/vozovoz';
          requestData = {
            object: "price",
            action: "get",
            params: {
              cargo: {
                dimension: {
                  quantity: testData.cargos.length,
                  volume: testData.cargos.reduce((sum: number, cargo: any) => 
                    sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
                  ),
                  weight: testData.cargos.reduce((sum: number, cargo: any) => sum + cargo.weight, 0)
                },
                ...(testData.needInsurance && testData.declaredValue > 0 ? {
                  insurance: testData.declaredValue
                } : {}),
                ...(testData.needPackaging ? {
                  wrapping: {
                    palletCollar: testData.cargos.reduce((sum: number, cargo: any) => 
                      sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
                    )
                  }
                } : {})
              },
              gateway: {
                dispatch: {
                  point: {
                    location: testData.fromCity,
                    ...(testData.fromAddressDelivery ? {
                      address: testData.fromAddress || "адрес отправления"
                    } : {
                      terminal: "default"
                    })
                  }
                },
                destination: {
                  point: {
                    location: testData.toCity,
                    ...(testData.toAddressDelivery ? {
                      address: testData.toAddress || "адрес получения"
                    } : {
                      terminal: "default"
                    })
                  }
                }
              }
            }
          };
          break;
        case 'nordwheel':
          const totalWeight = testData.cargos.reduce((sum: number, cargo: any) => sum + cargo.weight, 0);
          const totalVolume = testData.cargos.reduce((sum: number, cargo: any) => 
            sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
          );
          const maxLength = Math.max(...testData.cargos.map((c: any) => c.length));
          const maxWidth = Math.max(...testData.cargos.map((c: any) => c.width));
          const maxHeight = Math.max(...testData.cargos.map((c: any) => c.height));
          const isOversized = maxLength > 200 || maxWidth > 200 || maxHeight > 200 || totalWeight > 1000;
          
          const params = new URLSearchParams({
            from: '91',
            to: '92',
            pickup: testData.fromAddressDelivery ? '1' : '0',
            deliver: testData.toAddressDelivery ? '1' : '0',
            weight: totalWeight.toString(),
            volume: totalVolume.toString(),
            oversized: isOversized ? '1' : '0',
            package: testData.needPackaging ? '1' : '0',
            packageCount: testData.cargos.length.toString(),
            insurance: testData.needInsurance ? '1' : '0',
            sum: testData.declaredValue.toString(),
            documentsReturn: '0',
            fragile: '1',
            length: (maxLength / 100).toString(),
            width: (maxWidth / 100).toString(),
            height: (maxHeight / 100).toString(),
            multiplePackages: testData.cargos.length > 1 ? '1' : '0'
          });
          
          apiUrl = `https://nordw.ru/tools/api/calc/calculate/?${params.toString()}`;
          requestData = Object.fromEntries(params);
          break;
      }

      let response: any;
      let data: any;

      if (tkName === 'nordwheel') {
        response = await fetch(apiUrl);
        data = await response.json();
      } else if (tkName === 'dellin') {
        // Пропускаем Деловые Линии в массовом тестировании из-за сложности авторизации
        return {
          tk: tkName,
          status: 'skipped',
          message: 'Пропущено (сложная авторизация)',
          timing: Date.now() - startTime,
          requestData,
          cargoCount: testData.cargos.length
        };
      } else {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
        data = await response.json();
      }

      const timing = Date.now() - startTime;

      // Проверяем успешность ответа в зависимости от ТК
      let isSuccess = false;
      let price = 0;
      
      switch (tkName) {
        case 'pek':
          isSuccess = response.ok && data.success;
          price = data.data?.price || 0;
          break;
        case 'railcontinent':
          isSuccess = response.ok && data.result === 'success';
          price = data.data?.auto?.priceTotal || 0;
          break;
        case 'vozovoz':
          isSuccess = response.ok && data.response;
          price = data.response?.price || 0;
          break;
        case 'nordwheel':
          isSuccess = response.ok && data.status === 'success' && data.data;
          price = data.data?.total || 0;
          break;
      }

      return {
        tk: tkName,
        status: isSuccess ? 'success' : 'error',
        message: isSuccess ? `Тариф: ${price} ₽` : (data.error || data.message || 'Ошибка'),
        timing,
        price,
        requestData,
        responseData: data,
        cargoCount: testData.cargos.length
      };

    } catch (error: any) {
      return {
        tk: tkName,
        status: 'error',
        message: `Критическая ошибка: ${error.message}`,
        timing: Date.now() - startTime,
        requestData,
        cargoCount: testData.cargos.length,
        error: error.message
      };
    }
  };

  // 🔧 ПОЛНОЕ ТЕСТИРОВАНИЕ
  const runFullTesting = async () => {
    setIsFullTesting(true);
    setFullTestResults(null);
    
    const allResults: any[] = [];
    const errors: string[] = [];
    let totalTests = 0;
    let successful = 0;
    
    console.log('🧪 ===== НАЧАЛО ПОЛНОГО ТЕСТИРОВАНИЯ =====');
    
    try {
      const transportCompanies = ['pek', 'railcontinent', 'vozovoz', 'nordwheel'];
      const cargoCountTests = [1, 2, 3, 5, 10, 20, 50]; // Тестируем до 50 грузовых мест
      const optionCombinations = generateOptionsCombinations();
      
      console.log(`🧪 Планируется тестов: ${transportCompanies.length} ТК × ${cargoCountTests.length} вариантов мест × ${optionCombinations.length} комбинаций опций = ${transportCompanies.length * cargoCountTests.length * optionCombinations.length}`);
      
      // Ограничиваем количество тестов для производительности
      const maxTestsPerTK = 20; // 20 тестов на ТК (вместо всех комбинаций)
      
      for (const tk of transportCompanies) {
        console.log(`🧪 Тестирование ${tk.toUpperCase()}...`);
        let testsForTK = 0;
        
        // Тестируем различное количество грузовых мест
        for (const cargoCount of cargoCountTests) {
          if (testsForTK >= maxTestsPerTK) break;
          
          // Выбираем несколько комбинаций опций (не все, для экономии времени)
          const selectedCombinations = optionCombinations.slice(0, Math.min(3, Math.floor(maxTestsPerTK / cargoCountTests.length)));
          
          for (const options of selectedCombinations) {
            if (testsForTK >= maxTestsPerTK) break;
            
            const testData = {
              ...options,
              cargos: generateTestCargos(cargoCount)
            };
            
            console.log(`🧪 ${tk}: ${cargoCount} мест, опции: [${Object.entries(options).filter(([k, v]) => typeof v === 'boolean' && v).map(([k, v]) => k).join(', ') || 'базовые'}]`);
            
            const result = await testSingleTK(tk, testData);
            allResults.push(result);
            totalTests++;
            testsForTK++;
            
            if (result.status === 'success') {
              successful++;
              console.log(`✅ ${tk}: ${result.message} (${result.timing}ms)`);
            } else if (result.status === 'skipped') {
              console.log(`⏭️ ${tk}: ${result.message}`);
            } else {
              console.log(`❌ ${tk}: ${result.message} (${result.timing}ms)`);
              errors.push(`${tk}: ${result.message}`);
            }
            
            // Небольшая пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      const summary = {
        totalTests,
        successful,
        failed: totalTests - successful,
        errors
      };
      
      setFullTestResults({
        summary,
        details: allResults
      });
      
      console.log('🧪 ===== РЕЗУЛЬТАТЫ ПОЛНОГО ТЕСТИРОВАНИЯ =====');
      console.log(`📊 Всего тестов: ${totalTests}`);
      console.log(`✅ Успешных: ${successful}`);
      console.log(`❌ Неудачных: ${totalTests - successful}`);
      console.log(`📈 Процент успеха: ${((successful / totalTests) * 100).toFixed(1)}%`);
      
      if (errors.length > 0) {
        console.log('❌ Ошибки:');
        errors.forEach(error => console.log(`   - ${error}`));
      }
      
    } catch (error: any) {
      console.error('🧪 Критическая ошибка полного тестирования:', error);
      errors.push(`Критическая ошибка: ${error.message}`);
      
      setFullTestResults({
        summary: { totalTests, successful, failed: totalTests - successful, errors },
        details: allResults
      });
    } finally {
      setIsFullTesting(false);
      console.log('🧪 ===== КОНЕЦ ПОЛНОГО ТЕСТИРОВАНИЯ =====');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-900/20';
      case 'warning': return 'border-yellow-500 bg-yellow-900/20';
      case 'error': return 'border-red-500 bg-red-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Диагностика транспортных компаний</h1>
          <p className="text-gray-400">Проверка работоспособности API всех подключенных ТК</p>
        </div>

        <div className="flex gap-4 mb-6 flex-wrap">
          <Button onClick={testAllAPIs} className="bg-blue-600 hover:bg-blue-700">
            <Activity className="h-4 w-4 mr-2" />
            Тестировать все API
          </Button>
          <Button 
            onClick={runFullTesting} 
            disabled={isFullTesting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isFullTesting ? 'Полное тестирование...' : 'Полное тестирование'}
          </Button>
          <Button onClick={() => window.open('/env-check', '_blank')} variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Проверить переменные окружения
          </Button>
          <Button onClick={() => window.close()} variant="outline">
            Закрыть
          </Button>
        </div>

        {/* Результаты полного тестирования */}
        {fullTestResults && (
          <Card className="border-gray-700 bg-gray-900 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-purple-400" />
                Результаты полного тестирования
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{fullTestResults.summary.totalTests}</div>
                  <div className="text-sm text-gray-400">Всего тестов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{fullTestResults.summary.successful}</div>
                  <div className="text-sm text-gray-400">Успешных</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{fullTestResults.summary.failed}</div>
                  <div className="text-sm text-gray-400">Неудачных</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {((fullTestResults.summary.successful / fullTestResults.summary.totalTests) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Успешность</div>
                </div>
              </div>
              
              {fullTestResults.summary.errors.length > 0 && (
                <Alert className="border-red-500 bg-red-900/20 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Найденные ошибки:</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {fullTestResults.summary.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {fullTestResults.summary.errors.length > 10 && (
                        <li>... и еще {fullTestResults.summary.errors.length - 10} ошибок</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Подробные результаты</summary>
                <div className="mt-2 max-h-96 overflow-y-auto">
                  <pre className="text-xs p-2 bg-gray-800 rounded">
                    {JSON.stringify(fullTestResults.details, null, 2)}
                  </pre>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* ПЭК */}
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-400" />
                  ПЭК
                </div>
                <Button 
                  onClick={testPEKAPI} 
                  disabled={isTestingPEK}
                  size="sm"
                  variant="outline"
                >
                  {isTestingPEK ? 'Тестирование...' : 'Тест'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticResults.pek ? (
                <Alert className={getStatusColor(diagnosticResults.pek.status)}>
                  <div className="flex items-start gap-2">
                    {getStatusIcon(diagnosticResults.pek.status)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-medium mb-2">{diagnosticResults.pek.message}</div>
                        {diagnosticResults.pek.timing && (
                          <Badge variant="outline" className="mb-2">
                            Время ответа: {diagnosticResults.pek.timing}мс
                          </Badge>
                        )}
                        {diagnosticResults.pek.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm">Подробности</summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-800 rounded overflow-auto">
                              {JSON.stringify(diagnosticResults.pek.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : (
                <p className="text-gray-400">Нажмите "Тест" для проверки API ПЭК</p>
              )}
            </CardContent>
          </Card>

          {/* Деловые Линии */}
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-400" />
                  Деловые Линии
                </div>
                <Button 
                  onClick={testDellinAPI} 
                  disabled={isTestingDellin}
                  size="sm"
                  variant="outline"
                >
                  {isTestingDellin ? 'Тестирование...' : 'Тест'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticResults.dellin ? (
                <Alert className={getStatusColor(diagnosticResults.dellin.status)}>
                  <div className="flex items-start gap-2">
                    {getStatusIcon(diagnosticResults.dellin.status)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-medium mb-2">{diagnosticResults.dellin.message}</div>
                        {diagnosticResults.dellin.timing && (
                          <Badge variant="outline" className="mb-2">
                            Время ответа: {diagnosticResults.dellin.timing}мс
                          </Badge>
                        )}
                        {diagnosticResults.dellin.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm">Подробности</summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-800 rounded overflow-auto">
                              {JSON.stringify(diagnosticResults.dellin.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : (
                <p className="text-gray-400">Нажмите "Тест" для проверки API Деловые Линии</p>
              )}
            </CardContent>
          </Card>

          {/* Rail Continent */}
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-400" />
                  Rail Continent
                </div>
                <Button 
                  onClick={testRailContinentAPI} 
                  disabled={isTestingRailContinent}
                  size="sm"
                  variant="outline"
                >
                  {isTestingRailContinent ? 'Тестирование...' : 'Тест'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticResults.railcontinent ? (
                <Alert className={getStatusColor(diagnosticResults.railcontinent.status)}>
                  <div className="flex items-start gap-2">
                    {getStatusIcon(diagnosticResults.railcontinent.status)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-medium mb-2">{diagnosticResults.railcontinent.message}</div>
                        {diagnosticResults.railcontinent.timing && (
                          <Badge variant="outline" className="mb-2">
                            Время ответа: {diagnosticResults.railcontinent.timing}мс
                          </Badge>
                        )}
                        {diagnosticResults.railcontinent.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm">Подробности</summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-800 rounded overflow-auto">
                              {JSON.stringify(diagnosticResults.railcontinent.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : (
                <p className="text-gray-400">Нажмите "Тест" для проверки API Rail Continent</p>
              )}
            </CardContent>
          </Card>

          {/* Возовоз */}
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-400" />
                  Возовоз
                </div>
                <Button 
                  onClick={testVozovozAPI} 
                  disabled={isTestingVozovoz}
                  size="sm"
                  variant="outline"
                >
                  {isTestingVozovoz ? 'Тестирование...' : 'Тест'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticResults.vozovoz ? (
                <Alert className={getStatusColor(diagnosticResults.vozovoz.status)}>
                  <div className="flex items-start gap-2">
                    {getStatusIcon(diagnosticResults.vozovoz.status)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-medium mb-2">{diagnosticResults.vozovoz.message}</div>
                        {diagnosticResults.vozovoz.timing && (
                          <Badge variant="outline" className="mb-2">
                            Время ответа: {diagnosticResults.vozovoz.timing}мс
                          </Badge>
                        )}
                        {diagnosticResults.vozovoz.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm">Подробности</summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-800 rounded overflow-auto">
                              {JSON.stringify(diagnosticResults.vozovoz.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : (
                <p className="text-gray-400">Нажмите "Тест" для проверки API Возовоз</p>
              )}
            </CardContent>
          </Card>

          {/* Nord Wheel */}
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-cyan-400" />
                  Nord Wheel
                </div>
                <Button 
                  onClick={testNordWheelAPI} 
                  disabled={isTestingNordWheel}
                  size="sm"
                  variant="outline"
                >
                  {isTestingNordWheel ? 'Тестирование...' : 'Тест'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticResults.nordwheel ? (
                <Alert className={getStatusColor(diagnosticResults.nordwheel.status)}>
                  <div className="flex items-start gap-2">
                    {getStatusIcon(diagnosticResults.nordwheel.status)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-medium mb-2">{diagnosticResults.nordwheel.message}</div>
                        {diagnosticResults.nordwheel.timing && (
                          <Badge variant="outline" className="mb-2">
                            Время ответа: {diagnosticResults.nordwheel.timing}мс
                          </Badge>
                        )}
                        {diagnosticResults.nordwheel.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm">Подробности</summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-800 rounded overflow-auto">
                              {JSON.stringify(diagnosticResults.nordwheel.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : (
                <p className="text-gray-400">Нажмите "Тест" для проверки API Nord Wheel</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}