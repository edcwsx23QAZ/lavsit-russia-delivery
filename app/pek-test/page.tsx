'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function PekTestPage() {
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [testAddress, setTestAddress] = useState('г Москва, Шмитовский проезд, д 1, кв 39');

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testFunction();
      setResults(prev => ({ ...prev, [testName]: result }));
    } catch (error: any) {
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          error: true, 
          message: error.message,
          stack: error.stack 
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const renderResult = (testName: string) => {
    const result = results[testName];
    if (!result && !loading[testName]) return null;
    
    if (loading[testName]) {
      return <div className="text-blue-600 font-mono text-sm">🔄 Выполняется...</div>;
    }
    
    return (
      <Textarea 
        value={JSON.stringify(result, null, 2)} 
        readOnly 
        className="font-mono text-sm h-48 mt-2"
      />
    );
  };

  // Тест 1: Проверка работы прокси (тестовый метод)
  const testProxyHealth = async () => {
    const response = await fetch('/api/pek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'test' })
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: await response.json()
    };
  };

  // Тест 2: Поиск зоны по адресу через прокси
  const testFindZoneByAddress = async () => {
    const response = await fetch('/api/pek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'findzonebyaddress',
        address: testAddress
      })
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: await response.json()
    };
  };

  // Тест 3: Упрощенный прокси
  const testSimpleProxy = async () => {
    const response = await fetch('/api/pek-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'test' })
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: await response.json()
    };
  };

  // Тест 4: Прямой вызов к ПЭК через упрощенный прокси
  const testDirectThroughProxy = async () => {
    const response = await fetch('/api/pek-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'direct' })
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: await response.json()
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🧪 Диагностика ПЭК API</h1>
          <p className="text-gray-600">Проверка работы API через серверные прокси (без CORS ошибок)</p>
        </div>

        {/* Настройки теста */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки тестирования</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Тестовый адрес:</label>
                <Input
                  value={testAddress}
                  onChange={(e) => setTestAddress(e.target.value)}
                  placeholder="Введите адрес для тестирования"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Тест 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Проверка прокси (тест)</CardTitle>
              <p className="text-sm text-gray-600">Проверка работы основного прокси API</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runTest('proxy', testProxyHealth)}
                disabled={loading.proxy}
                className="mb-3"
              >
                Тест прокси
              </Button>
              {renderResult('proxy')}
            </CardContent>
          </Card>

          {/* Тест 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Поиск зоны по адресу</CardTitle>
              <p className="text-sm text-gray-600">Реальный вызов ПЭК API через прокси</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runTest('zone', testFindZoneByAddress)}
                disabled={loading.zone}
                className="mb-3"
              >
                Поиск зоны
              </Button>
              {renderResult('zone')}
            </CardContent>
          </Card>

          {/* Тест 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Упрощенный прокси</CardTitle>
              <p className="text-sm text-gray-600">Тестирование запасного прокси</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runTest('simple', testSimpleProxy)}
                disabled={loading.simple}
                className="mb-3"
              >
                Простой прокси
              </Button>
              {renderResult('simple')}
            </CardContent>
          </Card>

          {/* Тест 4 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Прямой вызов ПЭК</CardTitle>
              <p className="text-sm text-gray-600">Прямой вызов к API ПЭК через прокси</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runTest('direct', testDirectThroughProxy)}
                disabled={loading.direct}
                className="mb-3"
              >
                Прямой вызов
              </Button>
              {renderResult('direct')}
            </CardContent>
          </Card>
        </div>

        {/* Полная диагностика */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🚀 Полная диагностика</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                console.log('🚀 Запуск полной диагностики ПЭК API');
                
                // Запускаем все тесты последовательно
                await runTest('proxy', testProxyHealth);
                await runTest('simple', testSimpleProxy);
                await runTest('zone', testFindZoneByAddress);
                await runTest('direct', testDirectThroughProxy);
                
                console.log('✅ Диагностика завершена');
              }}
              disabled={Object.values(loading).some(Boolean)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              🚀 ЗАПУСТИТЬ ВСЕ ТЕСТЫ
            </Button>
          </CardContent>
        </Card>

        {/* Статус переменных окружения */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 Справка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p><strong>Ожидаемые результаты:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Тест 1:</strong> Должен вернуть статус "OK" и информацию о прокси</li>
                <li><strong>Тест 2:</strong> Должен вернуть данные о зоне доставки для указанного адреса</li>
                <li><strong>Тест 3:</strong> Должен показать информацию о переменных окружения</li>
                <li><strong>Тест 4:</strong> Должен сделать прямой вызов к API ПЭК с авторизацией</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800">
                  <strong>💡 Совет:</strong> Если тесты не работают, проверьте настройки на странице 
                  <a href="/env-check" className="text-blue-600 underline ml-1">/env-check</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}