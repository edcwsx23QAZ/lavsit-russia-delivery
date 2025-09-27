'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Building2, Truck, Activity, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export default function DiagnosticPage() {
  const [isTestingPEK, setIsTestingPEK] = useState(false);
  const [isTestingDellin, setIsTestingDellin] = useState(false);
  const [isTestingRailContinent, setIsTestingRailContinent] = useState(false);
  const [isTestingVozovoz, setIsTestingVozovoz] = useState(false);
  
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

  const testAllAPIs = async () => {
    await Promise.all([
      testPEKAPI(),
      testDellinAPI(), 
      testRailContinentAPI(),
      testVozovozAPI()
    ]);
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

        <div className="flex gap-4 mb-6">
          <Button onClick={testAllAPIs} className="bg-blue-600 hover:bg-blue-700">
            <Activity className="h-4 w-4 mr-2" />
            Тестировать все API
          </Button>
          <Button onClick={() => window.open('/env-check', '_blank')} variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Проверить переменные окружения
          </Button>
          <Button onClick={() => window.close()} variant="outline">
            Закрыть
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        </div>
      </div>
    </div>
  );
}