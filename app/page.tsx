'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, Truck, Building2, Map, Settings, Package2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import ProductSearch from '@/components/ProductSearch';
import ProductManager from '@/components/ProductManager';
import TruckVisualization from '@/components/TruckVisualization';
import { FurnitureProduct, ProductInForm, CargoWithMetadata } from '@/lib/furniture-types';
import { saveFormData, loadFormData, hasStoredFormData, createDebouncedSaver, clearFormData } from '@/lib/form-storage';
import { 
  createCargosForProduct, 
  removeCargosForProduct, 
  calculateTotalValue,
  findCargoIndexesForProduct 
} from '@/lib/furniture-utils';

interface Cargo {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  // Добавляем метаданные для связи с товарами
  productId?: string;
  placeNumber?: number;
  isFromProduct?: boolean;
  addedAt?: number;
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
  fromLavsiteWarehouse: boolean;
  // Добавляем поддержку товаров
  selectedProducts: ProductInForm[];
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

// Определим базовую структуру компаний
const COMPANIES_BASE = [
  { name: 'ПЭК', logo: '🚛', apiKey: 'pek' },
  { name: 'Деловые Линии', logo: '📦', apiKey: 'dellin' },
  { name: 'Rail Continent', logo: '🚂', apiKey: 'railcontinent' },
  { name: 'Возовоз', logo: '🚚', apiKey: 'vozovoz' },
  { name: 'Nord Wheel', logo: '🌐', apiKey: 'nordwheel' },
  { name: 'Сдэк', logo: '📮', apiKey: 'cdek' },
  { name: 'Новая линия', logo: '🛣️', apiKey: 'newline' },
  { name: 'Ир-Траст', logo: '🏭', apiKey: 'irtrust' },
  { name: 'Майор транс', logo: '⭐', apiKey: 'majortrans' },
  { name: 'БАЙКАЛ СЕРВИС', logo: '🌊', apiKey: 'baikalservice' },
  { name: 'Адамант', logo: '💎', apiKey: 'adamant' },
  { name: 'ЭНЕРГИЯ', logo: '⚡', apiKey: 'energiya' },
  { name: 'ЦАП', logo: '🎯', apiKey: 'cap' },
  { name: 'УралТрансКомпани', logo: '⛰️', apiKey: 'uraltrans' },
  { name: 'НОВОТЭК', logo: '🔧', apiKey: 'novotek' },
  { name: 'Кит', logo: '🐋', apiKey: 'kit' },
  { name: 'Караван', logo: '🐪', apiKey: 'karavan' },
  { name: 'ЖелДорЭкспедиция', logo: '🚄', apiKey: 'zeldor' },
  { name: 'ДК Транзит', logo: '🚐', apiKey: 'dktransit' },
  { name: 'Главтрасса', logo: '🛤️', apiKey: 'glavtrassa' },
  { name: 'Балтийская Служба Доставки', logo: '⚓', apiKey: 'baltservice' },
  { name: 'АНКОР', logo: '🔗', apiKey: 'ankor' }
];

export default function Home() {
  // Начальное состояние формы
  const initialFormState: DeliveryForm = {
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
    toAddressDelivery: false,
    fromLavsiteWarehouse: false,
    selectedProducts: []
  };

  const [form, setForm] = useState<DeliveryForm>(initialFormState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isFormChanged, setIsFormChanged] = useState(false);
  
  // Создаем дебаунс функцию для сохранения (сохраняем через 1 секунду после последнего изменения)
  const debouncedSave = useMemo(() => {
    const saver = createDebouncedSaver(1000);
    // Оборачиваем в функцию, которая обновляет индикаторы
    return (formData: any) => {
      setIsFormChanged(true);
      saver(formData);
      // Обновляем время последнего сохранения через небольшую задержку
      setTimeout(() => {
        setLastSaveTime(new Date());
        setIsFormChanged(false);
      }, 1100);
    };
  }, []);

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState('');
  
  // Состояние для управления включением/выключением транспортных компаний
  const [enabledCompanies, setEnabledCompanies] = useState<Record<string, boolean>>({
    pek: true,
    dellin: true,
    railcontinent: true,
    vozovoz: true,
    nordwheel: true,
    cdek: false,
    newline: false,
    irtrust: false,
    majortrans: false,
    baikalservice: false,
    adamant: false,
    energiya: false,
    cap: false,
    uraltrans: false,
    novotek: false,
    kit: false,
    karavan: false,
    zeldor: false,
    dktransit: false,
    glavtrassa: false,
    baltservice: false,
    ankor: false
  });
  const [calculations, setCalculations] = useState<CalculationResult[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: boolean }>({});
  const [expandedDebugInfo, setExpandedDebugInfo] = useState<{ [key: string]: boolean }>({});
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [apiStatus, setApiStatus] = useState({
    pek: 'проверка...',
    dellin: 'проверка...',
    railcontinent: 'проверка...',
    vozovoz: 'проверка...',
    nordwheel: 'проверка...',
    cdek: 'не подключено',
    newline: 'не подключено',
    irtrust: 'не подключено',
    majortrans: 'не подключено',
    baikalservice: 'не подключено',
    adamant: 'не подключено',
    energiya: 'не подключено',
    cap: 'не подключено',
    uraltrans: 'не подключено',
    novotek: 'не подключено',
    kit: 'не подключено',
    karavan: 'не подключено',
    zeldor: 'не подключено',
    dktransit: 'не подключено',
    glavtrassa: 'не подключено',
    baltservice: 'не подключено',
    ankor: 'не подключено'
  });

  // Защита от потери данных - НЕ очищаем localStorage в dev режиме
  // Пользовательские данные должны сохраняться между перезагрузками

  // Загрузка сохраненных данных (только на клиенте)
  useEffect(() => {
    // Проверяем, что мы на клиенте
    if (typeof window !== 'undefined' && !isLoaded) {
      let dataRestored = false;
      try {
        setIsRestoring(true); // Блокируем автосохранение во время восстановления
        
        // Мягкая проверка версии без очистки пользовательских данных
        const currentVersion = 'v2.4.0-persistent-storage'; // Версия с постоянным сохранением
        const savedVersion = localStorage.getItem('appVersion');
        
        if (savedVersion !== currentVersion) {
          console.log('🔄 Обновление версии приложения до', currentVersion);
          // НЕ очищаем localStorage - сохраняем пользовательские данные
          localStorage.setItem('appVersion', currentVersion);
        }
        
        // Пытаемся загрузить данные через новую систему
        const savedFormData = loadFormData();
        if (savedFormData) {
          // Конвертируем загруженные данные в формат компонента
          const restoredForm: DeliveryForm = {
            cargos: savedFormData.cargos.length > 0 ? savedFormData.cargos : [{ id: '1', length: 0, width: 0, height: 0, weight: 0 }],
            fromCity: savedFormData.fromCity,
            toCity: savedFormData.toCity,
            fromAddress: savedFormData.fromAddress,
            toAddress: savedFormData.toAddress,
            declaredValue: savedFormData.declaredValue,
            needPackaging: savedFormData.needPackaging,
            needLoading: savedFormData.needLoading,
            needCarry: savedFormData.needCarry,
            floor: savedFormData.floor,
            hasFreightLift: savedFormData.hasFreightLift,
            needInsurance: savedFormData.needInsurance,
            fromTerminal: savedFormData.fromTerminal,
            toTerminal: savedFormData.toTerminal,
            fromAddressDelivery: savedFormData.fromAddressDelivery,
            toAddressDelivery: savedFormData.toAddressDelivery,
            fromLavsiteWarehouse: savedFormData.fromLavsiteWarehouse || false,
            selectedProducts: savedFormData.selectedProducts,
          };
          
          setForm(restoredForm);
          
          // Восстанавливаем состояние включенных компаний
          if (savedFormData.enabledCompanies && Object.keys(savedFormData.enabledCompanies).length > 0) {
            setEnabledCompanies(savedFormData.enabledCompanies);
          }
          console.log('✅ Данные формы успешно восстановлены из localStorage');
          
          // Диагностика времени для Supabase
          const currentTime = Math.floor(Date.now() / 1000);
          console.log('🕒 Текущее время (timestamp):', currentTime);
          console.log('🕒 Текущее время (ISO):', new Date().toISOString());
          
          dataRestored = true;
          // Небольшая задержка чтобы все состояния успели обновиться
          setTimeout(() => {
            setIsRestoring(false);
          }, 100);
        } else {
          // Проверяем старый формат данных для миграции
          const oldSaved = localStorage.getItem('deliveryForm');
          if (oldSaved) {
            console.log('🔄 Найдены данные в старом формате, выполняется миграция...');
            const oldForm = JSON.parse(oldSaved);
            if (!oldForm.cargos || oldForm.cargos.length === 0) {
              oldForm.cargos = [{ id: '1', length: 0, width: 0, height: 0, weight: 0 }];
            }
            setForm(oldForm);
            
            // Сохраняем в новом формате и удаляем старые данные
            saveFormData(oldForm);
            localStorage.removeItem('deliveryForm');
            console.log('✅ Миграция завершена');
            
            dataRestored = true;
            // Небольшая задержка чтобы все состояния успели обновиться
            setTimeout(() => {
              setIsRestoring(false);
            }, 100);
          }
        }
        
        // Выводим все доступные ТК для отладки
        console.log('📋 Всего доступно ТК:', COMPANIES_BASE.length);
        console.log('📋 Список ТК:', COMPANIES_BASE.map(c => c.name));
        
      } catch (error) {
        console.error('Ошибка загрузки сохраненных данных:', error);
        // В случае ошибки оставляем начальное состояние
      } finally {
        // Если данные не восстановлены, сразу разблокируем автосохранение
        if (!dataRestored) {
          setIsRestoring(false);
        }
        setIsLoaded(true);
      }
    }
  }, [isLoaded]);

  // Автоматическое сохранение данных при изменении формы (с дебаунсом)
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded && !isRestoring) {
      // Используем дебаунс для ограничения частоты сохранения
      debouncedSave({
        cargos: form.cargos,
        fromCity: form.fromCity,
        toCity: form.toCity,
        fromAddress: form.fromAddress,
        toAddress: form.toAddress,
        declaredValue: form.declaredValue,
        needPackaging: form.needPackaging,
        needLoading: form.needLoading,
        needCarry: form.needCarry,
        floor: form.floor,
        hasFreightLift: form.hasFreightLift,
        needInsurance: form.needInsurance,
        fromTerminal: form.fromTerminal,
        toTerminal: form.toTerminal,
        fromAddressDelivery: form.fromAddressDelivery,
        toAddressDelivery: form.toAddressDelivery,
        fromLavsiteWarehouse: form.fromLavsiteWarehouse,
        selectedProducts: form.selectedProducts,
        enabledCompanies: enabledCompanies,
      });
    }
  }, [form, enabledCompanies, isLoaded, isRestoring, debouncedSave]);

  // Автоматическая страховка при указании стоимости
  useEffect(() => {
    if (form.declaredValue > 0) {
      setForm(prev => ({ ...prev, needInsurance: true }));
    }
  }, [form.declaredValue]);

  // Обработка сообщений об обновлении данных товаров
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRODUCTS_UPDATED') {
        console.log('📨 Получено сообщение об обновлении товаров:', event.data.data);
        
        // Очищаем локальные кэши товаров
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('furniture_') || key.startsWith('product_') || key.includes('ProductSearch'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧽 Очищено ${keysToRemove.length} ключей кэша товаров`);
        
        // Отправляем сообщение компоненту ProductSearch о необходимости обновления
        window.dispatchEvent(new CustomEvent('forceProductsReload', {
          detail: event.data.data
        }));
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Проверка статуса API при загрузке страницы
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      checkAllAPIStatus();
    }
  }, [isLoaded]);

  const checkAPIStatus = async (apiName: string, testFunction: () => Promise<any>) => {
    try {
      const result = await testFunction();
      if (result && !result.error) {
        setApiStatus(prev => ({ ...prev, [apiName]: 'подключено' }));
      } else {
        setApiStatus(prev => ({ ...prev, [apiName]: 'ошибка' }));
      }
    } catch (error) {
      setApiStatus(prev => ({ ...prev, [apiName]: 'ошибка' }));
    }
  };

  const checkAllAPIStatus = async () => {
    // Тестовые данные для проверки
    const testData = {
      fromCity: 'Москва',
      toCity: 'Санкт-Петербург', 
      cargos: [{ id: '1', length: 100, width: 100, height: 100, weight: 10 }],
      declaredValue: 50000,
      fromAddressDelivery: false,
      toAddressDelivery: false,
      needPackaging: false,
      needInsurance: false
    };

    // Сохраняем текущее состояние формы
    const currentForm = form;
    
    // Временно устанавливаем тестовые данные
    setForm({
      ...form,
      fromCity: testData.fromCity,
      toCity: testData.toCity,
      cargos: testData.cargos,
      declaredValue: testData.declaredValue,
      fromAddressDelivery: testData.fromAddressDelivery,
      toAddressDelivery: testData.toAddressDelivery,
      needPackaging: testData.needPackaging,
      needInsurance: testData.needInsurance
    });

    // Запускаем проверки параллельно
    Promise.all([
      checkAPIStatus('pek', async () => {
        try {
          const response = await fetch('/api/pek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'test' })
          });
          const data = await response.json();
          if (data.status === 'OK') {
            return { success: true };
          } else {
            return { error: true };
          }
        } catch (error) {
          return { error: true };
        }
      }),
      
      checkAPIStatus('dellin', async () => {
        try {
          // Тестируем получение sessionID для Деловых Линий (тот же метод что в calculateDellin)
          const authResponse = await fetch('https://api.dellin.ru/v3/auth/login.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
              login: 'service@lavsit.ru',
              password: 'edcwsx123QAZ'
            })
          });
          const authData = await authResponse.json();
          
          // Проверяем все возможные пути к sessionID как в calculateDellin
          if (authData.data?.sessionID || authData.sessionID || authData.data?.session) {
            return { success: true };
          } else {
            return { error: true };
          }
        } catch (error) {
          return { error: true };
        }
      }),
      
      checkAPIStatus('railcontinent', async () => {
        try {
          const response = await fetch('/api/rail-continent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city_sender: testData.fromCity,
              city_receiver: testData.toCity,
              weight: 10,
              volume: 0.1,
              length: 1,
              width: 1,
              height: 1,
              declared_cost: testData.declaredValue,
              pickup: '0',
              delivery: '0',
              packaging: '0',
              insurance: '0',
              tariff: 'auto'
            })
          });
          return await response.json();
        } catch (error) {
          return { error: true };
        }
      }),
      
      checkAPIStatus('vozovoz', async () => {
        try {
          const response = await fetch('/api/vozovoz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
                      location: testData.fromCity,
                      terminal: "default"
                    }
                  },
                  destination: {
                    point: {
                      location: testData.toCity,
                      terminal: "default"
                    }
                  }
                }
              }
            })
          });
          return await response.json();
        } catch (error) {
          return { error: true };
        }
      }),
      
      checkAPIStatus('nordwheel', async () => {
        try {
          const totalWeight = 10;
          const totalVolume = 0.1;
          
          const params = new URLSearchParams({
            from: '91',
            to: '92',
            pickup: '1',
            deliver: '1',
            weight: totalWeight.toString(),
            volume: totalVolume.toString(),
            oversized: '0',
            package: '1',
            packageCount: '1',
            insurance: '1',
            sum: '50000',
            documentsReturn: '0',
            fragile: '1'
          });

          const fullUrl = `https://nordw.ru/tools/api/calc/calculate/?${params.toString()}`;
          const response = await fetch(fullUrl);
          const data = await response.json();
          
          if (response.ok && data.status === 'success') {
            return { success: true };
          } else {
            return { error: true };
          }
        } catch (error) {
          return { error: true };
        }
      })
    ]).finally(() => {
      // Восстанавливаем исходное состояние формы
      setForm(currentForm);
    });
  };

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
          count: 10,
          // Ограничение для полей городов - только города
          ...(field === 'fromCity' || field === 'toCity' ? {
            restrict_value: true,
            locations: [{
              country: 'Россия'
            }],
            from_bound: { value: 'city' },
            to_bound: { value: 'city' }
          } : {})
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
    setActiveField('');
  };

  // Обработчик для чекбокса "Со склада Лавсит"
  const handleLavsiteWarehouseChange = (checked: boolean) => {
    if (checked) {
      setForm(prev => ({
        ...prev,
        fromLavsiteWarehouse: true,
        fromAddressDelivery: true,
        fromTerminal: false,
        fromCity: 'Лосино-Петровский',
        fromAddress: 'деревня Осеево, 202, городской округ Лосино-Петровский, Московская область'
      }));
    } else {
      setForm(prev => ({
        ...prev,
        fromLavsiteWarehouse: false,
        fromCity: '',
        fromAddress: ''
      }));
    }
  };

  const addCargo = () => {
    const newId = (form.cargos.length + 1).toString();
    setForm(prev => ({
      ...prev,
      cargos: [...prev.cargos, { id: newId, length: 0, width: 0, height: 0, weight: 0 }]
    }));
  };

  const updateCargo = (id: string, field: string, value: number) => {
    setForm(prev => {
      const updatedCargos = prev.cargos.map(cargo => 
        cargo.id === id ? { ...cargo, [field]: value } : cargo
      );
      
      // Очищаем пустые грузы согласно новой логике
      const cleanResult = cleanEmptyCargos(updatedCargos, prev.selectedProducts || []);
      
      return {
        ...prev,
        cargos: cleanResult.cargos,
        selectedProducts: cleanResult.products
      };
    });
  };

  const removeCargo = (id: string) => {
    if (form.cargos.length > 1) {
      setForm(prev => ({
        ...prev,
        cargos: prev.cargos.filter(cargo => cargo.id !== id)
      }));
    }
  };

  // 🔧 Функция для проверки пустых грузов (все поля равны 0)
  const isEmptyCargo = (cargo: Cargo) => {
    return cargo.length === 0 && cargo.width === 0 && cargo.height === 0 && cargo.weight === 0;
  };

  // 🔧 Функция очистки пустых грузов
  const cleanEmptyCargos = (cargos: Cargo[], selectedProducts: ProductInForm[]) => {
    // Проверяем есть ли хотя бы один заполненный груз
    const hasFilledCargos = cargos.some(cargo => !isEmptyCargo(cargo));
    
    if (!hasFilledCargos) {
      // Если нет заполненных грузов, оставляем только первый пустой
      return {
        cargos: cargos.length > 0 ? [{ id: '1', length: 0, width: 0, height: 0, weight: 0 }] : [{ id: '1', length: 0, width: 0, height: 0, weight: 0 }],
        products: selectedProducts
      };
    }

    // Создаем маппинг старых индексов к новым
    const oldToNewIndexMap = new globalThis.Map<number, number>();
    let newIndex = 0;
    
    cargos.forEach((cargo, oldIndex) => {
      if (!isEmptyCargo(cargo)) {
        oldToNewIndexMap.set(oldIndex, newIndex);
        newIndex++;
      }
    });
    
    // Оставляем только заполненные грузы
    const filledCargos = cargos.filter(cargo => !isEmptyCargo(cargo));
    
    // Обновляем индексы у товаров
    const updatedProducts = selectedProducts.map(productItem => ({
      ...productItem,
      cargoIndexes: productItem.cargoIndexes
        .map(oldIndex => oldToNewIndexMap.get(oldIndex))
        .filter(newIdx => newIdx !== undefined) as number[]
    }));
    
    return {
      cargos: filledCargos,
      products: updatedProducts
    };
  };

  // 🔧 Функция группировки грузов для отображения
  interface GroupedCargoDisplay {
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity: number;
    indices: number[];
    isEmpty: boolean;
  }

  const groupCargosForDisplay = (cargos: Cargo[]): GroupedCargoDisplay[] => {
    const groups = new globalThis.Map<string, GroupedCargoDisplay>();
    
    cargos.forEach((cargo, index) => {
      const isEmpty = isEmptyCargo(cargo);
      
      // Для пустых грузов не группируем
      if (isEmpty) {
        groups.set(`empty_${index}`, {
          length: 0,
          width: 0,
          height: 0,
          weight: 0,
          quantity: 1,
          indices: [index],
          isEmpty: true
        });
        return;
      }
      
      // Создаем ключ для группировки на основе габаритов и веса
      const key = `${cargo.length}_${cargo.width}_${cargo.height}_${cargo.weight}`;
      
      if (groups.has(key)) {
        const existing = groups.get(key)!;
        existing.quantity += 1;
        existing.indices.push(index);
      } else {
        groups.set(key, {
          length: cargo.length,
          width: cargo.width,
          height: cargo.height,
          weight: cargo.weight,
          quantity: 1,
          indices: [index],
          isEmpty: false
        });
      }
    });
    
    // Возвращаем сортированный массив: сначала заполненные (по количеству убывания), потом пустые
    return Array.from(groups.values()).sort((a, b) => {
      if (a.isEmpty && !b.isEmpty) return 1;
      if (!a.isEmpty && b.isEmpty) return -1;
      if (!a.isEmpty && !b.isEmpty) {
        return b.quantity - a.quantity; // По убыванию количества
      }
      return a.indices[0] - b.indices[0]; // Пустые по порядку индексов
    });
  };

  // 🔧 Функции управления товарами
  const handleProductAdd = (product: FurnitureProduct) => {
    const timestamp = Date.now();
    
    console.log(`➕ Добавление товара: ${product.name} (${product.cargoPlaces.length} грузовых мест)`);
    
    // Создаем грузовые места для товара
    const newCargos = createCargosForProduct(product, 1, timestamp);
    
    console.log('Создано новых грузов:', newCargos.length);
    console.log('Новые грузы:', newCargos.map(c => ({ id: c.id, productId: c.productId, addedAt: c.addedAt })));
    
    // Создаем объект товара в форме
    const productInForm: ProductInForm = {
      product,
      quantity: 1,
      totalPrice: product.retailPrice,
      cargoIndexes: [], // Заполним после добавления грузов
      addedAt: timestamp
    };
    
    setForm(prev => {
      let updatedCargos = [...prev.cargos];
      let cargoIndexes: number[] = [];
      
      // Находим пустые грузы для заполнения
      const emptyCargos = updatedCargos
        .map((cargo, index) => ({ cargo, index }))
        .filter(item => isEmptyCargo(item.cargo));
      
      console.log('Найдено пустых грузов:', emptyCargos.length);
      console.log('Нужно заполнить грузов:', newCargos.length);
      
      // Заполняем пустые грузы данными товара
      let filledCount = 0;
      for (let i = 0; i < Math.min(emptyCargos.length, newCargos.length); i++) {
        const emptyCargoIndex = emptyCargos[i].index;
        const newCargoData = newCargos[i];
        
        updatedCargos[emptyCargoIndex] = {
          ...updatedCargos[emptyCargoIndex],
          length: newCargoData.length,
          width: newCargoData.width,
          height: newCargoData.height,
          weight: newCargoData.weight,
          productId: newCargoData.productId,
          placeNumber: newCargoData.placeNumber,
          isFromProduct: newCargoData.isFromProduct,
          addedAt: newCargoData.addedAt
        };
        
        cargoIndexes.push(emptyCargoIndex);
        filledCount++;
      }
      
      // Если нужно больше грузов, чем есть пустых - добавляем новые
      if (filledCount < newCargos.length) {
        const remainingCargos = newCargos.slice(filledCount);
        const startIndex = updatedCargos.length;
        
        for (let i = 0; i < remainingCargos.length; i++) {
          updatedCargos.push(remainingCargos[i]);
          cargoIndexes.push(startIndex + i);
        }
      }
      
      productInForm.cargoIndexes = cargoIndexes;
      
      console.log('Индексы заполненных грузов:', cargoIndexes);
      console.log('Общее количество грузов после добавления:', updatedCargos.length);
      
      // Пересчитываем объявленную стоимость
      const prevSelectedProducts = prev.selectedProducts || [];
      const newSelectedProducts = [...prevSelectedProducts, productInForm];
      const newDeclaredValue = calculateTotalValue(newSelectedProducts);
      
      // Очищаем пустые грузы согласно новой логике
      const cleanResult = cleanEmptyCargos(updatedCargos, newSelectedProducts);
      
      return {
        ...prev,
        cargos: cleanResult.cargos,
        selectedProducts: cleanResult.products,
        declaredValue: newDeclaredValue
      };
    });
    
    console.log(`✅ Добавлен товар: ${product.name} (${newCargos.length} грузовых мест)`);
    console.log('Финальное состояние грузов:', newCargos.length);
  };

  const handleProductQuantityChange = (productId: string, addedAt: number, newQuantity: number) => {
    setForm(prev => {
      console.log(`🔢 Изменение количества товара ${productId} с ${prev.selectedProducts?.find(p => p.product.id === productId && p.addedAt === addedAt)?.quantity || 0} на ${newQuantity}`);
      
      // Находим товар
      const selectedProducts = prev.selectedProducts || [];
      const productIndex = selectedProducts.findIndex(p => 
        p.product.id === productId && p.addedAt === addedAt
      );
      
      if (productIndex === -1) {
        console.warn('❌ Товар не найден для изменения количества');
        return prev;
      }
      
      const product = selectedProducts[productIndex];
      console.log('Грузы до изменения количества:', prev.cargos.length);
      
      // Удаляем старые грузы этого товара
      const cargosWithoutProduct = removeCargosForProduct(
        prev.cargos as CargoWithMetadata[], 
        productId, 
        addedAt
      );
      
      console.log('Грузы после удаления старых:', cargosWithoutProduct.length);
      
      // Создаем новые грузы с новым количеством
      const newCargos = createCargosForProduct(product.product, newQuantity, addedAt);
      const updatedCargos = [...cargosWithoutProduct, ...newCargos];
      
      console.log('Грузы после добавления новых:', updatedCargos.length);
      
      // Обновляем товар
      const updatedProduct = {
        ...product,
        quantity: newQuantity,
        totalPrice: product.product.retailPrice * newQuantity,
        cargoIndexes: findCargoIndexesForProduct(updatedCargos, productId, addedAt)
      };
      
      const updatedProducts = selectedProducts.map((p, index) => 
        index === productIndex ? updatedProduct : p
      );
      
      // Пересчитываем объявленную стоимость
      const newDeclaredValue = calculateTotalValue(updatedProducts);
      
      // Очищаем пустые грузы согласно новой логике
      const cleanResult = cleanEmptyCargos(updatedCargos, updatedProducts);
      
      return {
        ...prev,
        cargos: cleanResult.cargos,
        selectedProducts: cleanResult.products,
        declaredValue: newDeclaredValue
      };
    });
    
    console.log(`🔄 Изменено количество товара ${productId}: ${newQuantity} шт.`);
  };

  const handleProductRemove = (productId: string, addedAt: number) => {
    setForm(prev => {
      console.log(`🗑️ Удаление товара ${productId} (addedAt: ${addedAt})`);
      
      // Находим товар и его индексы грузов
      const selectedProducts = prev.selectedProducts || [];
      const product = selectedProducts.find(p => 
        p.product.id === productId && p.addedAt === addedAt
      );
      
      if (!product) {
        console.log('Товар не найден');
        return prev;
      }
      
      // Очищаем грузы товара (делаем их пустыми вместо удаления)
      const updatedCargos = prev.cargos.map((cargo, index) => {
        if (product.cargoIndexes.includes(index)) {
          return {
            ...cargo,
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
            productId: undefined,
            placeNumber: undefined,
            isFromProduct: undefined,
            addedAt: undefined
          };
        }
        return cargo;
      });
      
      // Удаляем товар из списка
      const updatedProducts = selectedProducts.filter(p => 
        !(p.product.id === productId && p.addedAt === addedAt)
      );
      
      // Пересчитываем объявленную стоимость
      const newDeclaredValue = calculateTotalValue(updatedProducts);
      
      // Очищаем пустые грузы согласно новой логике
      const cleanResult = cleanEmptyCargos(updatedCargos, updatedProducts);
      
      console.log('Грузы после очистки:', cleanResult.cargos.length);
      console.log('Удалено пустых грузов:', updatedCargos.length - cleanResult.cargos.length);
      
      return {
        ...prev,
        cargos: cleanResult.cargos,
        selectedProducts: cleanResult.products,
        declaredValue: newDeclaredValue
      };
    });
    
    console.log(`🗑️ Удален товар ${productId}`);
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

      const authData = await authResponse.json();
      console.log('🔑 АВТОРИЗАЦИЯ ДЛ response.ok:', authResponse.ok);
      console.log('🔑 АВТОРИЗАЦИЯ ДЛ authData:', authData);
      console.log('🔑 АВТОРИЗАЦИЯ ДЛ authData.data:', authData.data);
      console.log('🔑 АВТОРИЗАЦИЯ ДЛ authData.data?.sessionID:', authData.data?.sessionID);
      
      // Проверяем разные возможные пути к sessionID
      let sessionID = null;
      
      if (authData.data?.sessionID) {
        sessionID = authData.data.sessionID;
        console.log('✅ SessionID найден в data.sessionID:', sessionID);
      } else if (authData.sessionID) {
        sessionID = authData.sessionID;
        console.log('✅ SessionID найден в sessionID:', sessionID);
      } else if (authData.data?.session) {
        sessionID = authData.data.session;
        console.log('✅ SessionID найден в data.session:', sessionID);
      }
      
      if (authResponse.ok && sessionID) {
        return sessionID;
      } else {
        console.error('❌ Ошибка авторизации Деловые Линии:', authData);
        console.error('❌ Статус ответа:', authResponse.status);
        console.error('❌ Текст ответа:', authResponse.statusText);
        return null;
      }
    } catch (error) {
      console.error('Ошибка соединения с авторизацией Деловые Линии:', error);
    }
    return null;
  };

  // Загрузка локального справочника городов Деловых Линий
  const loadDellinCities = async () => {
    try {
      const response = await fetch('/data/dellin-cities.json');
      if (!response.ok) {
        console.error('❌ Не удалось загрузить справочник городов');
        return null;
      }
      const data = await response.json();
      return data.cities;
    } catch (error) {
      console.error('❌ Ошибка загрузки справочника городов:', error);
      return null;
    }
  };

  // Поиск cityID в локальном справочнике
  const getCityIDFromLocal = async (cityName: string): Promise<string | null> => {
    const cities = await loadDellinCities();
    if (!cities) return null;

    const normalizedSearch = cityName.toLowerCase().trim()
      .replace(/^г\s+/, '') // Убираем префикс "г "
      .replace(/^город\s+/, '') // Убираем префикс "город "
      .replace(/\s+/g, ' '); // Нормализуем пробелы

    console.log(`🔍 Поиск cityID для города: "${normalizedSearch}"`);

    // Поиск в справочнике
    for (const city of cities) {
      // Проверяем точное совпадение с именем города
      if (city.name.toLowerCase() === normalizedSearch) {
        console.log(`✅ Точное совпадение: "${city.name}" -> cityID: ${city.cityID}`);
        return city.cityID;
      }

      // Проверяем совпадение с поисковыми строками
      for (const searchString of city.searchStrings) {
        if (searchString === normalizedSearch) {
          console.log(`✅ Найдено в поисковых строках: "${searchString}" для города "${city.name}" -> cityID: ${city.cityID}`);
          return city.cityID;
        }
      }
    }

    console.warn(`⚠️ cityID не найден в локальном справочнике для города: "${normalizedSearch}"`);
    return null;
  };

  // Получение терминалов Деловые Линии для города с указанием направления
  const getDellinTerminalByDirection = async (citySearch: string, direction: 'arrival' | 'derival'): Promise<string | null> => {
    try {
      // Получаем валидный sessionID
      const sessionID = await getDellinSessionId();
      if (!sessionID) {
        console.error(`❌ Не удалось получить sessionID для поиска терминалов ${direction}`);
        return null;
      }

      // Получаем cityID для города из локального справочника
      const cityID = await getCityIDFromLocal(citySearch);
      if (!cityID) {
        console.warn(`⚠️ cityID не найден для города "${citySearch}". Пробуем поиск без cityID...`);
      }

      console.log(`🔍 Поиск терминала ${direction} для города:`, citySearch);
      console.log(`🆔 Используем cityID:`, cityID);
      console.log(`🔑 Используем sessionID:`, sessionID);

      // Нормализуем название города для поиска
      const normalizedCity = citySearch.toLowerCase().trim()
        .replace(/^г\s+/, '') // Убираем префикс "г "
        .replace(/^город\s+/, '') // Убираем префикс "город "
        .replace(/\s+/g, ' '); // Нормализуем пробелы

      // Используем правильный API endpoint для поиска терминалов
      // Структура запроса согласно API Деловых Линий
      const requestBody: any = {
        appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
        sessionID: sessionID,
        search: normalizedCity,
        direction: direction,
        maxCargoDimensions: {
          length: 3.0,
          width: 3.0,
          height: 3.0,
          weight: 3.0,
          maxVolume: 3.0,
          totalVolume: 3.0,
          totalWeight: 3.0
        },
        express: true,
        freeStorageDays: "2"
      };

      // Добавляем cityID если он найден
      if (cityID) {
        requestBody.cityid = cityID;
        console.log(`🆔 Добавляем cityID в запрос: ${cityID}`);
      }

      console.log(`📤 Запрос терминалов ${direction}:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log(`🚛 Деловые Линии терминалы ${direction} response status:`, response.status);
      console.log(`🚛 Деловые Линии терминалы ${direction} response:`, data);
      
      // Детальный анализ структуры ответа
      console.log(`🔍 Анализ ответа Деловых Линий ${direction}:`);
      console.log(`   - response.ok: ${response.ok}`);
      console.log(`   - data тип:`, typeof data);
      console.log(`   - data.terminals:`, data.terminals);
      console.log(`   - data.terminals тип:`, typeof data.terminals);
      console.log(`   - data.terminals.length:`, data.terminals?.length);
      console.log(`   - data.metadata:`, data.metadata);
      console.log(`   - data.errors:`, data.errors);
      console.log(`   - Все ключи data:`, Object.keys(data));
      
      if (response.ok && data.terminals && data.terminals.length > 0) {
        console.log(`🔍 Найденные терминалы ${direction}:`, data.terminals.map((t: any) => ({
          id: t.id,
          city: t.city,
          name: t.name,
          address: t.address,
          default: t.default
        })));
        
        // Ищем терминал по умолчанию
        let terminal = data.terminals.find((t: any) => t.default === true);
        
        // Если нет терминала по умолчанию, берем первый
        if (!terminal && data.terminals.length > 0) {
          terminal = data.terminals[0];
        }
        
        if (terminal) {
          console.log(`✅ Найден терминал ${direction}:`, { 
            id: terminal.id, 
            city: terminal.city, 
            name: terminal.name,
            default: terminal.default 
          });
          return terminal.id.toString();
        }
      }
      
      // Если основной поиск не дал результатов, пробуем альтернативные варианты
      console.warn(`⚠️ Терминалы ${direction} не найдены для города "${normalizedCity}". Пробуем альтернативные варианты...`);
      
      // Список альтернативных вариантов названий для популярных городов
      const alternativeNames: { [key: string]: string[] } = {
        'санкт-петербург': ['спб', 'санкт петербург', 'петербург', 'ленинград'],
        'москва': ['московская область', 'мск'],
        'екатеринбург': ['свердловск', 'екб'],
        'нижний новгород': ['н.новгород', 'нижний-новгород'],
        'ростов-на-дону': ['ростов на дону', 'ростов'],
      };
      
      if (alternativeNames[normalizedCity]) {
        for (const altName of alternativeNames[normalizedCity]) {
          console.log(`🔄 Пробуем альтернативное название: "${altName}"`);
          
          const altRequestBody = {
            ...requestBody,
            search: altName
          };
          
          // Убираем cityID для альтернативного поиска
          delete altRequestBody.cityid;
          
          try {
            const altResponse = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(altRequestBody)
            });
            
            const altData = await altResponse.json();
            console.log(`🚛 Альтернативный поиск "${altName}" response:`, altData);
            
            if (altResponse.ok && altData.terminals && altData.terminals.length > 0) {
              let terminal = altData.terminals.find((t: any) => t.default === true);
              if (!terminal && altData.terminals.length > 0) {
                terminal = altData.terminals[0];
              }
              
              if (terminal) {
                console.log(`✅ Найден терминал ${direction} по альтернативному названию "${altName}":`, { 
                  id: terminal.id, 
                  city: terminal.city, 
                  name: terminal.name 
                });
                return terminal.id.toString();
              }
            }
          } catch (altError) {
            console.warn(`⚠️ Ошибка альтернативного поиска "${altName}":`, altError);
          }
        }
      }
      
      console.warn(`❌ Терминалы ${direction} не найдены для города:`, citySearch);
      console.warn('⚠️ Response status:', response.status);
      console.warn('⚠️ Response data:', data);
      return null;
    } catch (error) {
      console.error(`❌ Ошибка получения терминалов ${direction} Деловые Линии:`, error);
      return null;
    }
  };

  // Получение терминалов Деловые Линии для города (используем функцию с направлением)
  const getDellinTerminal = async (citySearch: string): Promise<string | null> => {
    return getDellinTerminalByDirection(citySearch, 'arrival');
  };

  // Получение UID упаковки "crate_with_bubble" из справочника упаковок Деловые Линии с повторной авторизацией
  const getDellinCrateWithBubbleUid = async (): Promise<string | null> => {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📦 СПРАВОЧНИК УПАКОВОК: попытка ${attempt}/${maxRetries}`);
        
        const response = await fetch('/api/dellin-packages', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('📦 СПРАВОЧНИК УПАКОВОК response.ok:', response.ok);
        console.log('📦 СПРАВОЧНИК УПАКОВОК status:', response.status);
        console.log('📦 СПРАВОЧНИК УПАКОВОК data:', data);
        
        // Если 401 Unauthorized - пробуем переавторизоваться
        if (response.status === 401 && attempt < maxRetries) {
          console.log('🔄 СПРАВОЧНИК УПАКОВОК: получили 401, выполняем повторную авторизацию...');
          const newSessionId = await getDellinSessionId();
          if (newSessionId) {
            console.log('✅ СПРАВОЧНИК УПАКОВОК: получен новый SessionID, повторяем запрос...');
            continue; // Пробуем еще раз с новой авторизацией
          } else {
            console.error('❌ СПРАВОЧНИК УПАКОВОК: не удалось получить новый SessionID');
            return null;
          }
        }
        
        if (response.ok && data.data && Array.isArray(data.data)) {
          console.log('📦 Количество упаковок в справочнике:', data.data.length);
          console.log('📦 Первые 3 упаковки:', data.data.slice(0, 3).map(p => ({name: p.name, uid: p.uid})));
          
          // Находим упаковку с name "crate_with_bubble"
          const crateWithBubble = data.data.find((pkg: any) => 
            pkg.name === 'crate_with_bubble'
          );
          
          console.log('📦 Поиск crate_with_bubble результат:', crateWithBubble);
          
          if (crateWithBubble && crateWithBubble.uid) {
            console.log('✅ Найден UID для crate_with_bubble:', crateWithBubble.uid);
            return crateWithBubble.uid;
          } else {
            console.log('❌ crate_with_bubble не найден или нет UID');
          }
        } else {
          console.log('❌ Ошибка структуры ответа API упаковок');
        }
        
        // Если дошли сюда, значит не нашли упаковку или была другая ошибка
        break;
        
      } catch (error) {
        console.error(`❌ СПРАВОЧНИК УПАКОВОК: ошибка на попытке ${attempt}:`, error);
        if (attempt === maxRetries) {
          console.error('❌ СПРАВОЧНИК УПАКОВОК: исчерпаны все попытки');
          return null;
        }
      }
    }
    
    console.warn('Упаковка с name=crate_with_bubble не найдена в справочнике');
    return null;
  };

  // Расчет для Деловых Линий через корректный API v2/calculator.json с повторной авторизацией
  const calculateDellin = async (): Promise<CalculationResult> => {
    const apiUrl = 'https://api.dellin.ru/v2/calculator.json';
    const maxRetries = 2;
    
    console.log('🚀 === НАЧАЛО РАСЧЕТА ДЕЛОВЫХ ЛИНИЙ ===');
    console.log('🚀 API URL:', apiUrl);
    
    try {
      let sessionID = await getDellinSessionId();
      
      if (!sessionID) {
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: 'Не удалось получить sessionID',
          apiUrl,
          requestData: null,
          responseData: null
        };
      }

      // Вычисляем размеры и объемы
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );
      const maxLength = Math.max(...form.cargos.map(c => c.length)) / 100; // в метрах
      const maxWidth = Math.max(...form.cargos.map(c => c.width)) / 100;
      const maxHeight = Math.max(...form.cargos.map(c => c.height)) / 100;

      // Получаем терминалы для городов (если нужно)
      const fromTerminalId = !form.fromAddressDelivery ? await getDellinTerminalByDirection(form.fromCity, 'derival') : null;
      const toTerminalId = !form.toAddressDelivery ? await getDellinTerminalByDirection(form.toCity, 'arrival') : null;
      
      console.log('🏢 ТЕРМИНАЛЫ ДЛ:');
      console.log('🏢 form.fromAddressDelivery:', form.fromAddressDelivery);
      console.log('🏢 form.toAddressDelivery:', form.toAddressDelivery);
      console.log('🏢 fromTerminalId:', fromTerminalId);
      console.log('🏢 toTerminalId:', toTerminalId);
      
      // Проверяем что терминалы найдены для терминальной доставки
      if (!form.fromAddressDelivery && !fromTerminalId) {
        console.error('❌ Не найден терминал отправления для города:', form.fromCity);
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: `Не найден терминал Деловых Линий в городе отправления: ${form.fromCity}`,
          apiUrl,
          requestData: null,
          responseData: null
        };
      }
      
      if (!form.toAddressDelivery && !toTerminalId) {
        console.error('❌ Не найден терминал назначения для города:', form.toCity);
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: `Не найден терминал Деловых Линий в городе назначения: ${form.toCity}`,
          apiUrl,
          requestData: null,
          responseData: null
        };
      }

      // Получаем UID упаковки crate_with_bubble (если нужна упаковка)
      let packageUid: string | null = null;
      console.log('=== НАЧАЛО ОТЛАДКИ УПАКОВКИ ===');
      console.log('🔍 ОТЛАДКА УПАКОВКИ: form.needPackaging =', form.needPackaging);
      console.log('🔍 ОТЛАДКА УПАКОВКИ: typeof form.needPackaging =', typeof form.needPackaging);
      
      if (form.needPackaging) {
        console.log('🔍 ✅ УПАКОВКА ТРЕБУЕТСЯ - ЗАПРАШИВАЕМ UID...');
        try {
          packageUid = await getDellinCrateWithBubbleUid();
          console.log('🔍 ✅ ПОЛУЧЕН packageUid из API:', packageUid);
          
          // ВРЕМЕННО: если не получили UID из API, используем тестовый
          if (!packageUid) {
            packageUid = '0xa6a7bd2bf950e67f4b2cf7cc3a97c111';
            console.log('🔍 🧪 ИСПОЛЬЗУЕМ ТЕСТОВЫЙ UID:', packageUid);
          }
          
          console.log('🔍 ✅ ФИНАЛЬНЫЙ packageUid:', packageUid);
          console.log('🔍 ✅ typeof packageUid:', typeof packageUid);
          console.log('🔍 ✅ packageUid truthy:', !!packageUid);
        } catch (error) {
          console.log('🔍 ❌ ОШИБКА при получении packageUid:', error);
          // ВРЕМЕННО: используем тестовый UID при ошибке
          packageUid = '0xa6a7bd2bf950e67f4b2cf7cc3a97c111';
          console.log('🔍 🧪 ИСПОЛЬЗУЕМ ТЕСТОВЫЙ UID после ошибки:', packageUid);
        }
      } else {
        console.log('🔍 ❌ Упаковка не требуется, пропускаем получение UID');
      }
      console.log('=== КОНЕЦ ОТЛАДКИ УПАКОВКИ ===');

      // Формируем дату отправления на завтра
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const produceDate = tomorrow.toISOString().split('T')[0];

      // Отладка перед формированием запроса
      console.log('=== ОТЛАДКА ФОРМИРОВАНИЯ ЗАПРОСА ===');
      console.log('🔍 form.needPackaging =', form.needPackaging, '(тип:', typeof form.needPackaging, ')');
      console.log('🔍 packageUid =', packageUid, '(тип:', typeof packageUid, ')');
      console.log('🔍 packageUid truthy =', !!packageUid);
      console.log('🔍 Условие (form.needPackaging && packageUid) =', form.needPackaging && packageUid);
      
      if (form.needPackaging && packageUid) {
        console.log('✅ PACKAGES БУДЕТ ДОБАВЛЕН В ЗАПРОС!');
      } else {
        console.log('❌ PACKAGES НЕ БУДЕТ ДОБАВЛЕН:');
        if (!form.needPackaging) console.log('  - form.needPackaging = false');
        if (!packageUid) console.log('  - packageUid отсутствует/null');
      }

      // Формируем корректную структуру запроса согласно инструкции
      const requestData = {
        appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
        sessionID: sessionID,
        delivery: {
          deliveryType: {
            type: 'auto'  // Всегда "auto" по умолчанию
          },
          derival: {
            produceDate: produceDate,  // Обязательная дата отправления
            variant: form.fromAddressDelivery ? 'address' : 'terminal',
            ...(form.fromAddressDelivery ? {
              address: {
                search: form.fromAddress || form.fromCity
              }
            } : (fromTerminalId ? {
              terminalID: fromTerminalId
            } : {
              address: {
                search: form.fromCity
              }
            })),
            time: {
              worktimeStart: '10:00',
              worktimeEnd: '18:00',
              breakStart: '13:00',
              breakEnd: '14:00',
              exactTime: false
            }
            // handling в derival всегда пропускается согласно инструкции
          },
          arrival: {
            variant: form.toAddressDelivery ? 'address' : 'terminal',
            ...(form.toAddressDelivery ? {
              address: {
                search: form.toAddress || form.toCity
              }
            } : (toTerminalId ? {
              terminalID: toTerminalId
            } : {
              address: {
                search: form.toCity
              }
            })),
            time: {
              worktimeStart: '10:00',
              worktimeEnd: '18:00',
              breakStart: '13:00',
              breakEnd: '14:00',
              exactTime: false
            },
            // handling в arrival заполняется только если требуется подъем
            ...(form.needCarry ? {
              handling: {
                freightLift: form.hasFreightLift, // true только если есть галочка "наличие грузового лифта"
                toFloor: form.floor, // этаж из формы
                carry: 0
              }
            } : {})
          },
          ...(form.needPackaging && packageUid ? {
            packages: [{
              uid: packageUid,  // UID упаковки crate_with_bubble из справочника
              count: 1  // По умолчанию 1
            }]
          } : {})
        },
        cargo: {
          quantity: form.cargos.length,
          length: maxLength,
          width: maxWidth,
          height: maxHeight,
          weight: totalWeight,
          totalVolume: totalVolume,
          totalWeight: totalWeight,
          oversizedWeight: 0,
          oversizedVolume: 0,
          hazardClass: 0,  // Всегда 0 если нет опасных грузов
          ...(form.needInsurance && form.declaredValue > 0 ? {
            insurance: {
              statedValue: form.declaredValue,
              term: true  // Всегда true при наличии страхования
            }
          } : {})
        },
        payment: {
          type: 'noncash',  // Всегда "noncash"
          paymentCitySearch: {
            search: form.fromCity  // Город оплаты
          }
        }
      };

      console.log('🚀 ИТОГОВЫЙ ЗАПРОС К ДЛ:', JSON.stringify(requestData, null, 2));
      
      // Специальная проверка блока packages
      if (requestData.delivery.packages) {
        console.log('✅ PACKAGES НАЙДЕН В ЗАПРОСЕ:', requestData.delivery.packages);
      } else {
        console.log('❌ PACKAGES НЕ НАЙДЕН В ЗАПРОСЕ');
        console.log('   form.needPackaging =', form.needPackaging);
        console.log('   packageUid =', packageUid);
        console.log('   Условие:', form.needPackaging && packageUid);
      }

      // Попытки запроса с повторной авторизацией при ошибках
      let response: any = null;
      let data: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 ДЛ: попытка запроса ${attempt}/${maxRetries}`);
        
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        try {
          data = await response.json();
        } catch (parseError) {
          console.error('❌ Ошибка парсинга JSON ответа ДЛ:', parseError);
          throw new Error(`Ошибка парсинга ответа API: ${parseError instanceof Error ? parseError.message : 'неизвестная ошибка'}`);
        }
        
        console.log('🚀 ОТВЕТ ДЛ response.ok:', response.ok);
        console.log('🚀 ОТВЕТ ДЛ status:', response.status);
        console.log('🚀 ОТВЕТ ДЛ data:', data);
        
        // Проверяем различные типы ошибок авторизации
        const isAuthError = response.status === 401 || 
                           response.status === 403 ||
                           (response.status === 400 && data?.errors?.some((err: any) => 
                             err.detail?.toLowerCase()?.includes('session') ||
                             err.detail?.toLowerCase()?.includes('auth') ||
                             err.detail?.toLowerCase()?.includes('invalid')
                           ));

        if (isAuthError && attempt < maxRetries) {
          console.log('🔄 ДЛ: обнаружена ошибка авторизации, выполняем повторную авторизацию...');
          const newSessionId = await getDellinSessionId();
          if (newSessionId) {
            console.log('✅ ДЛ: получен новый SessionID, обновляем запрос...');
            // Обновляем sessionID в запросе
            requestData.sessionID = newSessionId;
            sessionID = newSessionId;
            continue; // Пробуем еще раз с новой авторизацией
          } else {
            console.error('❌ ДЛ: не удалось получить новый SessionID');
            break;
          }
        }
        
        if (response.status === 400 && data?.errors) {
          console.log('=== АНАЛИЗ ОШИБКИ 400 ===');
          console.log('🔍 Ошибки:', data.errors);
          data.errors.forEach((error: any, index: number) => {
            console.log(`🔍 Ошибка ${index + 1}:`, error);
            console.log(`   - Поле: ${error.field || 'не указано'}`);
            console.log(`   - Сообщение: ${error.detail || error.message || 'не указано'}`);
          });
          console.log('=== КОНЕЦ АНАЛИЗА ОШИБКИ 400 ===');
        }

        // Если запрос успешный или не связан с авторизацией, продолжаем обработку
        break;
      }

      // Проверяем на ошибки ПЕРЕД анализом данных
      if (!response.ok || !data.data) {
        console.log('❌ Ошибочный ответ API - пропускаем анализ данных');
        const errorMessage = data.metadata?.detail || 
                           data.metadata?.message || 
                           data.errors?.[0]?.detail || 
                           (data.metadata?.status !== 200 ? `HTTP ${data.metadata?.status}` : '') ||
                           `HTTP ${response.status} - ${response.statusText}` ||
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
      
      // ДЕТАЛЬНЫЙ АНАЛИЗ СТРУКТУРЫ СТРАХОВКИ (только для успешного ответа)
      console.log('=== ПОЛНЫЙ АНАЛИЗ СТРУКТУРЫ СТРАХОВКИ ===');
      console.log('🔍 ПРОВЕРКА СТРУКТУРЫ ДАННЫХ:');
      console.log('🔍 data:', data ? 'существует' : 'undefined/null');
      console.log('🔍 typeof data:', typeof data);
      console.log('🔍 data.data:', data?.data ? 'существует' : 'undefined/null');
      console.log('🔍 typeof data.data:', typeof data?.data);
      
      // Безопасная проверка свойств data.data
      if (data?.data) {
        console.log('🔍 Проверяем свойства data.data:');
        console.log('🔍 data.data.derival:', typeof data.data.derival, data.data.derival);
        console.log('🔍 data.data.arrival:', typeof data.data.arrival, data.data.arrival);
        console.log('🔍 data.data.intercity:', typeof data.data.intercity, data.data.intercity);
      }
      
      if (!data) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: data undefined/null');
        return {
          company: 'Деловые Линии',
          price: 0,
          days: 0,
          error: 'Ошибка обработки ответа API: данные не получены',
          apiUrl,
          requestData,
          responseData: null
        };
      }
      
      try {
        console.log('🔍 ПОЛНАЯ СТРУКТУРА data.data:', JSON.stringify(data.data, null, 2));
      } catch (jsonError) {
        console.error('❌ Ошибка JSON.stringify для data.data:', jsonError);
        console.log('🔍 data.data (toString):', data.data?.toString?.() || 'Не удалось преобразовать');
      }
      
      // Поиск всех полей связанных со страховкой
      console.log('💳 ПОИСК КОМПОНЕНТОВ СТРАХОВКИ:');
      console.log('💳 data.data.insurance:', data.data?.insurance);
      console.log('💳 data.data.cargoInsurance:', data.data?.cargoInsurance);
      console.log('💳 data.data.termInsurance:', data.data?.termInsurance);
      console.log('💳 data.data.insuranceDetails:', data.data?.insuranceDetails);
      console.log('💳 data.data.services:', data.data?.services);
      console.log('💳 data.data.additionalServices:', data.data?.additionalServices);
      
      // Поиск страховки в других разделах
      try {
        console.log('💳 Проверяем derival...');
        if (data.data?.derival) {
          console.log('💳 derival найден, проверяем insurance...');
          console.log('💳 СТРАХОВКА В ЗАБОЕ data.data.derival.insurance:', data.data.derival?.insurance);
        } else {
          console.log('💳 derival не найден или null');
        }
        
        console.log('💳 Проверяем arrival...');
        if (data.data?.arrival) {
          console.log('💳 arrival найден, проверяем insurance...');
          console.log('💳 СТРАХОВКА В ДОСТАВКЕ data.data.arrival.insurance:', data.data.arrival?.insurance);
        } else {
          console.log('💳 arrival не найден или null');
        }
        
        console.log('💳 Проверяем intercity...');
        if (data.data?.intercity) {
          console.log('💳 intercity найден, проверяем insurance...');
          console.log('💳 СТРАХОВКА В ПЕРЕВОЗКЕ data.data.intercity.insurance:', data.data.intercity?.insurance);
        } else {
          console.log('💳 intercity не найден или null');
        }
      } catch (error) {
        console.error('❌ ОШИБКА при проверке секций страховки:', error);
        console.error('❌ Стек ошибки:', error instanceof Error ? error.stack : 'Нет стека');
      }
      
      // Рекурсивный поиск всех полей содержащих "insurance"
      const findInsuranceFields = (obj: any, path = '') => {
        if (typeof obj !== 'object' || obj === null || obj === undefined) return;
        
        try {
          Object.keys(obj).forEach(key => {
            const fullPath = path ? `${path}.${key}` : key;
            if (key.toLowerCase().includes('insurance') || key.toLowerCase().includes('insur')) {
              console.log(`💳 НАЙДЕНО ПОЛЕ СТРАХОВКИ [${fullPath}]:`, obj[key]);
            }
            if (typeof obj[key] === 'object' && obj[key] !== null && obj[key] !== undefined) {
              findInsuranceFields(obj[key], fullPath);
            }
          });
        } catch (error) {
          console.error(`💳 Ошибка в findInsuranceFields для пути ${path}:`, error);
        }
      };
      
      console.log('💳 РЕКУРСИВНЫЙ ПОИСК ПОЛЕЙ СТРАХОВКИ:');
      try {
        if (data && data.data) {
          findInsuranceFields(data.data, 'data.data');
        } else {
          console.log('💳 Пропуск рекурсивного поиска: data.data недоступен');
        }
      } catch (error) {
        console.error('❌ ОШИБКА в рекурсивном поиске:', error);
        console.error('❌ Стек ошибки:', error instanceof Error ? error.stack : 'Нет стека');
      }
      console.log('=== КОНЕЦ АНАЛИЗА СТРАХОВКИ ===');
      
      // Специально проверяем наличие packages в ответе
      console.log('=== ПОИСК PACKAGES В ОТВЕТЕ ===');
      console.log('📦 data.data =', data.data);
      console.log('📦 data.data.packages =', data.data?.packages);
      console.log('📦 Тип data.data.packages:', typeof data.data?.packages);
      if (data.data?.packages) {
        console.log('✅ PACKAGES НАЙДЕН В ОТВЕТЕ!');
        try {
          console.log('📦 Содержимое packages:', JSON.stringify(data.data.packages, null, 2));
        } catch (jsonError) {
          console.error('❌ Ошибка JSON.stringify для packages:', jsonError);
          console.log('📦 packages (toString):', data.data.packages?.toString?.() || 'Не удалось преобразовать');
        }
      } else {
        console.log('❌ PACKAGES НЕ НАЙДЕН В ОТВЕТЕ');
      }
      console.log('=== КОНЕЦ ПОИСКА PACKAGES ===');

      if (response.ok && data.data && data.metadata?.status === 200) {
        let totalPrice = data.data.price || 0;
        console.log('💰 РАСЧЕТ ИТОГОВОЙ СТОИМОСТИ:');
        console.log('💰 Базовая стоимость data.data.price (УЖЕ ВКЛЮЧАЕТ ВСЕ):', totalPrice);
        
        // СТРАХОВКА УЖЕ ВКЛЮЧЕНА в data.data.price - НЕ добавляем повторно
        if (data.data.insurance) {
          console.log('💰 Страховка data.data.insurance (УЖЕ включена в базовую стоимость):', data.data.insurance);
          console.log('💰 НЕ добавляем страховку повторно');
        } else {
          console.log('💰 Страховка отсутствует в ответе');
        }
        
        // УПАКОВКА УЖЕ ВКЛЮЧЕНА в data.data.price - НЕ добавляем повторно
        console.log('💰 ИНФОРМАЦИЯ ОБ УПАКОВКЕ (УЖЕ ВКЛЮЧЕНА В ОСНОВНУЮ СТОИМОСТЬ):');
        console.log('💰 data.data.packages =', data.data.packages);
        console.log('💰 form.needPackaging =', form.needPackaging);
        
        if (data.data.packages && form.needPackaging) {
          console.log('💰 ✅ УПАКОВКА ПРИСУТСТВУЕТ В ОТВЕТЕ (цена уже включена в data.data.price)');
          console.log('💰 Тип packages:', Array.isArray(data.data.packages) ? 'Array' : 'Object');
          
          if (Array.isArray(data.data.packages)) {
            data.data.packages.forEach((pkg: any, index: number) => {
              console.log(`💰 Package [${index}] (включена в основную стоимость):`, pkg);
            });
          } else {
            Object.entries(data.data.packages).forEach(([key, pkg]: [string, any]) => {
              console.log(`💰 Package [${key}] (включена в основную стоимость):`, pkg);
            });
          }
        } else {
          console.log('💰 ❌ Упаковка не запрашивалась');
        }

        // Вычисляем срок доставки как разность между датами pickup и arrivalToOspReceiver
        let deliveryDays = 0;
        try {
          console.log('=== ПОИСК ДАТ В ОТВЕТЕ ===');
          
          // Проверяем все возможные места где могут быть даты
          console.log('Проверяем data.data?.pickup:', data.data?.pickup);
          console.log('Проверяем data.pickup:', data.pickup);
          console.log('Проверяем data?.pickup:', data?.pickup);
          console.log('Проверяем data.data?.arrivalToOspReceiver:', data.data?.arrivalToOspReceiver);
          console.log('Проверяем data.arrivalToOspReceiver:', data.arrivalToOspReceiver);
          console.log('Проверяем data?.arrivalToOspReceiver:', data?.arrivalToOspReceiver);
          
          // Более широкий поиск во всей структуре data
          const findDateInObject = (obj: any, fieldName: string): string | null => {
            if (!obj || typeof obj !== 'object') return null;
            
            for (const [key, value] of Object.entries(obj)) {
              if (key === fieldName && typeof value === 'string') {
                return value;
              }
              if (typeof value === 'object' && value !== null) {
                const found = findDateInObject(value, fieldName);
                if (found) return found;
              }
            }
            return null;
          };
          
          const pickup = findDateInObject(data, 'pickup');
          const arrivalToOspReceiver = findDateInObject(data, 'arrivalToOspReceiver');
          
          console.log('НАЙДЕННЫЕ ДАТЫ:');
          console.log('pickup:', pickup);
          console.log('arrivalToOspReceiver:', arrivalToOspReceiver);
          
          if (pickup && arrivalToOspReceiver) {
            // Парсим даты (формат может быть "2025-09-27" или "2025-09-27 10:00:00")
            const pickupDate = new Date(pickup);
            const arrivalDate = new Date(arrivalToOspReceiver);
            
            console.log('Парсированная дата pickup:', pickupDate);
            console.log('Парсированная дата arrival:', arrivalDate);
            
            // Проверяем, что даты валидны
            if (!isNaN(pickupDate.getTime()) && !isNaN(arrivalDate.getTime())) {
              // Вычисляем разность в днях
              const timeDiff = arrivalDate.getTime() - pickupDate.getTime();
              deliveryDays = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24))); // Минимум 1 день
              
              console.log('Разность в миллисекундах:', timeDiff);
              console.log('Деловые Линии - ВЫЧИСЛЕН срок доставки:', deliveryDays, 'дней');
            } else {
              console.error('Деловые Линии - Невалидные даты после парсинга');
              console.error('pickup Date object:', pickupDate);
              console.error('arrival Date object:', arrivalDate);
            }
          } else {
            console.warn('Деловые Линии - Не найдены даты pickup или arrivalToOspReceiver');
            console.log('pickup найден:', !!pickup, pickup);
            console.log('arrivalToOspReceiver найден:', !!arrivalToOspReceiver, arrivalToOspReceiver);
          }
        } catch (error) {
          console.error('Деловые Линии - Ошибка вычисления срока доставки:', error);
        }

        console.log('💰 ФИНАЛЬНАЯ ИТОГОВАЯ СТОИМОСТЬ:', Math.round(totalPrice));
        
        return {
          company: 'Деловые Линии',
          price: Math.round(totalPrice),
          days: deliveryDays || 0,
          details: data.data || {},
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



  // Получение тарифной зоны и склада ПЭК по адресу через прокси
  const getPekZoneByAddress = async (address: string) => {
    try {
      console.log(`🔍 ПЭК: поиск зоны для адреса "${address}"`);
      
      const response = await fetch('/api/pek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'findzonebyaddress',
          address: address
        })
      });

      console.log(`📡 ПЭК API статус: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Невозможно парсить ответ' };
        }
        
        console.error(`❌ ПЭК API ошибка ${response.status}:`, errorData);
        
        // Детализация ошибок
        if (response.status === 401) {
          console.error('❌ ПЭК: Ошибка авторизации - неверный токен');
        } else if (response.status === 404) {
          console.error('❌ ПЭК: Метод API не найден');
        } else if (response.status === 400) {
          console.error('❌ ПЭК: Некорректные параметры запроса');
        } else if (response.status >= 500) {
          console.error('❌ ПЭК: Ошибка сервера ПЭК');
        }
        
        console.log(`🔄 ПЭК: переход к фоллбэк методу для "${address}"`);
        return getPekZoneFallback(address);
      }

      const data = await response.json();
      console.log(`✅ ПЭК зона найдена:`, data);
      
      if (data.zoneId && data.mainWarehouseId) {
        return {
          zoneId: data.zoneId,
          zoneName: data.zoneName,
          branchUID: data.branchUID,
          branchCode: data.branchCode,
          branchTitle: data.branchTitle,
          mainWarehouseId: data.mainWarehouseId,
          warehousePoint: data.warehousePoint,
          geoData: data.GeoData,
          precision: data.GeoData?.precision
        };
      }
      
      console.warn(`⚠️ ПЭК: некорректный ответ:`, data);
      return getPekZoneFallback(address);
      
    } catch (error) {
      console.error('❌ ПЭК: критическая ошибка поиска зоны:', error);
      return getPekZoneFallback(address);
    }
  };

  // Фоллбэк метод для определения зоны ПЭК
  const getPekZoneFallback = (address: string) => {
    console.log(`🔄 ПЭК фоллбэк: анализ адреса "${address}"`);
    
    const addressLower = address.toLowerCase();
    
    // Определяем основные города и их данные
    const cityMappings: { [key: string]: any } = {
      'москва': {
        zoneId: 'moscow-zone-001',
        zoneName: 'Москва',
        branchUID: 'moscow-branch-001',
        branchCode: 'МСК',
        branchTitle: 'Москва',
        mainWarehouseId: 'dc6c746d-812d-11e4-bbfc-001999d8b3c5',
        warehousePoint: {
          latitude: 55.755826,
          longitude: 37.6173
        }
      },
      'санкт-петербург': {
        zoneId: 'spb-zone-001',
        zoneName: 'Санкт-Петербург',
        branchUID: 'spb-branch-001',
        branchCode: 'СПБ',
        branchTitle: 'Санкт-Петербург',
        mainWarehouseId: 'b436c978-086d-11e6-b6ca-00155d668909',
        warehousePoint: {
          latitude: 59.9311,
          longitude: 30.3609
        }
      },
      'екатеринбург': {
        zoneId: 'ekb-zone-001',
        zoneName: 'Екатеринбург',
        branchUID: 'ekb-branch-001',
        branchCode: 'ЕКБ',
        branchTitle: 'Екатеринбург',
        mainWarehouseId: 'f8d9c8e3-8e2d-11e4-bbfc-001999d8b3c5',
        warehousePoint: {
          latitude: 56.8431,
          longitude: 60.6454
        }
      }
    };
    
    for (const [city, data] of Object.entries(cityMappings)) {
      if (addressLower.includes(city) || addressLower.includes(city.replace('-', ' '))) {
        console.log(`✅ ПЭК фоллбэк: найден город ${city}`);
        return {
          ...data,
          geoData: {
            precision: 'fallback',
            kind: 'locality'
          },
          precision: 'fallback'
        };
      }
    }
    
    console.warn(`❌ ПЭК фоллбэк: город не найден в "${address}"`);
    return null;
  };

  // Получение ближайших отделений ПЭК
  const getPekNearestDepartments = async (address: string, coordinates?: { latitude: string, longitude: string }) => {
    try {
      console.log(`🏢 ПЭК: поиск ближайших отделений для "${address}"`);
      
      const requestBody: any = {
        departmentOperation: 3, // выдача грузов
        type: 3, // авто-транспорт
        searchRadius: 50, // км
        limit: 5
      };
      
      // ПЭК API требует и адрес, и координаты одновременно
      requestBody.address = address;
      
      if (coordinates) {
        requestBody.coordinates = coordinates;
        console.log(`📍 ПЭК: поиск по адресу "${address}" и координатам`, coordinates);
      } else {
        console.log(`📍 ПЭК: поиск только по адресу "${address}"`);
      }
      
      const response = await fetch('/api/pek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'nearestdepartments',
          ...requestBody
        })
      });

      console.log(`📡 ПЭК отделения API статус: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ПЭК отделения API ошибка: ${response.status} ${response.statusText}`);
        console.error(`❌ Ответ:`, errorText.substring(0, 500));
        return null;
      }

      const data = await response.json();
      console.log(`✅ ПЭК отделения найдены:`, data);
      
      // Возвращаем первое бесплатное отделение с наивысшим приоритетом
      if (data.freeDepartments && data.freeDepartments.length > 0) {
        const bestDepartment = data.freeDepartments.sort((a: any, b: any) => b.priority - a.priority)[0];
        console.log(`✅ ПЭК: выбрано отделение`, bestDepartment.divisionName);
        return {
          warehouseId: bestDepartment.warehouseId,
          branchId: bestDepartment.branchId,
          branchName: bestDepartment.branchName,
          divisionName: bestDepartment.divisionName,
          address: bestDepartment.address,
          coordinates: bestDepartment.coordinates,
          phone: bestDepartment.phone,
          email: bestDepartment.email
        };
      }
      
      console.warn(`❌ ПЭК: отделения не найдены для "${address}"`);
      return null;
    } catch (error) {
      console.error('❌ ПЭК: ошибка поиска отделений:', error);
      return null;
    }
  };

  // Получение координат через Яндекс.Карты (резервный метод для ПЭК)
  const getYandexCoordinates = async (address: string): Promise<{ latitude: string, longitude: string } | null> => {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=YOUR_API_KEY&geocode=${encodedAddress}&format=json`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const coords = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos?.split(' ');
      
      if (coords && coords.length === 2) {
        return {
          longitude: coords[0],
          latitude: coords[1]
        };
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка получения координат Яндекс:', error);
      return null;
    }
  };

  // Расчет для ПЭК через официальный API v1/calculateprice/
  const calculatePEK = async (): Promise<CalculationResult> => {
    const apiUrl = 'https://kabinet.pecom.ru/api/v1/calculateprice/';
    
    // Валидация координат
    const validateCoordinates = (coords: any) => {
      console.log('🧪 Проверка координат:', coords);
      
      if (!coords) {
        console.log('⚠️ Координаты отсутствуют');
        return null;
      }
      
      if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        console.warn(`⚠️ Координаты не являются числами:`, { 
          lat: coords.latitude, 
          lng: coords.longitude,
          latType: typeof coords.latitude,
          lngType: typeof coords.longitude
        });
        return null;
      }
      
      const lat = Number(coords.latitude);
      const lng = Number(coords.longitude);
      
      console.log(`📍 Преобразованные координаты: lat=${lat}, lng=${lng}`);
      
      // Проверяем диапазоны
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || isNaN(lat) || isNaN(lng)) {
        console.warn(`⚠️ Координаты вне допустимого диапазона:`, { 
          lat, lng, 
          latValid: lat >= -90 && lat <= 90,
          lngValid: lng >= -180 && lng <= 180,
          latIsNaN: isNaN(lat),
          lngIsNaN: isNaN(lng)
        });
        return null;
      }
      
      console.log('✅ Координаты валидны:', { latitude: lat, longitude: lng });
      return { latitude: lat, longitude: lng };
    };
    
    try {
      // Получаем информацию о зонах и складах по адресам
      console.log(`🚀 ПЭК: начинаем расчет`);
      console.log(`📍 От: ${form.fromAddress || form.fromCity}`);
      console.log(`📍 До: ${form.toAddress || form.toCity}`);
      
      const senderZone = await getPekZoneByAddress(form.fromAddress || `г ${form.fromCity}`);
      const receiverZone = await getPekZoneByAddress(form.toAddress || `г ${form.toCity}`);
      
      console.log(`🔍 ПЭК зоны:`);
      console.log(`📍 Отправитель:`, senderZone ? `${senderZone.branchTitle} (${senderZone.mainWarehouseId})` : 'НЕ НАЙДЕНА');
      console.log(`📍 Получатель:`, receiverZone ? `${receiverZone.branchTitle} (${receiverZone.mainWarehouseId})` : 'НЕ НАЙДЕНА');
      
      if (!senderZone || !receiverZone) {
        // Детальная диагностика
        const debugInfo = {
          senderAddress: form.fromAddress || form.fromCity,
          receiverAddress: form.toAddress || form.toCity,
          senderZoneFound: !!senderZone,
          receiverZoneFound: !!receiverZone,
          apiTested: true
        };
        
        console.error(`❌ ПЭК: зоны не найдены`, debugInfo);
        
        return {
          company: 'ПЭК',
          price: 0,
          days: 0,
          error: `Зона ПЭК не обслуживается. Проверьте адреса: ${!senderZone ? (form.fromAddress || form.fromCity) : ''} ${!receiverZone ? (form.toAddress || form.toCity) : ''}`.trim(),
          apiUrl,
          requestData: debugInfo,
          responseData: { senderZone, receiverZone }
        };
      }

      // Получаем ближайшие отделения если нужна адресная доставка
      let senderWarehouseId = senderZone.mainWarehouseId;
      let receiverWarehouseId = receiverZone.mainWarehouseId;
      
      if (form.fromAddressDelivery && senderZone.warehousePoint) {
        const validSenderCoords = validateCoordinates(senderZone.warehousePoint);
        if (validSenderCoords) {
          try {
            const senderDepartment = await getPekNearestDepartments(
              form.fromAddress || form.fromCity,
              {
                latitude: validSenderCoords.latitude.toString(),
                longitude: validSenderCoords.longitude.toString()
              }
            );
            if (senderDepartment) {
              senderWarehouseId = senderDepartment.warehouseId;
              console.log('✅ Найден ближайший склад отправителя:', senderDepartment.warehouseId);
            }
          } catch (error) {
            console.warn('⚠️ Ошибка поиска ближайших отделений отправителя, используем основной склад:', error);
          }
        } else {
          console.warn('⚠️ Некорректные координаты отправителя, используем основной склад');
        }
      }
      
      if (form.toAddressDelivery && receiverZone.warehousePoint) {
        const validReceiverCoords = validateCoordinates(receiverZone.warehousePoint);
        if (validReceiverCoords) {
          try {
            const receiverDepartment = await getPekNearestDepartments(
              form.toAddress || form.toCity,
              {
                latitude: validReceiverCoords.latitude.toString(),
                longitude: validReceiverCoords.longitude.toString()
              }
            );
            if (receiverDepartment) {
              receiverWarehouseId = receiverDepartment.warehouseId;
              console.log('✅ Найден ближайший склад получателя:', receiverDepartment.warehouseId);
            }
          } catch (error) {
            console.warn('⚠️ Ошибка поиска ближайших отделений получателя, используем основной склад:', error);
          }
        } else {
          console.warn('⚠️ Некорректные координаты получателя, используем основной склад');
        }
      }

      // Функция для получения даты N дней от сегодня
      const getDateForCalculation = (daysFromToday: number): string => {
        const date = new Date();
        date.setDate(date.getDate() + daysFromToday);
        return date.toISOString().slice(0, 19); // 2025-09-28T14:00:00
      };

      // Начинаем с завтрашнего дня
      let currentDayOffset = 1;
      let plannedDateTime = getDateForCalculation(currentDayOffset);

      // Формируем массив грузов (без координат)
      const cargos = form.cargos.map(cargo => {
        const cargoData = {
          length: cargo.length / 100, // переводим см в метры
          width: cargo.width / 100,
          height: cargo.height / 100,
          volume: (cargo.length * cargo.width * cargo.height) / 1000000, // м3
          weight: cargo.weight,
          isHP: form.needPackaging, // защитная упаковка
          sealingPositionsCount: 0
        };
        
        console.log('📦 Груз для ПЭК:', cargoData);
        return cargoData;
      });

      // Переменная для хранения финального запроса (нужна для возврата в результате)
      let finalRequestData: any = null;
      
      // Функция для попытки расчета с конкретной датой
      const tryCalculateWithDate = async (plannedDateTime: string): Promise<any> => {
        // Формируем запрос к API ПЭК согласно документации
        const requestData: any = {
          currencyCode: "643", // рубли
          types: [3], // только авто перевозка (обязательно массив)
          senderWarehouseId,
          receiverWarehouseId,
          isOpenCarSender: false,
          isOpenCarReceiver: false,
          isHyperMarket: false,
          plannedDateTime,
          isInsurance: form.needInsurance && form.declaredValue > 0,
          isInsurancePrice: form.needInsurance ? form.declaredValue : 0,
          isPickUp: form.fromAddressDelivery,
          isDelivery: form.toAddressDelivery,
          needReturnDocuments: false,
          needArrangeTransportationDocuments: false,
          senderDistanceType: 0,
          receiverDistanceType: 0,
          cargos // массив грузов
        };
        
        console.log('📋 ПЭК: структура requestData:', JSON.stringify(requestData, null, 2));

        // Добавляем услуги ПРР если нужно
        if (form.needCarry) {
          requestData.pickupServices = {
            isLoading: true,
            floor: Math.max(0, form.floor - 1), // ПЭК считает с 0
            carryingDistance: 0,
            isElevator: form.hasFreightLift
          };
          requestData.deliveryServices = {
            isLoading: true,
            floor: Math.max(0, form.floor - 1),
            carryingDistance: 0,
            isElevator: form.hasFreightLift
          };
        }

        // Добавляем блоки pickup/delivery согласно документации ПЭК
        if (form.fromAddressDelivery) {
          console.log('📍 ПЭК: добавляем блок pickup для забора');
          requestData.pickup = {
            address: form.fromAddress || `Россия, ${form.fromCity}`
            // coordinates можно добавить позже для точности
          };
        }
        
        if (form.toAddressDelivery) {
          console.log('📍 ПЭК: добавляем блок delivery для доставки');
          requestData.delivery = {
            address: form.toAddress || `Россия, ${form.toCity}`
            // coordinates можно добавить позже для точности
          };
        }

        // Валидация обязательных полей согласно документации
        const requiredFields = ['types', 'senderWarehouseId', 'receiverWarehouseId', 'plannedDateTime', 'cargos'];
        const missingFields = requiredFields.filter(field => !requestData[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`ПЭК: отсутствуют обязательные поля: ${missingFields.join(', ')}`);
        }
        
        if (!Array.isArray(requestData.types) || requestData.types.length === 0) {
          throw new Error('ПЭК: поле types должно быть непустым массивом');
        }
        
        if (!Array.isArray(requestData.cargos) || requestData.cargos.length === 0) {
          throw new Error('ПЭК: поле cargos должно быть непустым массивом');
        }
        
        console.log('✅ ПЭК: валидация обязательных полей пройдена');

        // Сохраняем финальный запрос в переменной области видимости функции
        finalRequestData = {
          method: 'calculateprice',
          ...requestData
        };
        
        console.log('🚀 ПЭК API окончательный запрос:', JSON.stringify(finalRequestData, null, 2));
        console.log('🌐 ПЭК API URL:', apiUrl);
        console.log('📋 ПЭК: количество типов тарифов:', requestData.types.length);
        console.log('📋 ПЭК: количество грузов:', requestData.cargos.length);
      
      // Проверяем координаты перед отправкой
      if (finalRequestData.pickup?.coordinates) {
        console.log('📍 Координаты pickup:', finalRequestData.pickup.coordinates);
      }
      if (finalRequestData.delivery?.coordinates) {
        console.log('📍 Координаты delivery:', finalRequestData.delivery.coordinates);
      }

      const response = await fetch('/api/pek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalRequestData)
      });

      console.log(`📡 ПЭК API расчет статус: ${response.status} ${response.statusText}`);
      console.log(`📡 ПЭК API URL: ${response.url}`);
      
      const responseText = await response.text();
      console.log(`📡 ПЭК API сырой ответ:`, responseText.substring(0, 1000));
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🚀 ПЭК API ответ:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('❌ ПЭК: ошибка парсинга JSON:', parseError);
        throw new Error(`Некорректный ответ API: ${responseText.substring(0, 200)}`);
      }

        return { response, data };
      };

      // Добавляем диагностику перед началом расчета
      console.log('🔧 ПЭК: готовим данные для расчета...');
      console.log('📍 senderWarehouseId:', senderWarehouseId);
      console.log('📍 receiverWarehouseId:', receiverWarehouseId);
      console.log('📅 Начальная дата:', plannedDateTime);
      console.log('📦 Количество грузов:', cargos.length);
      console.log('🔧 form.fromAddressDelivery:', form.fromAddressDelivery);
      console.log('🔧 form.toAddressDelivery:', form.toAddressDelivery);
      
      // Цикл попыток с разными датами (максимум 7 дней)
      const maxRetries = 7;
      let lastError: Error | null = null;
      
      console.log('🚀 ПЭК: запускаем цикл расчета...');
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`📅 ПЭК: попытка ${attempt + 1}/${maxRetries}, дата: ${plannedDateTime}`);
          
          const { response, data } = await tryCalculateWithDate(plannedDateTime);
          
          if (response.ok && !data.hasError && data.transfers && data.transfers.length > 0) {
            const transfer = data.transfers[0]; // берем первый тариф (авто)
            
            if (!transfer.hasError) {
          // Обрабатываем детальную структуру услуг
          const services: { name: string; description: string; price: number }[] = [];
          let totalCalculated = 0;

          const processServices = (servicesList: any[], parentName = '') => {
            servicesList.forEach(service => {
              const serviceName = parentName ? `${parentName} - ${service.info}` : service.info;
              const serviceCost = parseFloat(service.cost) || 0;
              
              if (serviceCost > 0) {
                services.push({
                  name: serviceName,
                  description: service.serviceType || '',
                  price: serviceCost
                });
                totalCalculated += serviceCost;
              }

              // Обрабатываем вложенные услуги
              if (service.services && Array.isArray(service.services)) {
                processServices(service.services, serviceName);
              }
            });
          };

          if (transfer.services) {
            processServices(transfer.services);
          }

          // Если нет детализации услуг, добавляем общую стоимость
          if (services.length === 0) {
            services.push({
              name: 'Доставка груза',
              description: `${senderZone.branchTitle} - ${receiverZone.branchTitle}`,
              price: Math.round(transfer.costTotal)
            });
          }

          return {
            company: 'ПЭК',
            price: Math.round(transfer.costTotal),
            days: transfer.estDeliveryTime || 3,
            details: {
              note: `Доставка ${senderZone.branchTitle} - ${receiverZone.branchTitle} (авто)`,
              services,
              senderZone: {
                title: senderZone.branchTitle,
                zone: senderZone.zoneName,
                warehouseId: senderWarehouseId
              },
              receiverZone: {
                title: receiverZone.branchTitle,
                zone: receiverZone.zoneName,
                warehouseId: receiverWarehouseId
              }
            },
            requestData: finalRequestData,
            responseData: data,
            apiUrl
              };
            } else {
              // Проверяем, является ли ошибка проблемой с датой
              const errorMessage = transfer.errorMessage || 'Ошибка расчета тарифа ПЭК';
              if (errorMessage.includes('забор груза невозможен') || errorMessage.includes('выбранной даты')) {
                console.log(`📅 ПЭК: ${errorMessage}. Пробуем следующий день...`);
                lastError = new Error(errorMessage);
                // Переходим к следующему дню
                currentDayOffset++;
                plannedDateTime = getDateForCalculation(currentDayOffset);
                continue; // Пробуем следующую дату
              } else {
                throw new Error(errorMessage);
              }
            }
          } else {
            // Проверяем ошибку на уровне данных
            const errorMessage = data.errorMessage || data.message || 'Ошибка API ПЭК';
            if (errorMessage.includes('забор груза невозможен') || errorMessage.includes('выбранной даты')) {
              console.log(`📅 ПЭК: ${errorMessage}. Пробуем следующий день...`);
              lastError = new Error(errorMessage);
              // Переходим к следующему дню
              currentDayOffset++;
              plannedDateTime = getDateForCalculation(currentDayOffset);
              continue; // Пробуем следующую дату
            } else {
              throw new Error(errorMessage);
            }
          }
        } catch (error: any) {
          console.error(`❌ ПЭК: ошибка на попытке ${attempt + 1}:`, error.message);
          
          // Проверяем, является ли ошибка проблемой с датой
          if (error.message?.includes('забор груза невозможен') || error.message?.includes('выбранной даты')) {
            console.log(`📅 ПЭК: проблема с датой. Пробуем следующий день...`);
            lastError = error;
            // Переходим к следующему дню
            currentDayOffset++;
            plannedDateTime = getDateForCalculation(currentDayOffset);
            continue; // Пробуем следующую дату
          } else {
            // Другая ошибка - выбрасываем сразу
            throw error;
          }
        }
      }
      
      // Если дошли до сюда - все попытки исчерпаны
      console.error(`❌ ПЭК: все ${maxRetries} попыток исчерпаны. Последняя ошибка:`, lastError?.message);
      throw lastError || new Error('Не удалось найти доступную дату для забора груза');
      
    } catch (error: any) {
      console.error('🚨 Критическая ошибка ПЭК API:', error);
      
      // Определяем тип ошибки
      let errorDescription = 'Ошибка API ПЭК';
      
      if (error.message?.includes('Failed to fetch')) {
        errorDescription = 'API ПЭК недоступен';
      } else if (error.message?.includes('401')) {
        errorDescription = 'Ошибка авторизации ПЭК';
      } else if (error.message?.includes('400')) {
        errorDescription = 'Некорректные параметры запроса';
      } else if (error.message?.includes('timeout')) {
        errorDescription = 'Тайм-аут запроса к API';
      }
      
      console.error(`🚨 ПЭК: ${errorDescription}. Переходим к фоллбэк расчету`);
      
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );
      
      // Более точный фоллбэк расчет на основе веса и объема
      let basePrice = Math.max(
        totalWeight * 18, // 18 руб за кг
        totalVolume * 4500 // 4500 руб за м3
      );
      
      // Добавляем услуги
      const services: { name: string; description: string; price: number }[] = [];
      
      services.push({
        name: 'Транспортировка',
        description: `${form.fromCity} - ${form.toCity} (${totalWeight} кг, ${totalVolume.toFixed(3)} м³)`,
        price: Math.round(basePrice)
      });
      
      if (form.fromAddressDelivery) {
        const pickupCost = 600;
        basePrice += pickupCost;
        services.push({
          name: 'Забор груза',
          description: 'От адреса отправителя',
          price: pickupCost
        });
      }
      
      if (form.toAddressDelivery) {
        const deliveryCost = 600;
        basePrice += deliveryCost;
        services.push({
          name: 'Доставка груза',
          description: 'До адреса получателя',
          price: deliveryCost
        });
      }
      
      if (form.needInsurance && form.declaredValue > 0) {
        const insuranceCost = form.declaredValue * 0.012;
        basePrice += insuranceCost;
        services.push({
          name: 'Страхование',
          description: `На сумму ${form.declaredValue.toLocaleString()} ₽`,
          price: Math.round(insuranceCost)
        });
      }
      
      if (form.needPackaging) {
        const packagingCost = totalWeight * 25;
        basePrice += packagingCost;
        services.push({
          name: 'Защитная упаковка',
          description: 'Упаковка груза',
          price: Math.round(packagingCost)
        });
      }
      
      if (form.needCarry) {
        const carryCost = 500;
        basePrice += carryCost;
        services.push({
          name: 'Подъем на этаж',
          description: `На ${form.floor} этаж ${form.hasFreightLift ? '(с лифтом)' : '(без лифта)'}`,
          price: carryCost
        });
      }
      
      return {
        company: 'ПЭК',
        price: Math.round(basePrice),
        days: 3,
        details: {
          note: 'Примерный расчет по базовым тарифам ПЭК (API недоступен)',
          services,
          totalWeight,
          totalVolume,
          errorInfo: error.message
        },
        requestData: null,
        responseData: null,
        apiUrl,
        error: `${errorDescription}. Показан примерный расчет по базовым тарифам.`
      };
    }
  };



  // 🔧 Функции для расчета оптимальных габаритов при множественных местах
  const calculateOptimalLength = (cargos: typeof form.cargos) => {
    if (cargos.length === 1) {
      return cargos[0].length / 100; // Одно место - точные габариты
    }
    
    // Для множественных мест:
    const maxLength = Math.max(...cargos.map(c => c.length)) / 100;
    const totalLength = cargos.reduce((sum, c) => sum + c.length, 0) / 100;
    
    // Если мест много (>3), используем суммарную длину (места в ряд)
    // Иначе - максимальную (места отдельно)
    return cargos.length > 3 ? totalLength : maxLength;
  };

  const calculateOptimalWidth = (cargos: typeof form.cargos) => {
    // Для ширины логично использовать максимальную
    return Math.max(...cargos.map(c => c.width)) / 100;
  };

  const calculateOptimalHeight = (cargos: typeof form.cargos) => {
    if (cargos.length === 1) {
      return cargos[0].height / 100;
    }
    
    const maxHeight = Math.max(...cargos.map(c => c.height)) / 100;
    const totalHeight = cargos.reduce((sum, c) => sum + c.height, 0) / 100;
    
    // Если много мелких мест - можем стакировать
    const avgHeight = totalHeight / cargos.length;
    return avgHeight < 0.5 ? totalHeight : maxHeight; // 50см порог для стакирования
  };

  // 🔧 Валидация множественных грузовых мест
  const validateMultipleCargos = (cargos: typeof form.cargos) => {
    if (!cargos || cargos.length === 0) {
      throw new Error('Отсутствуют грузовые места');
    }
    
    if (cargos.length > 50) {
      throw new Error(`Слишком много грузовых мест (${cargos.length}). Максимум: 50`);
    }
    
    const totalVolume = cargos.reduce((sum, cargo) => 
      sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
    );
    
    if (totalVolume > 100) {
      console.warn('⚠️ Очень большой объем груза (>100 м³). Возможны ограничения.');
    }
    
    return true;
  };

  const calculateRailContinent = async (): Promise<CalculationResult> => {
    const apiUrl = '/api/rail-continent';
    
    try {
      // 🔧 Валидация множественных мест
      validateMultipleCargos(form.cargos);
      
      // Вычисляем основные параметры груза
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );
      
      // 🔧 ИСПРАВЛЕНО: Умные габариты для множественных мест
      const optimalLength = calculateOptimalLength(form.cargos);
      const optimalWidth = calculateOptimalWidth(form.cargos);
      const optimalHeight = calculateOptimalHeight(form.cargos);
      
      // 🔧 Детальное логирование множественных мест
      console.log('🚂 Rail Continent: Анализ множественных грузовых мест:');
      console.log(`   - Количество мест: ${form.cargos.length}`);
      console.log(`   - Общий вес: ${totalWeight} кг`);
      console.log(`   - Общий объем: ${totalVolume.toFixed(3)} м³`);
      
      form.cargos.forEach((cargo, index) => {
        console.log(`   📦 Место ${index + 1}:`);
        console.log(`     - Габариты: ${cargo.length}×${cargo.width}×${cargo.height} см`);
        console.log(`     - Вес: ${cargo.weight} кг`);
        console.log(`     - Объем: ${((cargo.length * cargo.width * cargo.height) / 1000000).toFixed(3)} м³`);
      });
      
      if (form.cargos.length > 1) {
        const maxLength = Math.max(...form.cargos.map(c => c.length));
        const maxWidth = Math.max(...form.cargos.map(c => c.width));
        const maxHeight = Math.max(...form.cargos.map(c => c.height));
        console.log(`   📐 Максимальные габариты: ${maxLength}×${maxWidth}×${maxHeight} см`);
        console.log(`   🔧 Оптимальные габариты: ${(optimalLength*100).toFixed(0)}×${(optimalWidth*100).toFixed(0)}×${(optimalHeight*100).toFixed(0)} см`);
      }
      
      // 🔧 ИСПРАВЛЕНО: Добавлен параметр quantity и улучшенные габариты
      const requestData = {
        city_sender: form.fromCity || 'Москва',
        city_receiver: form.toCity || 'Санкт-Петербург',
        weight: totalWeight,
        volume: totalVolume,
        quantity: form.cargos.length, // 🔧 ДОБАВЛЕНО: Количество мест
        length: optimalLength,        // 🔧 ИСПРАВЛЕНО: Оптимальная длина
        width: optimalWidth,          // 🔧 ИСПРАВЛЕНО: Оптимальная ширина  
        height: optimalHeight,        // 🔧 ИСПРАВЛЕНО: Оптимальная высота
        declared_cost: form.declaredValue,
        pickup: form.fromAddressDelivery ? '1' : '0',
        delivery: form.toAddressDelivery ? '1' : '0',
        packaging: form.needPackaging ? '1' : '0',
        insurance: form.needInsurance ? '1' : '0',
        tariff: 'auto' // Автоматический выбор оптимального тарифа
      };

      console.log('🚂 Rail Continent запрос:', requestData);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('🚂 Rail Continent ответ:', data);

      if (response.ok && data.result === 'success' && data.data) {
        // Выбираем автомобильный тариф как основной (самый быстрый)
        const autoTariff = data.data.auto;
        
        if (autoTariff) {
          // Собираем детали по услугам для расчета стоимости
          const services: { name: string; description: string; price: number }[] = [];
          let totalPrice = 0;
          
          console.log('🚂 Rail Continent детали тарифа:', {
            price_with_out_sale: autoTariff.price_with_out_sale,
            pricePackage: autoTariff.pricePackage,
            priceInsurance: autoTariff.priceInsurance,
            needPackaging: form.needPackaging,
            needInsurance: form.needInsurance,
            declaredValue: form.declaredValue
          });
          
          console.log('🚂 Rail Continent чекбоксы состояние:');
          console.log('   - Упаковка требуется:', form.needPackaging);
          console.log('   - Страхование требуется:', form.needInsurance);
          console.log('   - Заявленная стоимость:', form.declaredValue);
          
          // Основная стоимость доставки груза
          if (autoTariff.price_with_out_sale) {
            const deliveryPrice = parseFloat(autoTariff.price_with_out_sale);
            console.log('🚂 Доставка груза:', deliveryPrice);
            services.push({
              name: 'Доставка груза',
              description: `${autoTariff.type} (${autoTariff.rsType})`,
              price: deliveryPrice
            });
            totalPrice += deliveryPrice;
          }
          
          // Упаковка
          if (form.needPackaging && autoTariff.pricePackage) {
            const packagingPrice = parseFloat(autoTariff.pricePackage);
            console.log('🚂 Упаковка груза:', packagingPrice);
            services.push({
              name: 'Упаковка груза',
              description: 'Профессиональная упаковка',
              price: packagingPrice
            });
            totalPrice += packagingPrice;
          }
          
          // Страхование
          if (form.needInsurance && autoTariff.priceInsurance) {
            const insuranceCost = Math.round(form.declaredValue * parseFloat(autoTariff.priceInsurance) / 100);
            console.log('🚂 Страхование груза:', insuranceCost, '(', form.declaredValue, '*', autoTariff.priceInsurance, '%)');
            services.push({
              name: 'Страхование груза',
              description: `На сумму ${form.declaredValue.toLocaleString()} ₽`,
              price: insuranceCost
            });
            totalPrice += insuranceCost;
          }

          console.log('🚂 Rail Continent итоговая стоимость:', totalPrice);
          console.log('🚂 Rail Continent услуги:', services);

          // Дополнительные услуги (показываем, но не включаем в общую стоимость)
          const additionalServices: { name: string; description: string; price: number }[] = [];
          
          // Терминальные сборы
          if (autoTariff.terminalEnter1) {
            additionalServices.push({
              name: 'Терминальный сбор отправления',
              description: 'Обработка груза на терминале',
              price: parseInt(autoTariff.terminalEnter1)
            });
          }
          
          // Забор/доставка
          if (form.fromAddressDelivery && autoTariff.pricePickup && parseInt(autoTariff.pricePickup) > 0) {
            additionalServices.push({
              name: 'Забор груза',
              description: 'От адреса отправителя',
              price: parseInt(autoTariff.pricePickup)
            });
          }
          
          if (form.toAddressDelivery && autoTariff.priceDelivery && parseInt(autoTariff.priceDelivery) > 0) {
            additionalServices.push({
              name: 'Доставка по адресу',
              description: 'До адреса получателя',
              price: parseInt(autoTariff.priceDelivery)
            });
          }

          return {
            company: 'Rail Continent',
            price: Math.round(totalPrice),
            days: parseInt(autoTariff.duration) || 5,
            details: {
              tariff: `${autoTariff.type} - ${autoTariff.service}`,
              transportType: autoTariff.rsType,
              weight: totalWeight,
              volume: totalVolume,
              route: `${form.fromCity} - ${form.toCity}`,
              services,
              additionalServices,
              allTariffs: data.data
            },
            requestData,
            responseData: data,
            apiUrl
          };
        } else {
          return {
            company: 'Rail Continent',
            price: 0,
            days: 0,
            error: 'Автомобильный тариф недоступен для данного маршрута',
            requestData,
            responseData: data,
            apiUrl
          };
        }
      } else {
        return {
          company: 'Rail Continent',
          price: 0,
          days: 0,
          error: data.error || 'Ошибка расчета Rail Continent',
          requestData,
          responseData: data,
          apiUrl
        };
      }
    } catch (error: any) {
      console.error('🚂 Rail Continent ошибка:', error);
      return {
        company: 'Rail Continent',
        price: 0,
        days: 0,
        error: `Ошибка соединения: ${error.message}`,
        apiUrl
      };
    }
  };

  const calculateVozovoz = async (): Promise<CalculationResult> => {
    const apiUrl = '/api/vozovoz';
    
    try {
      // Вычисляем основные параметры груза
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );
      
      console.log('🚚 Возовоз: подготовка данных...');
      console.log('   - Общий вес:', totalWeight, 'кг');
      console.log('   - Общий объем:', totalVolume, 'м³');
      console.log('   - Откуда:', form.fromCity);
      console.log('   - Куда:', form.toCity);
      
      // Параметры для API Vozovoz
      const requestData = {
        object: "price",
        action: "get",
        params: {
          cargo: {
            dimension: {
              quantity: form.cargos.length,
              volume: totalVolume,
              weight: totalWeight
            },
            ...(form.needInsurance && form.declaredValue > 0 ? {
              insurance: form.declaredValue
            } : {}),
            ...(form.needPackaging ? {
              wrapping: {
                palletCollar: totalVolume // Обрешетка по объему
              }
            } : {})
          },
          gateway: {
            dispatch: {
              point: {
                location: form.fromCity || 'Москва',
                ...(form.fromAddressDelivery ? {
                  address: form.fromAddress || "адрес отправления"
                } : {
                  terminal: "default"
                })
              }
            },
            destination: {
              point: {
                location: form.toCity || 'Санкт-Петербург',
                ...(form.toAddressDelivery ? {
                  address: form.toAddress || "адрес получения"
                } : {
                  terminal: "default"
                })
              }
            }
          }
        }
      };

      console.log('🚚 Возовоз запрос:', JSON.stringify(requestData, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('🚚 Возовоз ответ:', JSON.stringify(data, null, 2));

      if (response.ok && data.response) {
        const responseData = data.response;
        
        // Собираем детали по услугам
        const services: { name: string; description: string; price: number }[] = [];
        let totalPrice = responseData.price || responseData.basePrice || 0;
        
        console.log('🚚 Возовоз анализ ответа:', responseData);
        
        // Базовая стоимость доставки
        if (responseData.basePrice && responseData.basePrice > 0) {
          services.push({
            name: 'Доставка груза',
            description: `${form.fromCity} - ${form.toCity}`,
            price: responseData.basePrice
          });
        }
        
        // Дополнительные услуги из ответа API
        if (responseData.service && Array.isArray(responseData.service)) {
          responseData.service.forEach((service: any) => {
            if (service.price > 0) {
              services.push({
                name: service.name || 'Дополнительная услуга',
                description: service.description || '',
                price: service.price
              });
            }
          });
        }
        
        // Забор груза с адреса (если указан)
        if (form.fromAddressDelivery && responseData.pickupPrice) {
          services.push({
            name: 'Забор груза',
            description: `Забор с адреса: ${form.fromAddress || 'адрес отправления'}`,
            price: responseData.pickupPrice
          });
        }
        
        // Доставка груза до адреса (если указан)
        if (form.toAddressDelivery && responseData.deliveryPrice) {
          services.push({
            name: 'Доставка до адреса',
            description: `Доставка до: ${form.toAddress || 'адрес получения'}`,
            price: responseData.deliveryPrice
          });
        }
        
        // Упаковка (обрешетка)
        if (form.needPackaging && responseData.wrappingPrice) {
          services.push({
            name: 'Упаковка груза',
            description: 'Обрешетка груза',
            price: responseData.wrappingPrice
          });
        }
        
        // Страхование
        if (form.needInsurance && responseData.insurancePrice) {
          services.push({
            name: 'Страхование груза',
            description: `На сумму ${form.declaredValue.toLocaleString()} ₽`,
            price: responseData.insurancePrice
          });
        }
        
        // Если услуг нет, добавляем общую стоимость
        if (services.length === 0) {
          services.push({
            name: 'Доставка груза',
            description: `${form.fromCity} - ${form.toCity}`,
            price: totalPrice
          });
        }

        console.log('🚚 Возовоз итоговая стоимость:', totalPrice);
        console.log('🚚 Возовоз услуги:', services);

        return {
          company: 'Возовоз',
          price: Math.round(totalPrice),
          days: responseData.deliveryTime?.to || responseData.deliveryTime?.from || 3,
          details: {
            note: `Доставка ${form.fromCity} - ${form.toCity}`,
            services,
            basePrice: responseData.basePrice,
            finalPrice: responseData.price,
            deliveryTime: responseData.deliveryTime,
            weight: totalWeight,
            volume: totalVolume
          },
          requestData,
          responseData: data,
          apiUrl
        };
      } else {
        return {
          company: 'Возовоз',
          price: 0,
          days: 0,
          error: data.error || 'Ошибка расчета Возовоз',
          requestData,
          responseData: data,
          apiUrl
        };
      }
    } catch (error: any) {
      console.error('🚚 Возовоз ошибка:', error);
      return {
        company: 'Возовоз',
        price: 0,
        days: 0,
        error: `Ошибка соединения: ${error.message}`,
        apiUrl
      };
    }
  };

  // Расчет для Nord Wheel
  const calculateNordWheel = async (): Promise<CalculationResult> => {
    const apiUrl = 'https://nordw.ru/tools/api/calc/calculate/';
    
    try {
      // 🔧 Валидация множественных мест
      validateMultipleCargos(form.cargos);
      
      const totalWeight = form.cargos.reduce((sum, cargo) => sum + cargo.weight, 0);
      const totalVolume = form.cargos.reduce((sum, cargo) => 
        sum + (cargo.length * cargo.width * cargo.height) / 1000000, 0
      );

      // 🔧 ДОБАВЛЕНО: Расчет габаритов для множественных мест
      const maxLength = Math.max(...form.cargos.map(c => c.length));
      const maxWidth = Math.max(...form.cargos.map(c => c.width));
      const maxHeight = Math.max(...form.cargos.map(c => c.height));
      
      // 🔧 ДОБАВЛЕНО: Проверка на негабарит (>2м по любому измерению)
      const isOversized = maxLength > 200 || maxWidth > 200 || maxHeight > 200 || totalWeight > 1000;
      
      // 🔧 Детальное логирование множественных мест
      console.log('🌐 Nord Wheel: Анализ множественных грузовых мест:');
      console.log(`   - Количество мест: ${form.cargos.length}`);
      console.log(`   - Общий вес: ${totalWeight} кг`);
      console.log(`   - Общий объем: ${totalVolume.toFixed(3)} м³`);
      
      form.cargos.forEach((cargo, index) => {
        console.log(`   📦 Место ${index + 1}:`);
        console.log(`     - Габариты: ${cargo.length}×${cargo.width}×${cargo.height} см`);
        console.log(`     - Вес: ${cargo.weight} кг`);
        console.log(`     - Объем: ${((cargo.length * cargo.width * cargo.height) / 1000000).toFixed(3)} м³`);
      });
      
      if (form.cargos.length > 1) {
        console.log(`   📐 Максимальные габариты: ${maxLength}×${maxWidth}×${maxHeight} см`);
        console.log(`   🚛 Негабарит: ${isOversized ? 'ДА' : 'НЕТ'}`);
      }

      // 🔧 ИСПРАВЛЕНО: Добавлены габаритные параметры и улучшенная логика негабарита
      const params = new URLSearchParams({
        from: '91', // Москва (нужно будет получать ID города)
        to: '92', // СПб (нужно будет получать ID города)
        pickup: form.fromAddressDelivery ? '1' : '0',
        deliver: form.toAddressDelivery ? '1' : '0',
        weight: totalWeight.toString(),
        volume: totalVolume.toString(),
        oversized: isOversized ? '1' : '0', // 🔧 ИСПРАВЛЕНО: Правильное определение негабарита
        package: form.needPackaging ? '1' : '0',
        packageCount: form.cargos.length.toString(),
        insurance: form.needInsurance ? '1' : '0',
        sum: form.declaredValue.toString(),
        documentsReturn: '0',
        fragile: '1',
        // 🔧 ДОБАВЛЕНО: Габаритные параметры
        length: (maxLength / 100).toString(),      // в метрах
        width: (maxWidth / 100).toString(),        // в метрах
        height: (maxHeight / 100).toString(),      // в метрах
        // 🔧 ДОБАВЛЕНО: Флаг множественных мест
        multiplePackages: form.cargos.length > 1 ? '1' : '0'
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

  const handleCalculate = async () => {
    setCalculating(true);
    setCalculations([]);
    
    // Сохраняем данные формы после расчета (принудительно, без дебаунса)
    saveFormData({
      cargos: form.cargos,
      fromCity: form.fromCity,
      toCity: form.toCity,
      fromAddress: form.fromAddress,
      toAddress: form.toAddress,
      declaredValue: form.declaredValue,
      needPackaging: form.needPackaging,
      needLoading: form.needLoading,
      needCarry: form.needCarry,
      floor: form.floor,
      hasFreightLift: form.hasFreightLift,
      needInsurance: form.needInsurance,
      fromTerminal: form.fromTerminal,
      toTerminal: form.toTerminal,
      fromAddressDelivery: form.fromAddressDelivery,
      toAddressDelivery: form.toAddressDelivery,
      selectedProducts: form.selectedProducts,
    });
    
    try {
      // Создаем массив функций расчета только для включенных компаний
      const calculationFunctions: Promise<CalculationResult>[] = [];
      
      if (enabledCompanies.dellin) {
        calculationFunctions.push(calculateDellin());
      }
      if (enabledCompanies.pek) {
        calculationFunctions.push(calculatePEK());
      }
      if (enabledCompanies.nordwheel) {
        calculationFunctions.push(calculateNordWheel());
      }
      if (enabledCompanies.railcontinent) {
        calculationFunctions.push(calculateRailContinent());
      }
      if (enabledCompanies.vozovoz) {
        calculationFunctions.push(calculateVozovoz());
      }
      
      // Если ни одна компания не включена
      if (calculationFunctions.length === 0) {
        setCalculations([]);
        return;
      }
      
      const results = await Promise.all(calculationFunctions);
      
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
      // Разворачиваем все детали перед печатью
      const allExpanded = calculations.reduce((acc, calc) => {
        acc[calc.company] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      
      setExpandedDetails(allExpanded);
      
      // Даем время для обновления DOM
      setTimeout(() => {
        window.print();
      }, 100);
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

  // Сброс формы и результатов расчета
  const handleReset = () => {
    if (typeof window !== 'undefined') {
      // Очищаем localStorage
      localStorage.removeItem('deliveryForm');
      
      // Сбрасываем состояние формы к начальному
      setForm(initialFormState);
      
      // Очищаем результаты расчетов и состояния
      setCalculations([]);
      setExpandedDetails({});
      setExpandedDebugInfo({});
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveField('');
      
      console.log('Форма сброшена к начальному состоянию');
    }
  };

  // Парсер деталей расчета для читаемого формата
  const parseCalculationDetails = (calc: CalculationResult) => {
    console.log('🔍 parseCalculationDetails получил calc:', calc?.company || 'undefined');
    console.log('🔍 calc.details:', calc?.details ? 'существует' : 'undefined/null');
    console.log('🔍 typeof calc.details:', typeof calc?.details);
    
    const details: { service: string; description: string; price: number }[] = [];
    
    try {
      if (calc.company === 'Деловые Линии' && calc.details) {
        console.log('🔍 Начинаем обработку деталей Деловых Линий...');
      // Основная стоимость доставки (уже включает все базовые услуги и упаковку)
      let basePrice = calc.details?.price || calc.price || 0;
      
      // Разбиваем основную стоимость на компоненты если возможно
      let intercityPrice = 0;
      let derivalPrice = 0;
      let arrivalPrice = 0;
      let packagingPrice = 0;
      // packagingPremiums больше не используются - надбавки включены в pkg.price
      let insurancePrice = 0;
      
      // Межтерминальная перевозка
      if (calc.details?.intercity?.price) {
        intercityPrice = calc.details.intercity.price;
        details.push({
          service: 'Межтерминальная перевозка',
          description: `${form.fromCity} - ${form.toCity}`,
          price: intercityPrice
        });
      }
      
      // Забор груза
      if (calc.details?.derival?.price) {
        derivalPrice = calc.details.derival.price;
        details.push({
          service: 'Забор груза',
          description: 'От адреса',
          price: derivalPrice
        });
      }
      
      // Доставка груза
      if (calc.details?.arrival?.price) {
        arrivalPrice = calc.details.arrival.price;
        details.push({
          service: 'Отвоз груза',
          description: 'До адреса',
          price: arrivalPrice
        });
      }
      
      // Упаковка (надбавки уже включены в pkg.price, но показываем их для детализации)
      if (form.needPackaging && calc.details?.packages) {
        Object.entries(calc.details?.packages || {}).forEach(([key, pkg]: [string, any]) => {
          if (pkg.price && pkg.price > 0) {
            // Вычисляем базовую цену упаковки (без надбавок) для отображения
            let basePkgPrice = pkg.price;
            let totalPremiums = 0;
            
            if (pkg.premiumDetails && Array.isArray(pkg.premiumDetails)) {
              totalPremiums = pkg.premiumDetails.reduce((sum: number, premium: any) => 
                sum + (premium.value || 0), 0);
              basePkgPrice = pkg.price - totalPremiums;
            }
            
            packagingPrice += pkg.price; // В общую сумму добавляем полную цену
            
            // Показываем базовую упаковку
            details.push({
              service: 'Упаковка груза',
              description: 'Упаковать в комплекс «обрешётка + амортизация»',
              price: basePkgPrice
            });
            
            // Показываем надбавки отдельно (для детализации, но не добавляем к общей сумме)
            if (pkg.premiumDetails && Array.isArray(pkg.premiumDetails)) {
              pkg.premiumDetails.forEach((premium: any) => {
                if (premium.value && premium.value > 0) {
                  details.push({
                    service: 'Надбавка к упаковке',
                    description: premium.name || 'Дополнительная надбавка',
                    price: premium.value
                  });
                }
              });
            }
          }
        });
      }
      
      // Страхование
      if (form.needInsurance && calc.details?.insurance) {
        insurancePrice = calc.details.insurance;
        details.push({
          service: 'Страхование груза',
          description: `На сумму ${form.declaredValue.toLocaleString()} ₽`,
          price: insurancePrice
        });
      }
      
      // Дополнительные услуги
      details.push({
        service: 'Доп.услуги',
        description: 'Информирование о статусе груза',
        price: 15
      });
      
      // Если есть расхождение между суммой компонентов и общей стоимостью, добавляем остаток
      const calculatedSum = intercityPrice + derivalPrice + arrivalPrice + packagingPrice + insurancePrice + 15;
      const remainder = basePrice - calculatedSum;
      
      if (Math.abs(remainder) > 1) { // Если расхождение больше 1 рубля
        details.push({
          service: remainder > 0 ? 'Прочие услуги' : 'Скидка',
          description: 'Дополнительные сборы и корректировки',
          price: remainder
        });
      }
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
  } catch (globalError) {
    console.error('❌ ГЛОБАЛЬНАЯ ОШИБКА в parseCalculationDetails:', globalError);
    console.error('❌ Стек ошибки:', globalError instanceof Error ? globalError.stack : 'Нет стека');
    console.log('❌ calc object:', calc);
    // Возвращаем минимальные данные при любой ошибке
    return [{
      service: 'Доставка',
      description: 'Ошибка обработки деталей расчета',
      price: calc?.price || 0
    }];
  }
};

  // Показываем загрузку пока состояние не загрузилось (предотвращает ошибку гидратации)
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 relative flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-400">
            Междугородняя доставка Лавсит (ТК: {COMPANIES_BASE.length})
          </h1>
          
          {/* Индикатор сохранения */}
          <div className="flex items-center gap-4">
            {isFormChanged ? (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                Сохранение...
              </div>
            ) : lastSaveTime ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Сохранено {lastSaveTime.toLocaleTimeString()}
              </div>
            ) : hasStoredFormData() ? (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Данные восстановлены
              </div>
            ) : null}
            
            {/* Кнопка очистки данных */}
            {hasStoredFormData() && (
              <Button
                onClick={() => {
                  if (confirm('Очистить все сохраненные данные формы?')) {
                    clearFormData();
                    setForm(initialFormState);
                    setLastSaveTime(null);
                    setIsFormChanged(false);
                  }
                }}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Очистить
              </Button>
            )}
          </div>
        </div>
        
        {/* Кнопка диагностики */}
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => window.open('/diagnostic', '_blank')}
            variant="outline" 
            className="border-blue-500 text-blue-400 hover:bg-blue-900/20"
          >
            <Settings className="h-4 w-4 mr-2" />
            Диагностика
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[90vh]">
          {/* Левая часть - форма */}
          <div className="space-y-3 overflow-y-auto pr-2">
            {/* Каталог мебели */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Package2 className="h-4 w-4" />
                  Каталог мебели
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Поиск и добавление товаров */}
                <ProductSearch 
                  onProductAdd={handleProductAdd}
                  disabled={calculating}
                />
                
                {/* Управление добавленными товарами */}
                <ProductManager
                  products={form.selectedProducts}
                  onQuantityChange={handleProductQuantityChange}
                  onProductRemove={handleProductRemove}
                  disabled={calculating}
                />
              </CardContent>
            </Card>

            {/* Грузы */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Truck className="h-4 w-4" />
                  Грузы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupCargosForDisplay(form.cargos).map((group, groupIndex) => (
                  <div key={`group_${groupIndex}`} className="border border-gray-600 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-white">
                        {group.isEmpty ? (
                          `Груз №${group.indices[0] + 1}`
                        ) : group.quantity === 1 ? (
                          `Груз №${group.indices[0] + 1}`
                        ) : (
                          `Груз №${group.indices[0] + 1} - ${group.quantity} одинаковых места`
                        )}
                      </h4>
                      {form.cargos.length > 1 && group.quantity === 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeCargo(form.cargos[group.indices[0]].id)}
                          className="h-6 text-xs"
                        >
                          Удалить
                        </Button>
                      )}
                      {group.quantity > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {group.quantity} шт.
                        </Badge>
                      )}
                    </div>
                    
                    {group.isEmpty || group.quantity === 1 ? (
                      // Показываем поля ввода для пустых грузов или единичных
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-white text-xs">Длина (см)</Label>
                          <Input
                            type="number"
                            value={form.cargos[group.indices[0]].length || ''}
                            onChange={(e) => updateCargo(form.cargos[group.indices[0]].id, 'length', Number(e.target.value))}
                            className="bg-gray-700 border-gray-600 h-8 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white text-xs">Ширина (см)</Label>
                          <Input
                            type="number"
                            value={form.cargos[group.indices[0]].width || ''}
                            onChange={(e) => updateCargo(form.cargos[group.indices[0]].id, 'width', Number(e.target.value))}
                            className="bg-gray-700 border-gray-600 h-8 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white text-xs">Высота (см)</Label>
                          <Input
                            type="number"
                            value={form.cargos[group.indices[0]].height || ''}
                            onChange={(e) => updateCargo(form.cargos[group.indices[0]].id, 'height', Number(e.target.value))}
                            className="bg-gray-700 border-gray-600 h-8 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white text-xs">Вес (кг)</Label>
                          <Input
                            type="number"
                            value={form.cargos[group.indices[0]].weight || ''}
                            onChange={(e) => updateCargo(form.cargos[group.indices[0]].id, 'weight', Number(e.target.value))}
                            className="bg-gray-700 border-gray-600 h-8 text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      // Показываем только информацию для групп
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                        <div>Длина: {group.length} см</div>
                        <div>Ширина: {group.width} см</div>
                        <div>Высота: {group.height} см</div>
                        <div>Вес: {group.weight} кг</div>
                        <div className="col-span-2 text-xs text-blue-300 mt-1">
                          Общий вес: {(group.weight * group.quantity).toFixed(1)} кг, 
                          объем: {((group.length * group.width * group.height * group.quantity) / 1000000).toFixed(3)} м³
                        </div>
                      </div>
                    )}
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
                  <div className="flex gap-3 flex-wrap">
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="fromDelivery"
                        checked={form.fromTerminal}
                        onChange={() => setForm(prev => ({ ...prev, fromTerminal: true, fromAddressDelivery: false, fromLavsiteWarehouse: false }))}
                      />
                      <span className="text-white text-xs">От терминала</span>
                    </label>
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="fromDelivery"
                        checked={form.fromAddressDelivery && !form.fromLavsiteWarehouse}
                        onChange={() => setForm(prev => ({ ...prev, fromTerminal: false, fromAddressDelivery: true, fromLavsiteWarehouse: false }))}
                      />
                      <span className="text-white text-xs">От адреса</span>
                    </label>
                    <label className="flex items-center space-x-1">
                      <Checkbox
                        id="lavsiteWarehouse"
                        checked={form.fromLavsiteWarehouse}
                        onCheckedChange={handleLavsiteWarehouseChange}
                      />
                      <span className="text-white text-xs cursor-pointer">Со склада Лавсит</span>
                    </label>
                  </div>
                  
                  <div>
                    <Label className="text-white text-xs">Город отправления</Label>
                    <Input
                      value={form.fromCity}
                      onChange={(e) => !form.fromLavsiteWarehouse && handleAddressChange('fromCity', e.target.value, e.target)}
                      placeholder="Начните вводить город"
                      disabled={form.fromLavsiteWarehouse}
                      className={`bg-gray-700 border-gray-600 h-8 text-white ${form.fromLavsiteWarehouse ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  
                  {form.fromAddressDelivery && (
                    <div>
                      <Label className="text-white text-xs">Адрес отправления</Label>
                      <Input
                        value={form.fromAddress}
                        onChange={(e) => !form.fromLavsiteWarehouse && handleAddressChange('fromAddress', e.target.value, e.target)}
                        placeholder="Начните вводить адрес"
                        disabled={form.fromLavsiteWarehouse}
                        className={`bg-gray-700 border-gray-600 h-8 text-white ${form.fromLavsiteWarehouse ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <Label htmlFor="packaging" className="text-white text-xs">Требуется упаковка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance"
                      checked={form.needInsurance}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needInsurance: checked as boolean }))}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <Label htmlFor="insurance" className="text-white text-xs">Требуется страховка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="loading"
                      checked={form.needLoading}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needLoading: checked as boolean }))}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <Label htmlFor="loading" className="text-white text-xs">Требуется погрузка/разгрузка</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="carry"
                      checked={form.needCarry}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, needCarry: checked as boolean }))}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
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
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleCalculate} 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-8" 
                    disabled={calculating}
                  >
                    {calculating ? 'Расчет...' : 'Рассчитать'}
                  </Button>
                  
                  <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    className="w-full h-8 text-black border-gray-600 hover:bg-gray-700 hover:text-white" 
                    disabled={calculating}
                  >
                    Сбросить расчет
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правая часть - результаты */}
          <div className="space-y-3 overflow-y-auto">
            {calculations.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-blue-400">Результаты расчета</h2>
                  <Button 
                    onClick={exportToPDF} 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-blue-500 text-blue-400 hover:bg-blue-900/20 print:hidden"
                  >
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
                      <div className="space-y-2">
                        {calc.error ? (
                          <div className="space-y-2">
                            <Alert className="border-red-600">
                              <AlertDescription className="text-white text-xs">{calc.error}</AlertDescription>
                            </Alert>
                            {calc.price > 0 && (
                              <>
                                <p className="text-white text-xs"><strong>Примерная стоимость:</strong> {calc.price.toLocaleString()} ₽</p>
                                <p className="text-white text-xs"><strong>Примерный срок:</strong> {calc.days} дней</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-white text-xs"><strong>Стоимость:</strong> {calc.price.toLocaleString()} ₽</p>
                            <p className="text-white text-xs"><strong>Срок доставки:</strong> {calc.days} дней</p>
                          </>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          {!calc.error && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleDetails(calc.company)}
                              className="h-6 text-xs"
                            >
                              {expandedDetails[calc.company] ? 'Скрыть подробнее' : 'Показать подробнее'}
                            </Button>
                          )}
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
                        {!calc.error && (
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
                        )}
                        
                        {/* Отладочная информация - всегда доступна */}
                        <Collapsible open={expandedDebugInfo[calc.company]}>
                          <CollapsibleContent className="mt-2">
                            <div className="bg-gray-900 p-3 rounded text-xs">
                              <h4 className="font-bold mb-2 text-white">Отладочная информация:</h4>
                              
                              {calc.apiUrl && (
                                <div className="mb-3">
                                  <h5 className="font-bold mb-1 text-white">Запрос к API:</h5>
                                  <p className="text-gray-300 break-all text-xs">URL: {calc.apiUrl}</p>
                                </div>
                              )}
                              
                              {calc.sessionId && (
                                <div className="mb-3">
                                  <h5 className="font-bold mb-1 text-white">Session ID:</h5>
                                  <p className="text-gray-300 text-xs">{calc.sessionId}</p>
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
                              
                              {calc.error && (
                                <div className="mb-3">
                                  <h5 className="font-bold mb-1 text-red-400">Информация об ошибке:</h5>
                                  <p className="text-red-300 text-xs">{calc.error}</p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Список подключенных ТК - всегда видимый */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">
                  Подключенные транспортные компании ({COMPANIES_BASE.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {COMPANIES_BASE.map((company, index) => {
                    const isConnected = apiStatus[company.apiKey as keyof typeof apiStatus] === 'подключено';
                    const statusText = apiStatus[company.apiKey as keyof typeof apiStatus];
                    const isEnabled = enabledCompanies[company.apiKey];
                    
                    // Отладка для первых 3 компаний
                    if (index < 3) {
                      console.log(`🔍 Компания ${index}: ${company.name}, apiKey: ${company.apiKey}, isEnabled: ${isEnabled}, statusText: ${statusText}`);
                    }
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{company.logo}</span>
                          <div>
                            <p className="font-medium text-white text-xs">{company.name}</p>
                            <Badge 
                              variant={isConnected ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              {isConnected ? 'Подключена' : statusText === 'проверка...' ? 'Проверка...' : 'Ошибка'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300">
                            {isEnabled ? 'Вкл' : 'Выкл'}
                          </span>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              setEnabledCompanies(prev => ({
                                ...prev,
                                [company.apiKey]: checked
                              }));
                            }}
                            disabled={!isConnected}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Визуализация кузова */}
            {calculations.length > 0 && (
              <TruckVisualization 
                cargos={form.cargos.map(cargo => ({
                  id: cargo.id,
                  length: cargo.length * 10, // Переводим см в мм
                  width: cargo.width * 10,   // Переводим см в мм
                  height: cargo.height * 10, // Переводим см в мм
                  weight: cargo.weight,
                  productName: form.selectedProducts?.find(p => 
                    p.cargoIndexes.includes(form.cargos.indexOf(cargo))
                  )?.product.name
                }))}
                isVisible={true}
              />
            )}
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