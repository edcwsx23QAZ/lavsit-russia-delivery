"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, GitCompare } from 'lucide-react';
import CalculationDetails from '@/components/CalculationDetails';

interface VozovozParserParams {
  fromCity: string;
  toCity: string;
  fromAddressDelivery: boolean;
  toAddressDelivery: boolean;
  fromAddress?: string;
  toAddress?: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  needInsurance: boolean;
  declaredValue?: number;
  needPackaging: boolean;
  needLoading: boolean;
  hasFreightElevator: boolean;
  floor: number;
}

interface ParsedResult {
  totalCost: number;
  services: ServiceItem[];
  deliveryTime?: string;
  warnings?: string[];
  parseTime?: number;
}

interface ServiceItem {
  name: string;
  basePrice?: number;
  price: number;
  discount?: number;
}

interface ApiResult {
  price: number;
  days: number;
  details?: any;
  error?: string;
}

export default function VozovozParserPage() {
  const [params, setParams] = useState<VozovozParserParams>({
    fromCity: 'Москва',
    toCity: 'Санкт-Петербург',
    fromAddressDelivery: false,
    toAddressDelivery: true,
    fromAddress: '',
    toAddress: 'Невский проспект д.132',
    length: 200,
    width: 100,
    height: 100,
    weight: 100,
    needInsurance: false,
    declaredValue: 0,
    needPackaging: false,
    needLoading: false,
    hasFreightElevator: false,
    floor: 1
  });

  const [parserResult, setParserResult] = useState<ParsedResult | null>(null);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [isParserLoading, setIsParserLoading] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParamChange = (key: keyof VozovozParserParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const runParser = async () => {
    setIsParserLoading(true);
    setError(null);
    setParserResult(null);

    try {
      const response = await fetch('/api/vozovoz-parser-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setParserResult(result);
    } catch (err: any) {
      setError(err.message || 'Ошибка при выполнении парсера');
    } finally {
      setIsParserLoading(false);
    }
  };

  const runApiComparison = async () => {
    setIsApiLoading(true);
    setApiResult(null);

    try {
      // Формируем запрос для API аналогично основному приложению
      const maxDimensions = {
        length: params.length / 1000, // переводим мм в м
        width: params.width / 1000,
        height: params.height / 1000,
        weight: params.weight
      };

      const totalVolume = (params.length * params.width * params.height) / 1000000000; // м³
      const totalWeight = params.weight;

      const requestData = {
        object: "price",
        action: "get",
        params: {
          cargo: {
            dimension: {
              max: maxDimensions,
              quantity: 1,
              volume: totalVolume,
              weight: totalWeight
            },
            ...(params.needInsurance && (params.declaredValue || 0) > 0 ? {
              insurance: params.declaredValue || 0,
              insuranceNdv: false
            } : {
              insuranceNdv: true
            }),
            ...(params.needPackaging ? {
              wrapping: {
                "hardPackageVolume": totalVolume
              }
            } : {})
          },
          gateway: {
            dispatch: {
              point: {
                location: params.fromCity,
                ...(params.fromAddressDelivery ? {
                  address: params.fromAddress || "адрес отправления"
                } : {
                  terminal: "default"
                })
              }
            },
            destination: {
              point: {
                location: params.toCity,
                ...(params.toAddressDelivery ? {
                  address: params.toAddress || "адрес получения"
                } : {
                  terminal: "default"
                })
              }
            }
          }
        }
      };

      const response = await fetch('/api/vozovoz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setApiResult({
        price: result.response?.price || 0,
        days: result.response?.deliveryTime?.to || 1,
        details: result.response
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка при выполнении API запроса');
    } finally {
      setIsApiLoading(false);
    }
  };

  const runBoth = async () => {
    await Promise.all([runParser(), runApiComparison()]);
  };

  const calculateDifference = () => {
    if (!parserResult || !apiResult) return null;
    
    const diff = parserResult.totalCost - apiResult.price;
    const percent = ((diff / apiResult.price) * 100).toFixed(1);
    
    return {
      absolute: diff,
      percent: parseFloat(percent),
      parserMore: diff > 0
    };
  };

  const difference = calculateDifference();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🕷️ Парсер Vozovoz</h1>
          <p className="text-gray-400">Тестирование точности расчетов через веб-парсинг сайта</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Форма параметров */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl">📋 Параметры груза</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Маршрут */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-400">🛣️ Маршрут</h3>
                
                <div>
                  <Label>Город отправления</Label>
                  <Input
                    value={params.fromCity}
                    onChange={(e) => handleParamChange('fromCity', e.target.value)}
                    placeholder="Москва"
                    className="bg-gray-700 border-gray-600"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={params.fromAddressDelivery}
                    onCheckedChange={(checked) => handleParamChange('fromAddressDelivery', checked)}
                  />
                  <Label>Отправление от адреса</Label>
                </div>

                {params.fromAddressDelivery && (
                  <div>
                    <Label>Адрес отправления</Label>
                    <Input
                      value={params.fromAddress}
                      onChange={(e) => handleParamChange('fromAddress', e.target.value)}
                      placeholder="Адрес отправления"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                )}

                <div>
                  <Label>Город назначения</Label>
                  <Input
                    value={params.toCity}
                    onChange={(e) => handleParamChange('toCity', e.target.value)}
                    placeholder="Санкт-Петербург"
                    className="bg-gray-700 border-gray-600"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={params.toAddressDelivery}
                    onCheckedChange={(checked) => handleParamChange('toAddressDelivery', checked)}
                  />
                  <Label>Доставка до адреса</Label>
                </div>

                {params.toAddressDelivery && (
                  <div>
                    <Label>Адрес назначения</Label>
                    <Input
                      value={params.toAddress}
                      onChange={(e) => handleParamChange('toAddress', e.target.value)}
                      placeholder="Адрес назначения"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                )}
              </div>

              {/* Габариты */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-green-400">📦 Габариты и вес</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Длина (см)</Label>
                    <Input
                      type="number"
                      value={params.length}
                      onChange={(e) => handleParamChange('length', parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Ширина (см)</Label>
                    <Input
                      type="number"
                      value={params.width}
                      onChange={(e) => handleParamChange('width', parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Высота (см)</Label>
                    <Input
                      type="number"
                      value={params.height}
                      onChange={(e) => handleParamChange('height', parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Вес (кг)</Label>
                    <Input
                      type="number"
                      value={params.weight}
                      onChange={(e) => handleParamChange('weight', parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Доп услуги */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-yellow-400">🛡️ Дополнительные услуги</h3>
                
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={params.needInsurance}
                    onCheckedChange={(checked) => handleParamChange('needInsurance', checked)}
                  />
                  <Label>Требуется страховка</Label>
                </div>

                {params.needInsurance && (
                  <div>
                    <Label>Объявленная стоимость (₽)</Label>
                    <Input
                      type="number"
                      value={params.declaredValue}
                      onChange={(e) => handleParamChange('declaredValue', parseInt(e.target.value) || 0)}
                      placeholder="50000"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={params.needPackaging}
                    onCheckedChange={(checked) => handleParamChange('needPackaging', checked)}
                  />
                  <Label>Требуется упаковка</Label>
                </div>

                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={params.needLoading}
                    onCheckedChange={(checked) => handleParamChange('needLoading', checked)}
                  />
                  <Label>Требуется погрузка/разгрузка</Label>
                </div>

                {params.needLoading && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Наличие грузового лифта</Label>
                      <Select value={params.hasFreightElevator ? 'freight' : 'passenger'} onValueChange={(value) => handleParamChange('hasFreightElevator', value === 'freight')}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passenger">Пассажирский</SelectItem>
                          <SelectItem value="freight">Грузовой</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Этаж</Label>
                      <Input
                        type="number"
                        value={params.floor}
                        onChange={(e) => handleParamChange('floor', parseInt(e.target.value) || 1)}
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопки управления */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={runParser}
                  disabled={isParserLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isParserLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Парсер
                </Button>

                <Button
                  onClick={runApiComparison}
                  disabled={isApiLoading}
                  variant="outline"
                  className="border-gray-600 hover:bg-gray-700"
                >
                  {isApiLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  API
                </Button>

                <Button
                  onClick={runBoth}
                  disabled={isParserLoading || isApiLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isParserLoading || isApiLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <GitCompare className="w-4 h-4 mr-2" />
                  )}
                  Оба
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Результаты */}
          <div className="space-y-6">
            {/* Ошибки */}
            {error && (
              <Card className="bg-red-900 border-red-700">
                <CardContent className="pt-6">
                  <p className="text-red-200">❌ {error}</p>
                </CardContent>
              </Card>
            )}

            {/* Результаты парсера */}
            {parserResult && (
              <CalculationDetails
                details={{
                  company: 'Парсер Vozovoz',
                  price: parserResult.totalCost,
                  days: parseInt(parserResult.deliveryTime?.split('-')[1] || parserResult.deliveryTime?.split(' ')[0] || '1'),
                  details: parserResult,
                  parseTime: parserResult.parseTime
                }}
                isExpanded={true}
              />
            )}

            {/* Результаты API */}
            {apiResult && (
              <CalculationDetails
                details={{
                  company: 'API Vozovoz',
                  price: apiResult.price,
                  days: apiResult.days,
                  details: apiResult.details,
                  apiUrl: '/api/vozovoz'
                }}
                isExpanded={false}
              />
            )}

            {/* Сравнение */}
            {difference && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-yellow-400">📊 Сравнение</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Разница:</span>
                      <span className={`font-bold ${difference.parserMore ? 'text-red-400' : 'text-green-400'}`}>
                        {difference.parserMore ? '+' : ''}{difference.absolute.toLocaleString()} ₽
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Разница в %:</span>
                      <span className={`font-bold ${difference.parserMore ? 'text-red-400' : 'text-green-400'}`}>
                        {difference.parserMore ? '+' : ''}{difference.percent}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Точнее:</span>
                      <span className="font-bold text-green-400">
                        {difference.parserMore ? 'API' : 'Парсер'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}