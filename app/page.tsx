'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Truck, Building2, Map } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Cargo {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
}

interface DeliveryForm {
  cargos: Cargo[];
  fromCity: string;
  toCity: string;
  fromAddress: string;
  toAddress: string;
  declaredValue: number;
  needPackaging: boolean;
  needLoading: boolean;
  needCarry: boolean;
  floor: number;
  hasFreightLift: boolean;
  needInsurance: boolean;
  fromTerminal: boolean;
  toTerminal: boolean;
  fromAddressDelivery: boolean;
  toAddressDelivery: boolean;
}

interface CalculationResult {
  company: string;
  price: number;
  days: number;
  details?: any;
  error?: string;
  requestData?: any;
  responseData?: any;
}

interface AddressSuggestion {
  value: string;
  unrestricted_value: string;
  data: {
    city?: string;
    street?: string;
    house?: string;
  };
}

const COMPANIES = [
  { name: 'Деловые Линии', logo: '📦', connected: true },
  { name: 'ПЭК', logo: '🚛', connected: true },
  { name: 'Nord Wheel', logo: '🌐', connected: true },
  { name: 'Rail Continent', logo: '🚂', connected: true }
];

export default function Home() {
  const [form, setForm] = useState<DeliveryForm>({
    cargos: [{ id: '1', length: 0, width: 0, height: 0, weight: 0 }],
    fromCity: '',
    toCity: '',
    fromAddress: '',
    toAddress: '',
    declaredValue: 0,
    needPackaging: false,
    needLoading: false,
    needCarry: false,
    floor: 1,
    hasFreightLift: false,
    needInsurance: false,
    fromTerminal: true,
    toTerminal: true,
    fromAddressDelivery: false,
    toAddressDelivery: false
  });

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState('');
  const [calculations, setCalculations] = useState<CalculationResult[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: boolean }>({});

  // Загрузка сохраненных данных
  useEffect(() => {
    const saved = localStorage.getItem('deliveryForm');
    if (saved) {
      setForm(JSON.parse(saved));
    }
  }, []);

  // Сохранение данных при изменении
  useEffect(() => {
    localStorage.setItem('deliveryForm', JSON.stringify(form));
  }, [form]);

  // Автоматическая страховка при указании стоимости
  useEffect(() => {
    if (form.declaredValue > 0) {
      setForm(prev => ({ ...prev, needInsurance: true }));
    }
  }, [form.declaredValue]);

  const searchAddresses = useCallback(async (query: string, field: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setActiveField(field);
    
    try {
      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Token eb87bbb3789bb43ed465f796892ea951f9e91008'
        },
        body: JSON.stringify({
          query: query,
          count: 10
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Ошибка получения подсказок:', error);
    }
  }, []);

  const debounceTimer = React.useRef<NodeJS.Timeout>();
  const handleAddressChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchAddresses(value, field);
    }, 50);
  };

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    setForm(prev => ({ ...prev, [activeField]: suggestion.value }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const addCargo = () => {
    const newId = (form.cargos.length + 1).toString();
    setForm(prev => ({
      ...prev,
      cargos: [...prev.cargos, { id: newId, length: 0, width: 0, height: 0, weight: 0 }]
    }));
  };

  const updateCargo = (id: string, field: string, value: number) => {
    setForm(prev => ({
      ...prev,
      cargos: prev.cargos.map(cargo => 
        cargo.id === id ? { ...cargo, [field]: value } : cargo
      )
    }));
  };

  const removeCargo = (id: string) => {
    if (form.cargos.length > 1) {
      setForm(prev => ({
        ...prev,
        cargos: prev.cargos.filter(cargo => cargo.id !== id)
      }));
    }
  };

  // Получение sessionID для Деловых Линий
  const getDellinSessionId = async (): Promise<string | null> => {
    try {
      const authResponse = await fetch('https://api.dellin.ru/v3/auth/login.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
          login: 'service@lavsit.ru',
          password: 'edcwsx123QAZ'
        })
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        return authData.data?.sessionID || null;
      }
    } catch (error) {
      console.error('Ошибка авторизации Деловые Линии:', error);
    }
    return null;
  };

  // Расчет для Деловых Линий
  const calculateDellin = async (): Promise<CalculationResult> => {
    try {
      const sessionID = await getDellinSessionId();
      
      if (!sessionID) {
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: 'Не удалось получить sessionID'
        };
      }

      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );

      const requestData = {
        appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
        sessionID: sessionID,
        delivery: {
          deliveryType: {
            type: 'auto'
          },
          derival: {
            variant: form.fromTerminal ? 'terminal' : 'address',
            address: {
              search: form.fromAddress || form.fromCity
            },
            handling: form.needCarry ? {
              freightLift: form.hasFreightLift,
              toFloor: form.floor,
              carry: 50
            } : undefined
          },
          arrival: {
            variant: form.toTerminal ? 'terminal' : 'address',
            address: {
              search: form.toAddress || form.toCity
            },
            handling: form.needCarry ? {
              freightLift: form.hasFreightLift,
              toFloor: form.floor,
              carry: 50
            } : undefined
          }
        },
        cargo: {
          quantity: form.cargos.length,
          length: Math.max(...form.cargos.map(c => c.length)) / 100,
          width: Math.max(...form.cargos.map(c => c.width)) / 100,
          height: Math.max(...form.cargos.map(c => c.height)) / 100,
          weight: totalWeight,
          totalVolume: totalVolume,
          totalWeight: totalWeight,
          oversizedWeight: 0,
          oversizedVolume: 0,
          insurance: form.needInsurance ? {
            statedValue: form.declaredValue,
            term: false
          } : undefined
        },
        payment: {
          type: 'cash'
        }
      };

      const response = await fetch('https://api.dellin.ru/v2/calculator.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok && data.data) {
        let totalPrice = data.data.price || 0;
        
        // Добавляем стоимость страховки
        if (form.needInsurance && data.data.insurance) {
          totalPrice += data.data.insurance;
        }
        
        // Добавляем стоимость упаковки (если включена)
        if (form.needPackaging) {
          totalPrice += Math.round(totalWeight * 50); // Примерная стоимость упаковки
        }

        return {
          company: 'Деловые Линии',
          price: totalPrice,
          days: data.data.deliveryTerm || 0,
          details: data.data,
          requestData,
          responseData: data
        };
      } else {
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: data.metadata?.detail || 'Ошибка расчета',
          requestData,
          responseData: data
        };
      }
    } catch (error) {
      return {
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: 'Ошибка соединения с сервером',
        requestData: null,
        responseData: null
      };
    }
  };

  // Базовые расчеты для других ТК (заглушки)
  const calculatePEK = async (): Promise<CalculationResult> => {
    // Имитация запроса к ПЭК
    await new Promise(resolve => setTimeout(resolve, 1000));
    const basePrice = form.cargos.reduce((sum, cargo) => sum + cargo.weight * 15, 0);
    let totalPrice = basePrice;
    
    if (form.needInsurance) totalPrice += form.declaredValue * 0.02;
    if (form.needPackaging) totalPrice += basePrice * 0.1;
    
    return {
      company: 'ПЭК',
      price: totalPrice,
      days: 3
    };
  };

  const calculateNordWheel = async (): Promise<CalculationResult> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const basePrice = form.cargos.reduce((sum, cargo) => sum + cargo.weight * 18, 0);
    let totalPrice = basePrice;
    
    if (form.needInsurance) totalPrice += form.declaredValue * 0.015;
    if (form.needPackaging) totalPrice += basePrice * 0.12;
    
    return {
      company: 'Nord Wheel',
      price: totalPrice,
      days: 4
    };
  };

  const calculateRailContinent = async (): Promise<CalculationResult> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const basePrice = form.cargos.reduce((sum, cargo) => sum + cargo.weight * 12, 0);
    let totalPrice = basePrice;
    
    if (form.needInsurance) totalPrice += form.declaredValue * 0.025;
    if (form.needPackaging) totalPrice += basePrice * 0.08;
    
    return {
      company: 'Rail Continent',
      price: totalPrice,
      days: 5
    };
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setCalculations([]);
    
    try {
      const results = await Promise.all([
        calculateDellin(),
        calculatePEK(),
        calculateNordWheel(),
        calculateRailContinent()
      ]);
      
      // Сортировка по цене
      const sortedResults = results
        .filter(result => !result.error)
        .sort((a, b) => a.price - b.price)
        .concat(results.filter(result => result.error));
      
      setCalculations(sortedResults);
    } catch (error) {
      console.error('Ошибка при расчете:', error);
    } finally {
      setCalculating(false);
    }
  };

  const exportToPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const toggleDetails = (company: string) => {
    setExpandedDetails(prev => ({
      ...prev,
      [company]: !prev[company]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-400">
          Междугородняя доставка Лавсит
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen overflow-hidden">
          {/* Левая часть - форма */}
          <div className="space-y-4 overflow-y-auto pr-4">
            {/* Грузы */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Грузы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.cargos.map((cargo, index) => (
                  <div key={cargo.id} className="border border-gray-600 rounded p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-lg font-medium">Груз №{index + 1}</h4>
                      {form.cargos.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeCargo(cargo.id)}
                        >
                          Удалить
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Длина (см)</Label>
                        <Input
                          type="number"
                          value={cargo.length || ''}
                          onChange={(e) => updateCargo(cargo.id, 'length', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                      <div>
                        <Label>Ширина (см)</Label>
                        <Input
                          type="number"
                          value={cargo.width || ''}
                          onChange={(e) => updateCargo(cargo.id, 'width', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                      <div>
                        <Label>Высота (см)</Label>
                        <Input
                          type="number"
                          value={cargo.height || ''}
                          onChange={(e) => updateCargo(cargo.id, 'height', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                      <div>
                        <Label>Вес (кг)</Label>
                        <Input
                          type="number"
                          value={cargo.weight || ''}
                          onChange={(e) => updateCargo(cargo.id, 'weight', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addCargo} className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить груз
                </Button>
              </CardContent>
            </Card>

            {/* Маршрут */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Маршрут
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Отправление */}
                <div className="space-y-3">
                  <Label className="text-lg font-medium">Отправление</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="fromDelivery"
                        checked={form.fromTerminal}
                        onChange={() => setForm(prev => ({ ...prev, fromTerminal: true, fromAddressDelivery: false }))}
                      />
                      <span>От терминала</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="fromDelivery"
                        checked={form.fromAddressDelivery}
                        onChange={() => setForm(prev => ({ ...prev, fromTerminal: false, fromAddressDelivery: true }))}
                      />
                      <span>От адреса</span>
                    </label>
                  </div>
                  
                  <div>
                    <Label>Город отправления</Label>
                    <Input
                      value={form.fromCity}
                      onChange={(e) => handleAddressChange('fromCity', e.target.value)}
                      placeholder="Начните вводить город"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  {form.fromAddressDelivery && (
                    <div>
                      <Label>Адрес отправления</Label>
                      <div className="relative">
                        <Input
                          value={form.fromAddress}
                          onChange={(e) => handleAddressChange('fromAddress', e.target.value)}
                          placeholder="Начните вводить адрес"
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-600" />

                {/* Доставка */}
                <div className="space-y-3">
                  <Label className="text-lg font-medium">Доставка</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="toDelivery"
                        checked={form.toTerminal}
                        onChange={() => setForm(prev => ({ ...prev, toTerminal: true, toAddressDelivery: false }))}
                      />
                      <span>До терминала</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="toDelivery"
                        checked={form.toAddressDelivery}
                        onChange={() => setForm(prev => ({ ...prev, toTerminal: false, toAddressDelivery: true }))}
                      />
                      <span>До адреса</span>
                    </label>
                  </div>
                  
                  <div>
                    <Label>Город доставки</Label>
                    <Input
                      value={form.toCity}
                      onChange={(e) => handleAddressChange('toCity', e.target.value)}
                      placeholder="Начните вводить город"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  {form.toAddressDelivery && (
                    <div>
                      <Label>Адрес доставки</Label>
                      <div className="relative">
                        <Input
                          value={form.toAddress}
                          onChange={(e) => handleAddressChange('toAddress', e.target.value)}
                          placeholder="Начните вводить адрес"
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Автоподсказки */}
            {showSuggestions && suggestions.length > 0 && (
              <Card className="bg-gray-800 border-gray-700 absolute z-10 w-96">
                <CardContent className="p-2">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-700 cursor-pointer text-sm"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion.value}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Дополнительные параметры */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Дополнительные услуги</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Объявленная стоимость (руб.)</Label>
                  <Input
                    type="number"
                    value={form.declaredValue || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, declaredValue: Number(e.target.value) }))}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="packaging"
                      checked={form.needPackaging}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needPackaging: checked as boolean }))}
                    />
                    <Label htmlFor="packaging">Требуется упаковка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance"
                      checked={form.needInsurance}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needInsurance: checked as boolean }))}
                    />
                    <Label htmlFor="insurance">Требуется страховка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="loading"
                      checked={form.needLoading}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needLoading: checked as boolean }))}
                    />
                    <Label htmlFor="loading">Требуется погрузка/разгрузка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="carry"
                      checked={form.needCarry}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needCarry: checked as boolean }))}
                    />
                    <Label htmlFor="carry">Требуется подъем</Label>
                  </div>
                  
                  {form.needCarry && (
                    <div className="ml-6 space-y-3 border-l-2 border-gray-600 pl-4">
                      <div>
                        <Label>Этаж</Label>
                        <Input
                          type="number"
                          value={form.floor}
                          onChange={(e) => setForm(prev => ({ ...prev, floor: Number(e.target.value) }))}
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="freightLift"
                          checked={form.hasFreightLift}
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, hasFreightLift: checked as boolean }))}
                        />
                        <Label htmlFor="freightLift">Наличие грузового лифта</Label>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleCalculate} 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  disabled={calculating}
                >
                  {calculating ? 'Расчет...' : 'Рассчитать'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Правая часть - результаты */}
          <div className="space-y-4 overflow-y-auto">
            {calculations.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-blue-400">Результаты расчета</h2>
                  <Button onClick={exportToPDF} variant="outline" size="sm">
                    Сохранить в PDF
                  </Button>
                </div>
                
                {calculations.map((calc, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-white flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {calc.company}
                        </CardTitle>
                        {calc.error ? (
                          <Badge variant="destructive">Ошибка</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            {calc.price.toLocaleString()} ₽
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {calc.error ? (
                        <Alert className="border-red-600">
                          <AlertDescription>{calc.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          <p><strong>Стоимость:</strong> {calc.price.toLocaleString()} ₽</p>
                          <p><strong>Срок доставки:</strong> {calc.days} дней</p>
                          
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleDetails(calc.company)}
                            >
                              {expandedDetails[calc.company] ? 'Скрыть детали' : 'Показать подробнее'}
                            </Button>
                          </div>
                          
                          <Collapsible open={expandedDetails[calc.company]}>
                            <CollapsibleContent className="mt-4">
                              <div className="bg-gray-900 p-4 rounded text-xs">
                                <h4 className="font-bold mb-2">Детали расчета:</h4>
                                {calc.details && (
                                  <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                                    {JSON.stringify(calc.details, null, 2)}
                                  </pre>
                                )}
                                
                                {calc.requestData && (
                                  <div className="mt-4">
                                    <h5 className="font-bold mb-2">Отправленный запрос:</h5>
                                    <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                                      {JSON.stringify(calc.requestData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {calc.responseData && (
                                  <div className="mt-4">
                                    <h5 className="font-bold mb-2">Полученный ответ:</h5>
                                    <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                                      {JSON.stringify(calc.responseData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Список подключенных ТК */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Подключенные транспортные компании</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {COMPANIES.map((company, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-700 rounded">
                      <span className="text-2xl">{company.logo}</span>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <Badge variant={company.connected ? "default" : "destructive"} className="text-xs">
                          {company.connected ? 'Подключена' : 'Отключена'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
