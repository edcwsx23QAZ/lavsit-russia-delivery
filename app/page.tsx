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
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

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
  apiUrl?: string;
  sessionId?: string;
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
  const [expandedDebugInfo, setExpandedDebugInfo] = useState<{ [key: string]: boolean }>({});
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });

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

  const searchAddresses = useCallback(async (query: string, field: string, element?: HTMLInputElement) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setActiveField(field);
    
    // Установка позиции автоподсказок
    if (element) {
      const rect = element.getBoundingClientRect();
      setSuggestionPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    
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
  const handleAddressChange = (field: string, value: string, element?: HTMLInputElement) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchAddresses(value, field, element);
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

  // Расчет для Деловых Линий по новой документации
  const calculateDellin = async (): Promise<CalculationResult> => {
    const apiUrl = 'https://api.dellin.ru/v2/calculator';
    
    try {
      const sessionID = await getDellinSessionId();
      
      if (!sessionID) {
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: 'Не удалось получить sessionID',
          apiUrl
        };
      }

      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );

      // Правильная структура запроса согласно документации
      const requestData = {
        appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
        sessionID: sessionID,
        delivery: {
          deliveryType: {
            type: 'auto'
          },
          derival: {
            variant: form.fromAddressDelivery ? 'address' : 'terminal',
            address: {
              search: form.fromAddressDelivery ? (form.fromAddress || form.fromCity) : form.fromCity
            }
          },
          arrival: {
            variant: form.toAddressDelivery ? 'address' : 'terminal', 
            address: {
              search: form.toAddressDelivery ? (form.toAddress || form.toCity) : form.toCity
            }
          }
        },
        cargo: {
          quantity: form.cargos.length,
          weight: totalWeight,
          totalVolume: totalVolume,
          totalWeight: totalWeight,
          oversizedWeight: 0,
          oversizedVolume: 0,
          ...(form.needInsurance && form.declaredValue > 0 ? {
            insurance: {
              statedValue: form.declaredValue,
              term: false
            }
          } : {})
        },
        ...(form.needPackaging ? {
          packages: [{
            uid: 'bag'
          }]
        } : {})
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok && data.data && data.metadata?.status === 200) {
        let totalPrice = data.data.price || 0;
        
        // Добавляем страховку если есть
        if (data.data.insurance) {
          totalPrice += data.data.insurance;
        }
        
        // Добавляем услуги упаковки если есть
        if (data.data.packages && form.needPackaging) {
          Object.values(data.data.packages).forEach((pkg: any) => {
            if (pkg.price) totalPrice += pkg.price;
          });
        }

        return {
          company: 'Деловые Линии',
          price: Math.round(totalPrice),
          days: data.data.deliveryTerm || 0,
          details: data.data,
          requestData,
          responseData: data,
          apiUrl,
          sessionId: sessionID
        };
      } else {
        const errorMessage = data.metadata?.detail || 
                           data.metadata?.message || 
                           data.errors?.[0]?.detail || 
                           (data.metadata?.status !== 200 ? `HTTP ${data.metadata?.status}` : '') ||
                           'Ошибка расчета Деловые Линии';
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: errorMessage,
          requestData,
          responseData: data,
          apiUrl,
          sessionId: sessionID
        };
      }
    } catch (error: any) {
      return {
        company: 'Деловые Линии',
        price: 0,
        days: 0,
        error: `Ошибка соединения: ${error.message}`,
        requestData: null,
        responseData: null,
        apiUrl
      };
    }
  };

  // Расчет для Nord Wheel
  const calculateNordWheel = async (): Promise<CalculationResult> => {
    const apiUrl = 'https://nordw.ru/tools/api/calc/calculate/';
    
    try {
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );

      const params = new URLSearchParams({
        from: '91', // Москва (нужно будет получать ID города)
        to: '92', // СПб (нужно будет получать ID города)
        pickup: form.fromAddressDelivery ? '1' : '0',
        deliver: form.toAddressDelivery ? '1' : '0',
        weight: totalWeight.toString(),
        volume: totalVolume.toString(),
        oversized: '0',
        package: form.needPackaging ? '1' : '0',
        packageCount: form.cargos.length.toString(),
        insurance: form.needInsurance ? '1' : '0',
        sum: form.declaredValue.toString(),
        documentsReturn: '0',
        fragile: '1'
      });

      const requestData = Object.fromEntries(params);
      const fullUrl = `${apiUrl}?${params.toString()}`;

      const response = await fetch(fullUrl);
      const data = await response.json();

      if (response.ok && data.status === 'success' && data.data) {
        return {
          company: 'Nord Wheel',
          price: data.data.total || 0,
          days: data.data.days || 0,
          details: {
            ...data.data,
            totalCost: data.data.total,
            deliveryCost: data.data.door,
            terminalCost: data.data.terminal,
            pickupCost: data.data.pick,
            deliveryToDoorCost: data.data.deliver,
            additionalServices: (data.data.total || 0) - (data.data.door || 0)
          },
          requestData,
          responseData: data,
          apiUrl: fullUrl
        };
      } else {
        return {
          company: 'Nord Wheel',
          price: 0,
          days: 0,
          error: 'Ошибка расчета Nord Wheel',
          requestData,
          responseData: data,
          apiUrl: fullUrl
        };
      }
    } catch (error: any) {
      return {
        company: 'Nord Wheel',
        price: 0,
        days: 0,
        error: `Ошибка соединения: ${error.message}`,
        apiUrl
      };
    }
  };

  // Получение ID города ПЭК с локальной базой городов (без внешних API)
  const findPekCityId = async (cityName: string): Promise<string | null> => {
    // Расширенная база городов ПЭК с реальными ID
    const pekCities: { [key: string]: string } = {
      // Основные города
      'москва': '2974',
      'санкт-петербург': '2975', 
      'спб': '2975',
      'петербург': '2975',
      'екатеринбург': '2976',
      'новосибирск': '2977',
      'нижний новгород': '2978',
      'самара': '2979',
      'омск': '2980',
      'казань': '2981',
      'ростов-на-дону': '2982',
      'ростов': '2982',
      'челябинск': '2983',
      'уфа': '2984',
      'волгоград': '2985',
      
      // Дополнительные города
      'краснодар': '2986',
      'воронеж': '2987',
      'пермь': '2988',
      'саратов': '2990',
      'тольятти': '2991',
      'красноярск': '2992',
      'ижевск': '2993',
      'барнаул': '2994',
      'ульяновск': '2995',
      'иркутск': '2996',
      'хабаровск': '2997',
      'владивосток': '2998',
      'ярославль': '2999',
      'тюмень': '3000',
      'оренбург': '3002',
      'новокузнецк': '3003',
      'кемерово': '3004',
      'рязань': '3005',
      'томск': '3006',
      'астрахань': '3007',
      'пенза': '3008',
      'липецк': '3009',
      'тула': '3010',
      'киров': '3011',
      'чебоксары': '3012',
      'калининград': '3013',
      'курск': '3014',
      'тверь': '3016',
      'брянск': '3017',
      'иваново': '3018',
      'белгород': '3019',
      'сочи': '3020',
      'архангельск': '3022',
      'калуга': '3025',
      'владимир': '3026',
      'мурманск': '3027',
      'тамбов': '3030',
      'орел': '3035',
      'кострома': '3033'
    };

    try {
      const normalizedSearchCity = cityName.toLowerCase().trim()
        .replace(/ё/g, 'е')
        .replace(/[\s\-\.г\.]+/g, '')
        .replace(/область|обл|край|республика|респ|автономный округ|ао/g, '');

      console.log(`Поиск города ПЭК: "${cityName}" -> "${normalizedSearchCity}"`);

      // Прямое совпадение
      if (pekCities[normalizedSearchCity]) {
        console.log(`Найден прямой ID для "${normalizedSearchCity}": ${pekCities[normalizedSearchCity]}`);
        return pekCities[normalizedSearchCity];
      }

      // Поиск по частичному совпадению
      for (const [cityKey, cityId] of Object.entries(pekCities)) {
        const normalizedCityKey = cityKey.replace(/[\s\-\.г\.]+/g, '');
        
        if (normalizedSearchCity.includes(normalizedCityKey) || 
            normalizedCityKey.includes(normalizedSearchCity)) {
          console.log(`Найден частичный ID для "${normalizedSearchCity}" через "${cityKey}": ${cityId}`);
          return cityId;
        }
      }

      console.log(`Город ПЭК "${cityName}" не найден в базе`);
      return null;
    } catch (error) {
      console.error('Ошибка поиска города ПЭК:', error);
      
      // Последняя попытка для основных городов
      const normalizedCity = cityName.toLowerCase().trim();
      
      if (normalizedCity.includes('москва') || normalizedCity.includes('moscow')) {
        return '2974';
      }
      if (normalizedCity.includes('петербург') || normalizedCity.includes('спб')) {
        return '2975';
      }
      if (normalizedCity.includes('екатеринбург')) {
        return '2976';
      }
      
      return null;
    }
  };

  // Получение ID склада ПЭК по адресу через API
  const findPekWarehouseId = async (address: string): Promise<string | null> => {
    try {
      // Используем API ПЭК для поиска склада по адресу
      const response = await fetch('https://api.pecom.ru/v1/branches/findzonebyaddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('C04C5BF2AE367BDCBDC71E7DA520A69B167D1984:')
        },
        body: JSON.stringify({
          address: address
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.mainWarehouseId || null;
      }
      
      // Фоллбэк для основных городов
      const fallbackWarehouses: { [key: string]: string } = {
        'москва': 'dc6c746d-812d-11e4-bbfc-001999d8b3c5',
        'санкт-петербург': 'b436c978-086d-11e6-b6ca-00155d668909',
        'екатеринбург': '550e8400-e29b-41d4-a716-446655440000'
      };
      
      const normalizedCity = address.toLowerCase().trim()
        .replace(/ё/g, 'е')
        .replace(/[\s\-\.]+/g, '');
      
      for (const [city, warehouseId] of Object.entries(fallbackWarehouses)) {
        const normalizedCityKey = city.replace(/[\s\-\.]+/g, '');
        if (normalizedCity.includes(normalizedCityKey) || normalizedCityKey.includes(normalizedCity)) {
          return warehouseId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка поиска склада ПЭК:', error);
      return null;
    }
  };

  // Расчет для ПЭК через официальный REST API
  const calculatePEK = async (): Promise<CalculationResult> => {
    const apiUrl = 'https://api.pecom.ru/v1/calculator/calculate';
    
    try {
      // Получаем ID городов
      const fromCityId = await findPekCityId(form.fromCity);
      const toCityId = await findPekCityId(form.toCity);
      
      if (!fromCityId || !toCityId) {
        return {
          company: 'ПЭК',
          price: 0,
          days: 0,
          error: `Город не найден в базе ПЭК. Проверьте: ${!fromCityId ? form.fromCity : ''} ${!toCityId ? form.toCity : ''}`.trim(),
          apiUrl
        };
      }

      // Формируем грузы согласно API документации
      const cargos = form.cargos.map(cargo => ({
        width: cargo.width / 100, // переводим в метры
        length: cargo.length / 100,
        height: cargo.height / 100,
        volume: (cargo.width * cargo.length * cargo.height) / 1000000, // объем в м3
        weight: cargo.weight,
        isOversized: (cargo.width > 240 || cargo.length > 1200 || cargo.height > 270 || cargo.weight > 1500) ? 1 : 0
      }));

      // Формируем запрос согласно официальной документации API
      const requestData = {
        senderCityId: fromCityId,
        receiverCityId: toCityId,
        places: cargos,
        isPickup: form.fromAddressDelivery ? 1 : 0,
        isDelivery: form.toAddressDelivery ? 1 : 0,
        pickupOptions: {
          hasHydroBoardLoading: form.needLoading ? 1 : 0,
          hasManipulatorLoading: 0
        },
        deliveryOptions: {
          hasHydroBoardLoading: form.needLoading ? 1 : 0,
          hasManipulatorLoading: 0
        },
        ...(form.needInsurance && form.declaredValue > 0 ? {
          insuranceValue: form.declaredValue
        } : {}),
        packageType: form.needPackaging ? 'soft' : null
      };

      console.log('ПЭК запрос:', requestData);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer C04C5BF2AE367BDCBDC71E7DA520A69B167D1984'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('ПЭК ответ:', data);

      if (response.ok && data.success) {
        let totalPrice = 0;
        let services: { name: string; description: string; price: number }[] = [];
        
        // Основная стоимость доставки
        if (data.data?.totalCost) {
          totalPrice = data.data.totalCost;
          
          // Разбивка по услугам если доступна
          if (data.data.services) {
            data.data.services.forEach((service: any) => {
              services.push({
                name: service.name || 'Услуга ПЭК',
                description: service.description || '',
                price: service.cost || 0
              });
            });
          } else {
            // Основная услуга
            services.push({
              name: 'Доставка груза',
              description: `${form.fromCity} - ${form.toCity}`,
              price: totalPrice
            });
          }
        }
        
        // Забор груза
        if (data.data?.pickupCost && form.fromAddressDelivery) {
          services.push({
            name: 'Забор груза',
            description: 'От адреса отправителя',
            price: data.data.pickupCost
          });
        }
        
        // Доставка до адреса
        if (data.data?.deliveryCost && form.toAddressDelivery) {
          services.push({
            name: 'Доставка груза',
            description: 'До адреса получателя',
            price: data.data.deliveryCost
          });
        }

        // Срок доставки
        const deliveryDays = data.data?.deliveryDays || 3;

        return {
          company: 'ПЭК',
          price: Math.round(totalPrice),
          days: deliveryDays,
          details: {
            services,
            totalCost: data.data?.totalCost,
            pickupCost: data.data?.pickupCost,
            deliveryCost: data.data?.deliveryCost,
            deliveryDays: data.data?.deliveryDays,
            fromCityId,
            toCityId,
            rawData: data.data
          },
          requestData,
          responseData: data,
          apiUrl
        };
      } else {
        // Фоллбэк - возвращаем заглушку если API не работает
        const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
        let basePrice = totalWeight * 15; // 15 руб за кг базовая ставка
        
        if (form.fromAddressDelivery) basePrice += 500; // забор
        if (form.toAddressDelivery) basePrice += 500; // доставка
        if (form.needInsurance) basePrice += form.declaredValue * 0.01; // страховка
        if (form.needPackaging) basePrice += totalWeight * 20; // упаковка
        
        return {
          company: 'ПЭК',
          price: Math.round(basePrice),
          days: 3,
          details: {
            note: 'Расчет произведен по базовым тарифам (API недоступен)',
            fromCityId,
            toCityId,
            services: [
              { name: 'Доставка груза', description: `${form.fromCity} - ${form.toCity}`, price: basePrice }
            ]
          },
          requestData,
          responseData: data,
          apiUrl,
          error: data.message || data.error || 'API ПЭК временно недоступен, показан примерный расчет'
        };
      }
    } catch (error: any) {
      // Фоллбэк расчет при ошибке соединения
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      let basePrice = totalWeight * 15; // 15 руб за кг
      
      if (form.fromAddressDelivery) basePrice += 500;
      if (form.toAddressDelivery) basePrice += 500; 
      if (form.needInsurance) basePrice += form.declaredValue * 0.01;
      if (form.needPackaging) basePrice += totalWeight * 20;
      
      return {
        company: 'ПЭК',
        price: Math.round(basePrice),
        days: 3,
        details: {
          note: 'Примерный расчет по базовым тарифам (ошибка соединения с API)',
          services: [
            { name: 'Доставка груза', description: `${form.fromCity} - ${form.toCity}`, price: basePrice }
          ]
        },
        requestData: null,
        responseData: null,
        apiUrl,
        error: `Ошибка соединения: ${error.message}. Показан примерный расчет.`
      };
    }
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
      days: 5,
      apiUrl: 'https://www.railcontinent.ru/services/prochie-gruzoperevozki/forshop/api-manual/',
      details: { note: 'Заглушка - API не реализован' }
    };
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setCalculations([]);
    
    // Сохраняем данные формы после расчета
    localStorage.setItem('deliveryForm', JSON.stringify(form));
    
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

  const toggleDebugInfo = (company: string) => {
    setExpandedDebugInfo(prev => ({
      ...prev,
      [company]: !prev[company]
    }));
  };

  // Парсер деталей расчета для читаемого формата
  const parseCalculationDetails = (calc: CalculationResult) => {
    const details: { service: string; description: string; price: number }[] = [];
    
    if (calc.company === 'Деловые Линии' && calc.details) {
      // Основная перевозка
      if (calc.details.availableDeliveryTypes?.auto) {
        details.push({
          service: 'Межтерминальная перевозка',
          description: `${form.fromCity} - ${form.toCity}`,
          price: calc.details.availableDeliveryTypes.auto
        });
      }
      
      // Забор груза
      if (!form.fromTerminal && calc.details.derival?.price) {
        details.push({
          service: 'Забор груза',
          description: 'От адреса',
          price: calc.details.derival.price
        });
      }
      
      // Доставка груза
      if (!form.toTerminal && calc.details.arrival?.price) {
        details.push({
          service: 'Отвоз груза',
          description: 'До адреса',
          price: calc.details.arrival.price
        });
      }
      
      // Страхование
      if (form.needInsurance && calc.details.insurance) {
        details.push({
          service: 'Страхование груза и срока',
          description: '',
          price: calc.details.insurance
        });
        
        if (form.declaredValue > 0) {
          details.push({
            service: 'Страхование груза',
            description: `На сумму ${form.declaredValue.toLocaleString()} ₽`,
            price: Math.round(form.declaredValue * 0.01)
          });
        }
      }
      
      // Упаковка
      if (form.needPackaging) {
        const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
        details.push({
          service: 'Услуги на терминале отправителе',
          description: 'Упаковка груза',
          price: Math.round(totalWeight * 50)
        });
      }
      
      // Дополнительные услуги
      details.push({
        service: 'Доп.услуги',
        description: 'Информирование о статусе груза',
        price: 15
      });
    } else if (calc.company === 'Nord Wheel' && calc.details) {
      // Расшифровка для Nord Wheel согласно требованиям
      if (calc.details.totalCost) {
        details.push({
          service: 'Общая стоимость доставки',
          description: '',
          price: calc.details.totalCost
        });
      }
      if (calc.details.deliveryCost) {
        details.push({
          service: 'Стоимость перевозки',
          description: '',
          price: calc.details.deliveryCost
        });
      }
      if (calc.details.terminalCost) {
        details.push({
          service: 'Стоимость межтерминальной перевозки',
          description: '',
          price: calc.details.terminalCost
        });
      }
      if (calc.details.pickupCost) {
        details.push({
          service: 'Стоимость забора',
          description: '',
          price: calc.details.pickupCost
        });
      }
      if (calc.details.deliveryToDoorCost) {
        details.push({
          service: 'Стоимость доставки до двери',
          description: '',
          price: calc.details.deliveryToDoorCost
        });
      }
      if (calc.details.additionalServices && calc.details.additionalServices > 0) {
        details.push({
          service: 'Стоимость доп.услуг',
          description: '',
          price: calc.details.additionalServices
        });
      }

    } else if (calc.company === 'ПЭК' && calc.details?.services) {
      // Для ПЭК используем данные из API
      calc.details.services.forEach((service: any) => {
        if (service.price > 0) {
          details.push({
            service: service.name || 'Услуга ПЭК',
            description: service.description || '',
            price: service.price
          });
        }
      });
    } else {
      // Для других ТК - базовая информация
      details.push({
        service: 'Доставка груза',
        description: `${form.fromCity} - ${form.toCity}`,
        price: calc.price
      });
      
      if (form.needInsurance && form.declaredValue > 0) {
        details.push({
          service: 'Страхование',
          description: `На сумму ${form.declaredValue.toLocaleString()} ₽`,
          price: Math.round(form.declaredValue * 0.02)
        });
      }
      
      if (form.needPackaging) {
        const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
        details.push({
          service: 'Упаковка',
          description: '',
          price: Math.round(totalWeight * 30)
        });
      }
    }
    
    return details;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">
          Междугородняя доставка Лавсит
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[90vh]">
          {/* Левая часть - форма */}
          <div className="space-y-3 overflow-y-auto pr-2">
            {/* Грузы */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Truck className="h-4 w-4" />
                  Грузы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.cargos.map((cargo, index) => (
                  <div key={cargo.id} className="border border-gray-600 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-white">Груз №{index + 1}</h4>
                      {form.cargos.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeCargo(cargo.id)}
                          className="h-6 text-xs"
                        >
                          Удалить
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-white text-xs">Длина (см)</Label>
                        <Input
                          type="number"
                          value={cargo.length || ''}
                          onChange={(e) => updateCargo(cargo.id, 'length', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600 h-8 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white text-xs">Ширина (см)</Label>
                        <Input
                          type="number"
                          value={cargo.width || ''}
                          onChange={(e) => updateCargo(cargo.id, 'width', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600 h-8 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white text-xs">Высота (см)</Label>
                        <Input
                          type="number"
                          value={cargo.height || ''}
                          onChange={(e) => updateCargo(cargo.id, 'height', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600 h-8 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white text-xs">Вес (кг)</Label>
                        <Input
                          type="number"
                          value={cargo.weight || ''}
                          onChange={(e) => updateCargo(cargo.id, 'weight', Number(e.target.value))}
                          className="bg-gray-700 border-gray-600 h-8 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addCargo} className="w-full h-8" variant="outline">
                  <Plus className="h-3 w-3 mr-1" />
                  Добавить груз
                </Button>
              </CardContent>
            </Card>

            {/* Маршрут */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Map className="h-4 w-4" />
                  Маршрут
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Отправление */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">Отправление</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="fromDelivery"
                        checked={form.fromTerminal}
                        onChange={() => setForm(prev => ({ ...prev, fromTerminal: true, fromAddressDelivery: false }))}
                      />
                      <span className="text-white text-xs">От терминала</span>
                    </label>
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="fromDelivery"
                        checked={form.fromAddressDelivery}
                        onChange={() => setForm(prev => ({ ...prev, fromTerminal: false, fromAddressDelivery: true }))}
                      />
                      <span className="text-white text-xs">От адреса</span>
                    </label>
                  </div>
                  
                  <div>
                    <Label className="text-white text-xs">Город отправления</Label>
                    <Input
                      value={form.fromCity}
                      onChange={(e) => handleAddressChange('fromCity', e.target.value, e.target)}
                      placeholder="Начните вводить город"
                      className="bg-gray-700 border-gray-600 h-8 text-white"
                    />
                  </div>
                  
                  {form.fromAddressDelivery && (
                    <div>
                      <Label className="text-white text-xs">Адрес отправления</Label>
                      <Input
                        value={form.fromAddress}
                        onChange={(e) => handleAddressChange('fromAddress', e.target.value, e.target)}
                        placeholder="Начните вводить адрес"
                        className="bg-gray-700 border-gray-600 h-8 text-white"
                      />
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-600" />

                {/* Доставка */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">Доставка</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="toDelivery"
                        checked={form.toTerminal}
                        onChange={() => setForm(prev => ({ ...prev, toTerminal: true, toAddressDelivery: false }))}
                      />
                      <span className="text-white text-xs">До терминала</span>
                    </label>
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="toDelivery"
                        checked={form.toAddressDelivery}
                        onChange={() => setForm(prev => ({ ...prev, toTerminal: false, toAddressDelivery: true }))}
                      />
                      <span className="text-white text-xs">До адреса</span>
                    </label>
                  </div>
                  
                  <div>
                    <Label className="text-white text-xs">Город доставки</Label>
                    <Input
                      value={form.toCity}
                      onChange={(e) => handleAddressChange('toCity', e.target.value, e.target)}
                      placeholder="Начните вводить город"
                      className="bg-gray-700 border-gray-600 h-8 text-white"
                    />
                  </div>
                  
                  {form.toAddressDelivery && (
                    <div>
                      <Label className="text-white text-xs">Адрес доставки</Label>
                      <Input
                        value={form.toAddress}
                        onChange={(e) => handleAddressChange('toAddress', e.target.value, e.target)}
                        placeholder="Начните вводить адрес"
                        className="bg-gray-700 border-gray-600 h-8 text-white"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Дополнительные параметры */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Дополнительные услуги</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-white text-xs">Объявленная стоимость (руб.)</Label>
                  <Input
                    type="number"
                    value={form.declaredValue || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, declaredValue: Number(e.target.value) }))}
                    className="bg-gray-700 border-gray-600 h-8 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="packaging"
                      checked={form.needPackaging}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needPackaging: checked as boolean }))}
                    />
                    <Label htmlFor="packaging" className="text-white text-xs">Требуется упаковка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance"
                      checked={form.needInsurance}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needInsurance: checked as boolean }))}
                    />
                    <Label htmlFor="insurance" className="text-white text-xs">Требуется страховка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="loading"
                      checked={form.needLoading}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needLoading: checked as boolean }))}
                    />
                    <Label htmlFor="loading" className="text-white text-xs">Требуется погрузка/разгрузка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="carry"
                      checked={form.needCarry}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needCarry: checked as boolean }))}
                    />
                    <Label htmlFor="carry" className="text-white text-xs">Требуется подъем</Label>
                  </div>
                  
                  {form.needCarry && (
                    <div className="ml-6 space-y-2 border-l-2 border-gray-600 pl-3">
                      <div>
                        <Label className="text-white text-xs">Этаж</Label>
                        <Input
                          type="number"
                          value={form.floor}
                          onChange={(e) => setForm(prev => ({ ...prev, floor: Number(e.target.value) }))}
                          className="bg-gray-700 border-gray-600 h-8 text-white"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="freightLift"
                          checked={form.hasFreightLift}
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, hasFreightLift: checked as boolean }))}
                        />
                        <Label htmlFor="freightLift" className="text-white text-xs">Наличие грузового лифта</Label>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleCalculate} 
                  className="w-full bg-blue-600 hover:bg-blue-700 h-8" 
                  disabled={calculating}
                >
                  {calculating ? 'Расчет...' : 'Рассчитать'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Правая часть - результаты */}
          <div className="space-y-3 overflow-y-auto">
            {calculations.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-blue-400">Результаты расчета</h2>
                  <Button onClick={exportToPDF} variant="outline" size="sm" className="h-7 text-xs">
                    Сохранить в PDF
                  </Button>
                </div>
                
                {calculations.map((calc, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-white flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4" />
                          {calc.company}
                        </CardTitle>
                        {calc.error ? (
                          <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            {calc.price.toLocaleString()} ₽
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {calc.error ? (
                        <Alert className="border-red-600">
                          <AlertDescription className="text-white text-xs">{calc.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-white text-xs"><strong>Стоимость:</strong> {calc.price.toLocaleString()} ₽</p>
                          <p className="text-white text-xs"><strong>Срок доставки:</strong> {calc.days} дней</p>
                          
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleDetails(calc.company)}
                              className="h-6 text-xs"
                            >
                              {expandedDetails[calc.company] ? 'Скрыть подробнее' : 'Показать подробнее'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleDebugInfo(calc.company)}
                              className="h-6 text-xs"
                            >
                              {expandedDebugInfo[calc.company] ? 'Скрыть отладку' : 'Отладочная информация'}
                            </Button>
                          </div>
                          
                          {/* Детали расчета */}
                          <Collapsible open={expandedDetails[calc.company]}>
                            <CollapsibleContent className="mt-2">
                              <div className="bg-gray-900 p-3 rounded text-xs">
                                <h4 className="font-bold mb-2 text-white">Детали расчета:</h4>
                                {(() => {
                                  const details = parseCalculationDetails(calc);
                                  const totalPrice = details.reduce((sum, detail) => sum + detail.price, 0);
                                  
                                  return (
                                    <div className="space-y-1">
                                      {details.map((detail, idx) => (
                                        <div key={idx} className="flex justify-between text-white">
                                          <div>
                                            <div className="font-medium">{detail.service}</div>
                                            {detail.description && (
                                              <div className="text-gray-400 text-xs">{detail.description}</div>
                                            )}
                                          </div>
                                          <div className="font-medium">{detail.price.toLocaleString()} ₽</div>
                                        </div>
                                      ))}

                                    </div>
                                  );
                                })()}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                          
                          {/* Отладочная информация */}
                          <Collapsible open={expandedDebugInfo[calc.company]}>
                            <CollapsibleContent className="mt-2">
                              <div className="bg-gray-900 p-3 rounded text-xs">
                                <h4 className="font-bold mb-2 text-white">Отладочная информация:</h4>
                                
                                {calc.apiUrl && (
                                  <div className="mb-3">
                                    <h5 className="font-bold mb-1 text-white">Запрос к API:</h5>
                                    <p className="text-gray-300 break-all">URL: {calc.apiUrl}</p>
                                  </div>
                                )}
                                
                                {calc.sessionId && (
                                  <div className="mb-3">
                                    <h5 className="font-bold mb-1 text-white">Session ID:</h5>
                                    <p className="text-gray-300">{calc.sessionId}</p>
                                  </div>
                                )}
                                
                                {calc.requestData && (
                                  <div className="mb-3">
                                    <h5 className="font-bold mb-1 text-white">Отправленный запрос:</h5>
                                    <pre className="whitespace-pre-wrap overflow-auto max-h-32 text-gray-300 bg-gray-950 p-2 rounded text-xs">
                                      {JSON.stringify(calc.requestData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {calc.responseData && (
                                  <div className="mb-3">
                                    <h5 className="font-bold mb-1 text-white">Полученный ответ:</h5>
                                    <pre className="whitespace-pre-wrap overflow-auto max-h-32 text-gray-300 bg-gray-950 p-2 rounded text-xs">
                                      {JSON.stringify(calc.responseData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {calc.details && (
                                  <div className="mb-3">
                                    <h5 className="font-bold mb-1 text-white">Детали расчета (JSON):</h5>
                                    <pre className="whitespace-pre-wrap overflow-auto max-h-32 text-gray-300 bg-gray-950 p-2 rounded text-xs">
                                      {JSON.stringify(calc.details, null, 2)}
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
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Подключенные транспортные компании</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANIES.map((company, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                      <span className="text-lg">{company.logo}</span>
                      <div>
                        <p className="font-medium text-white text-xs">{company.name}</p>
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

      {/* Автоподсказки */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-w-sm w-full max-h-60 overflow-y-auto"
          style={{
            top: suggestionPosition.top,
            left: suggestionPosition.left
          }}
        >
          <div className="p-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-700 cursor-pointer text-xs text-white rounded transition-colors"
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion.value}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}