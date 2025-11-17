'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Key,
  Globe,
  Truck,
  Database,
  ExternalLink
} from 'lucide-react';
import { apiRequestWithTimeout } from '@/lib/api-utils';

interface ApiConfig {
  name: string;
  key: string;
  category: 'transport' | 'service' | 'internal';
  status: 'working' | 'error' | 'expired' | 'unknown';
  credentials: {
    [key: string]: string;
  };
  endpoints: string[];
  description: string;
  lastChecked?: Date;
  errorMessage?: string;
}

const API_CONFIGS: ApiConfig[] = [
  {
    name: 'ПЭК',
    key: 'pek',
    category: 'transport',
    status: 'unknown',
    credentials: {
      login: process.env.PEK_LOGIN || '',
      apiKey: process.env.PEK_API_KEY || '624FC93CA677B23673BB476D4982294DC27E246F'
    },
    endpoints: ['/api/pek'],
    description: 'Транспортная компания ПЭК - доставка по России'
  },
  {
    name: 'Возовоз',
    key: 'vozovoz',
    category: 'transport',
    status: 'unknown',
    credentials: {
      token: 'sBDUaEmzVBO6syQWHvHxmjxJQiON2BZplQaqrU3N'
    },
    endpoints: ['/api/vozovoz'],
    description: 'Транспортная компания Возовоз - доставка сборных грузов'
  },
  {
    name: 'СДЭК',
    key: 'cdek',
    category: 'transport',
    status: 'unknown',
    credentials: {
      clientId: '3J5AvQWReEdW1o01PApvw6jHsnkNpqT1',
      clientSecret: 'T8iMvgShV0p9OfJiysSBpCCWcXtOO0Hy'
    },
    endpoints: ['/api/cdek'],
    description: 'Транспортная компания СДЭК - курьерская доставка'
  },
  {
    name: 'КИТ',
    key: 'kit',
    category: 'transport',
    status: 'unknown',
    credentials: {
      token: process.env.KIT_API_TOKEN || ''
    },
    endpoints: ['/api/kit'],
    description: 'Транспортная компания КИТ - доставка посылок'
  },
  {
    name: 'Деловые Линии',
    key: 'dellin',
    category: 'transport',
    status: 'unknown',
    credentials: {
      appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
      login: 'service@lavsit.ru',
      password: 'edcwsx123QAZ'
    },
    endpoints: ['/api/dellin-packages'],
    description: 'Транспортная компания Деловые Линии'
  },
  {
    name: 'Rail Continent',
    key: 'railcontinent',
    category: 'transport',
    status: 'unknown',
    credentials: {},
    endpoints: ['/api/rail-continent'],
    description: 'Железнодорожная доставка Rail Continent'
  },
  {
    name: 'DaData',
    key: 'dadata',
    category: 'service',
    status: 'unknown',
    credentials: {
      apiKey: 'eb87bbb3789bb43ed465f796892ea951f9e91008'
    },
    endpoints: ['https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'],
    description: 'Сервис подсказок адресов DaData'
  },
  {
    name: 'Google Sheets',
    key: 'sheets',
    category: 'internal',
    status: 'unknown',
    credentials: {},
    endpoints: ['https://docs.google.com/spreadsheets/d/1e0P91PfGKVIuSWDY0ceWkIE7jD-vzD_xrIesBeQno1Y'],
    description: 'База данных товаров в Google Sheets'
  }
];

