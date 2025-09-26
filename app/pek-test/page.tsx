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
    }
    setLoading(prev => ({ ...prev, [testName]: false }));
  };

  // Тест 1: Проверка прокси API напрямую
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

  // Тест 2: Поиск зоны по адресу
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

  // Тест 3: Прямой запрос к API ПЭК (для сравнения с сервера)
  const testDirectPekApi = async () => {
    const response = await fetch('https://api.pecom.ru/v1/branches/findzonebyaddress/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 624FC93CA677B23673BB476D4982294DC27E246F'
      },
      body: JSON.stringify({
        address: testAddress
      })
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      corsBlocked: !response.ok && response.type === 'cors',
      data: response.ok ? await response.json() : await response.text()
    };
  };

  // Тест 4: Проверка всех вариантов токена
  const testTokenVariants = async () => {
    const tokens = [
      { name: 'Bearer Token', value: 'Bearer 624FC93CA677B23673BB476D4982294DC27E246F' },
      { name: 'Basic Auth', value: 'Basic ' + btoa('624FC93CA677B23673BB476D4982294DC27E246F:') },
      { name: 'Plain Token', value: '624FC93CA677B23673BB476D4982294DC27E246F' }
    ];

    const results = [];
    
    for (const token of tokens) {
      try {
        const response = await fetch('https://api.pecom.ru/v1/branches/findzonebyaddress/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token.value
          },
          body: JSON.stringify({ address: testAddress })
        });

        results.push({
          tokenType: token.name,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          corsError: !response.ok && response.type === 'cors'
        });
      } catch (error: any) {
        results.push({
          tokenType: token.name,
          error: error.message,
          corsError: error.name === 'TypeError' && error.message.includes('fetch')
        });
      }
    }

    return results;
  };

  // Тест 5: Проверка альтернативных URL
  const testApiUrls = async () => {
    const urls = [
      'https://api.pecom.ru/v1/branches/findzonebyaddress/',
      'https://api.pecom.ru/v1/branches/findzonebyaddress',
      'https://api.pecom.ru/branches/findzonebyaddress/',
      'https://lk.pecom.ru/api/v1/branches/findzonebyaddress/',
    ];

    const results = [];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 624FC93CA677B23673BB476D4982294DC27E246F'
          },
          body: JSON.stringify({ address: testAddress })
        });

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          accessible: true
        });
      } catch (error: any) {
        results.push({
          url,
          error: error.message,
          accessible: false,
          corsError: error.name === 'TypeError'
        });
      }
    }

    return results;
  };
  
  // Тест 6: Проверка GET запросов
  const testGetRequests = async () => {
    const response = await fetch('/api/pek-get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'test',
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
  
  // Тест 7: Полный тест нового прокси
  const testNewProxy = async () => {
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
  
  // Тест 8: Официальный API ПЭК (по документации)
  const testOfficialPekApi = async () => {
    const response = await fetch('/api/pek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'test'
      })
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: await response.json(),
      description: 'Проверка настроек и доступности официального API'
    };
  };

  const renderResult = (testName: string) => {
    const result = results[testName];
    const isLoading = loading[testName];

    if (isLoading) {
      return <div className="text-blue-600">Загрузка...</div>;
    }

    if (!result) {
      return <div className="text-gray-500">Не запущен</div>;
    }

    return (
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-64">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Диагностика API ПЭК</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Тестовый адрес:</label>
        <Input 
          value={testAddress} 
          onChange={(e) => setTestAddress(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Проверка Прокси API</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('proxy', testProxyHealth)}
              disabled={loading.proxy}
              className="mb-3"
            >
              Проверить Прокси
            </Button>
            {renderResult('proxy')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Поиск Зоны через Прокси</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('zone', testFindZoneByAddress)}
              disabled={loading.zone}
              className="mb-3"
            >
              Найти Зону
            </Button>
            {renderResult('zone')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Прямой Запрос к ПЭК</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('direct', testDirectPekApi)}
              disabled={loading.direct}
              className="mb-3"
            >
              Прямой Запрос
            </Button>
            {renderResult('direct')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Тест Токенов</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('tokens', testTokenVariants)}
              disabled={loading.tokens}
              className="mb-3"
            >
              Проверить Токены
            </Button>
            {renderResult('tokens')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5. Тест URL Вариантов</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('urls', testApiUrls)}
              disabled={loading.urls}
              className="mb-3"
            >
              Проверить URLs
            </Button>
            {renderResult('urls')}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6. Тест GET Запросов</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('get', testGetRequests)}
              disabled={loading.get}
              className="mb-3"
            >
              Проверить GET
            </Button>
            {renderResult('get')}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7. Новый Прокси (Множественные Попытки)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('newproxy', testNewProxy)}
              disabled={loading.newproxy}
              className="mb-3"
            >
              Новый Прокси
            </Button>
            {renderResult('newproxy')}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8. Официальный API ПЭК</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Basic Auth + kabinet.pecom.ru по документации
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => runTest('official', testOfficialPekApi)}
              disabled={loading.official}
              className="mb-3 bg-green-600 hover:bg-green-700"
            >
              Официальный API
            </Button>
            {renderResult('official')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Запуск Всех Тестов</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                console.log('🚀 Запуск полной диагностики ПЭК API');
                
                // Приоритет: официальный API первым
                await runTest('official', testOfficialPekApi);
                await runTest('proxy', testProxyHealth);
                await runTest('zone', testFindZoneByAddress);
                
                // Остальные тесты
                await runTest('newproxy', testNewProxy);
                await runTest('get', testGetRequests);
                await runTest('direct', testDirectPekApi);
                await runTest('tokens', testTokenVariants);
                await runTest('urls', testApiUrls);
                
                console.log('✅ Диагностика завершена');
              }}
              disabled={Object.values(loading).some(Boolean)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              🚀 ПОЛНАЯ ДИАГНОСТИКА API ПЭК
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Консоль Браузера</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Откройте Developer Tools (F12) → Console для просмотра детальных логов запросов
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}