const ApiMasterTab: React.FC = () => {
  const [apis, setApis] = useState<ApiConfig[]>(API_CONFIGS);
  const [testingAll, setTestingAll] = useState(false);
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [editCredentials, setEditCredentials] = useState<{ [key: string]: string }>({});

  // Load saved API configurations
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apiConfigurations');
      if (saved) {
        const savedConfigs = JSON.parse(saved);
        setApis(prev => prev.map(api => ({
          ...api,
          credentials: savedConfigs[api.key] || api.credentials,
          status: savedConfigs[api.key + '_status'] || api.status,
          lastChecked: savedConfigs[api.key + '_lastChecked'] ? new Date(savedConfigs[api.key + '_lastChecked']) : api.lastChecked
        })));
      }
    } catch (error) {
      console.error('Error loading API configurations:', error);
    }
  }, []);

  const saveApiConfigurations = useCallback(() => {
    try {
      const configToSave: { [key: string]: any } = {};
      apis.forEach(api => {
        configToSave[api.key] = api.credentials;
        configToSave[api.key + '_status'] = api.status;
        configToSave[api.key + '_lastChecked'] = api.lastChecked?.toISOString();
      });
      localStorage.setItem('apiConfigurations', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Error saving API configurations:', error);
    }
  }, [apis]);

  const testApi = useCallback(async (api: ApiConfig) => {
    setApis(prev => prev.map(a =>
      a.key === api.key ? { ...a, status: 'unknown' as const } : a
    ));

    try {
      let testResult = false;
      let errorMessage = '';

      // Test based on API type
      switch (api.key) {
        case 'pek':
          const pekResponse = await apiRequestWithTimeout('/api/pek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'test' })
          });
          testResult = pekResponse.ok;
          if (!pekResponse.ok) {
            const errorData = await pekResponse.text();
            errorMessage = errorData.includes('<!DOCTYPE') ? 'Неверные учетные данные' : errorData;
          }
          break;

        case 'vozovoz':
          const vozResponse = await apiRequestWithTimeout('/api/vozovoz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              object: "price",
              action: "get",
              params: {
                cargo: { dimension: { quantity: 1, volume: 0.1, weight: 10 } },
                gateway: {
                  dispatch: { point: { location: "Москва", terminal: "default" } },
                  destination: { point: { location: "СПб", terminal: "default" } }
                }
              }
            })
          });
          testResult = vozResponse.ok;
          if (!vozResponse.ok) {
            const errorData = await vozResponse.text();
            errorMessage = errorData.includes('<!DOCTYPE') ? 'Токен устарел' : 'Ошибка API';
          }
          break;

        case 'cdek':
          const cdekResponse = await apiRequestWithTimeout('/api/cdek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from_city: 'Москва',
              to_city: 'СПб',
              packages: [{ height: 10, length: 20, width: 10, weight: 1000 }]
            })
          });
          testResult = cdekResponse.ok;
          if (!cdekResponse.ok) {
            const errorData = await cdekResponse.text();
            errorMessage = errorData.includes('<!DOCTYPE') ? 'Учетные данные устарели' : 'Ошибка API';
          }
          break;

        case 'kit':
          const kitResponse = await apiRequestWithTimeout('/api/kit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from_city: 'Москва',
              to_city: 'СПб',
              declared_price: 10000
            })
          });
          testResult = kitResponse.ok;
          if (!kitResponse.ok) {
            const errorData = await kitResponse.json().catch(() => ({}));
            if (kitResponse.status === 500 && errorData.error?.includes('не настроен')) {
              errorMessage = 'Токен API не настроен';
            } else if (kitResponse.status === 400 && errorData.error?.includes('Не удалось определить коды городов')) {
              errorMessage = 'Ошибка определения городов - проверьте токен';
            } else {
              errorMessage = errorData.error || 'Ошибка API';
            }
          }
          break;

        case 'dellin':
          const dellinResponse = await apiRequestWithTimeout('/api/dellin-packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'test' })
          });
          testResult = dellinResponse.ok;
          break;

        case 'railcontinent':
          const railResponse = await apiRequestWithTimeout('/api/rail-continent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'test' })
          });
          testResult = railResponse.ok;
          break;

        case 'dadata':
          const dadataResponse = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${api.credentials.apiKey}`
            },
            body: JSON.stringify({ query: 'Москва', count: 1 })
          });
          testResult = dadataResponse.ok;
          break;

        default:
          testResult = true; // For internal APIs, assume working
      }

      setApis(prev => prev.map(a =>
        a.key === api.key ? {
          ...a,
          status: testResult ? 'working' : 'error',
          lastChecked: new Date(),
          errorMessage: testResult ? undefined : errorMessage
        } : a
      ));

    } catch (error) {
      setApis(prev => prev.map(a =>
        a.key === api.key ? {
          ...a,
          status: 'error',
          lastChecked: new Date(),
          errorMessage: 'Сетевая ошибка'
        } : a
      ));
    }
  }, []);

  const testAllApis = useCallback(async () => {
    setTestingAll(true);
    for (const api of apis) {
      await testApi(api);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between tests
    }
    setTestingAll(false);
    saveApiConfigurations();
  }, [apis, testApi, saveApiConfigurations]);

  const startEditing = useCallback((apiKey: string) => {
    const api = apis.find(a => a.key === apiKey);
    if (api) {
      setEditingApi(apiKey);
      setEditCredentials({ ...api.credentials });
    }
  }, [apis]);

  const saveCredentials = useCallback(() => {
    if (editingApi) {
      setApis(prev => prev.map(a =>
        a.key === editingApi ? { ...a, credentials: { ...editCredentials } } : a
      ));
      setEditingApi(null);
      saveApiConfigurations();
    }
  }, [editingApi, editCredentials, saveApiConfigurations]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working': return 'Работает';
      case 'error': return 'Ошибка';
      case 'expired': return 'Устарел';
      default: return 'Неизвестно';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'transport': return <Truck className="h-4 w-4" />;
      case 'service': return <Globe className="h-4 w-4" />;
      case 'internal': return <Database className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const transportApis = apis.filter(api => api.category === 'transport');
  const serviceApis = apis.filter(api => api.category === 'service');
  const internalApis = apis.filter(api => api.category === 'internal');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Все API</h2>
          <p className="text-gray-400">Централизованное управление всеми API приложения</p>
        </div>
        <Button
          onClick={testAllApis}
          disabled={testingAll}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {testingAll ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Тестирование...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Протестировать все
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="transport" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="transport" className="text-white">
            <Truck className="h-4 w-4 mr-2" />
            Транспорт ({transportApis.length})
          </TabsTrigger>
          <TabsTrigger value="service" className="text-white">
            <Globe className="h-4 w-4 mr-2" />
            Сервисы ({serviceApis.length})
          </TabsTrigger>
          <TabsTrigger value="internal" className="text-white">
            <Database className="h-4 w-4 mr-2" />
            Внутренние ({internalApis.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transport" className="mt-6">
          <div className="grid gap-4">
            {transportApis.map((api) => (
              <Card key={api.key} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(api.category)}
                      <div>
                        <CardTitle className="text-white text-lg">{api.name}</CardTitle>
                        <p className="text-gray-400 text-sm">{api.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(api.status)}
                      <Badge variant={api.status === 'working' ? 'default' : 'destructive'}>
                        {getStatusText(api.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {api.errorMessage && (
                      <Alert className="border-red-500 bg-red-900/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-400">
                          {api.errorMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">Последняя проверка</Label>
                        <p className="text-white text-sm">
                          {api.lastChecked ? api.lastChecked.toLocaleString('ru-RU') : 'Не проверялся'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Эндпоинты</Label>
                        <div className="flex flex-wrap gap-1">
                          {api.endpoints.map((endpoint, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {endpoint}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => testApi(api)}
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-400 hover:bg-blue-900/20"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Тест
                      </Button>
                      <Button
                        onClick={() => startEditing(api.key)}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-400 hover:bg-green-900/20"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        Ключи
                      </Button>
                    </div>

                    {editingApi === api.key && (
                      <Card className="bg-gray-700 border-gray-600 mt-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-white text-sm">Редактирование учетных данных</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {Object.keys(api.credentials).map((key) => (
                            <div key={key}>
                              <Label className="text-gray-300 text-sm capitalize">{key}</Label>
                              <Input
                                type={key.includes('secret') || key.includes('password') ? 'password' : 'text'}
                                value={editCredentials[key] || ''}
                                onChange={(e) => setEditCredentials(prev => ({ ...prev, [key]: e.target.value }))}
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Button onClick={saveCredentials} size="sm" className="bg-green-600 hover:bg-green-700">
                              Сохранить
                            </Button>
                            <Button onClick={() => setEditingApi(null)} variant="outline" size="sm">
                              Отмена
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="service" className="mt-6">
          <div className="grid gap-4">
            {serviceApis.map((api) => (
              <Card key={api.key} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(api.category)}
                      <div>
                        <CardTitle className="text-white text-lg">{api.name}</CardTitle>
                        <p className="text-gray-400 text-sm">{api.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(api.status)}
                      <Badge variant={api.status === 'working' ? 'default' : 'destructive'}>
                        {getStatusText(api.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {api.errorMessage && (
                      <Alert className="border-red-500 bg-red-900/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-400">
                          {api.errorMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => testApi(api)}
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-400 hover:bg-blue-900/20"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Тест
                      </Button>
                      <Button
                        onClick={() => startEditing(api.key)}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-400 hover:bg-green-900/20"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        Ключи
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="internal" className="mt-6">
          <div className="grid gap-4">
            {internalApis.map((api) => (
              <Card key={api.key} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(api.category)}
                      <div>
                        <CardTitle className="text-white text-lg">{api.name}</CardTitle>
                        <p className="text-gray-400 text-sm">{api.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(api.status)}
                      <Badge variant={api.status === 'working' ? 'default' : 'destructive'}>
                        {getStatusText(api.status)}
                      </Badge>
                      <Button
                        onClick={() => window.open(api.endpoints[0], '_blank')}
                        variant="outline"
                        size="sm"
                        className="border-purple-500 text-purple-400 hover:bg-purple-900/20"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Открыть
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiMasterTab;