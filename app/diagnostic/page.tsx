'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Building2, Truck, Activity, CheckCircle, AlertCircle, XCircle, TestTube, PlayCircle, Plus, Trash2, Save, ExternalLink, RefreshCw, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      skipped: number;
      errors: string[];
      averageResponseTime: number;
      successRate: number;
    };
    details: any[];
    progressInfo: {
      currentTK: string;
      completedTests: number;
      totalPlannedTests: number;
      stage: string;
    } | null;
  } | null>(null);

  const [testProgress, setTestProgress] = useState<{
    currentTK: string;
    completedTests: number;
    totalPlannedTests: number;
    stage: string;
  } | null>(null);

  // Состояние для управления типами автомобилей
  const [vehicleTypes, setVehicleTypes] = useState([
    { id: '1', name: 'Форд Транзит', length: 4200, width: 2025, height: 2025 },
    { id: '2', name: 'Фура 18м3', length: 4200, width: 2200, height: 2000 }
  ]);
  const [newVehicle, setNewVehicle] = useState({ name: '', length: '', width: '', height: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  
  // Загружаем сохранённые типы автомобилей при инициализации
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vehicleTypes');
      if (saved) {
        const parsedVehicleTypes = JSON.parse(saved);
        setVehicleTypes(parsedVehicleTypes);
      }
      
      // Загружаем время последнего обновления
      const lastUpdate = localStorage.getItem('lastProductDataUpdate');
      if (lastUpdate) {
        setLastUpdateTime(new Date(lastUpdate).toLocaleString('ru-RU'));
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранённых данных:', error);
    }
  }, []);

  // Функции управления типами автомобилей
  const addVehicleType = () => {
    if (!newVehicle.name || !newVehicle.length || !newVehicle.width || !newVehicle.height) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    const newId = (vehicleTypes.length + 1).toString();
    const vehicleToAdd = {
      id: newId,
      name: newVehicle.name,
      length: parseInt(newVehicle.length),
      width: parseInt(newVehicle.width),
      height: parseInt(newVehicle.height)
    };
    
    setVehicleTypes([...vehicleTypes, vehicleToAdd]);
    setNewVehicle({ name: '', length: '', width: '', height: '' });
    setHasUnsavedChanges(true);
  };
  
  const removeVehicleType = (id: string) => {
    setVehicleTypes(vehicleTypes.filter(vehicle => vehicle.id !== id));
    setHasUnsavedChanges(true);
  };
  
  const updateVehicleType = (id: string, field: string, value: string | number) => {
    setVehicleTypes(vehicleTypes.map(vehicle => 
      vehicle.id === id ? { ...vehicle, [field]: value } : vehicle
    ));
    setHasUnsavedChanges(true);
  };
  
  const saveVehicleTypes = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Имитация сохранения (в реальном приложении здесь бы был API запрос)
      localStorage.setItem('vehicleTypes', JSON.stringify(vehicleTypes));
      
      // Имитация задержки сетевого запроса
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      setSaveStatus('success');
      
      // Автоматически скрываем сообщение об успехе через 3 секунды
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Функция полного обновления данных из Google Sheets
  const updateProductData = async () => {
    setIsUpdatingData(true);
    setUpdateStatus('updating');
    
    try {
      console.log('🔄 Начинаем полное обновление базы товаров из Google Sheets...');
      console.log('🧹 Этап 1: Очистка всех старых данных о товарах и грузовых местах');
      
      // ПОЛНАЯ ОЧИСТКА ВСЕХ ДАННЫХ О ТОВАРАХ И ГРУЗОВЫХ МЕСТАХ
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('furniture_') || 
          key.startsWith('product_') || 
          key.startsWith('cargo_') ||
          key.startsWith('cargoPlaces_') ||
          key.includes('cargo') ||
          key.includes('furniture') ||
          key.includes('product') ||
          key.includes('dimension') ||
          key.includes('size') ||
          key.includes('weight') ||
          key.includes('place')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Удаляем все найденные ключи
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Удален ключ: ${key}`);
      });
      console.log(`🧽 Очищено ${keysToRemove.length} ключей из localStorage`);
      
      // Очищаем кэш браузера для API данных (принудительная перезагрузка)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => 
            caches.delete(cacheName).then(() => 
              console.log(`🗑️ Очищен кэш: ${cacheName}`)
            )
          )
        );
      }
      
      console.log('📥 Этап 2: Загрузка новых данных из Google Sheets');
      
      // Принудительное обновление через API с очисткой кэша
      const response = await fetch('/api/furniture-products?update=true&force=true&timestamp=' + Date.now(), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка обновления данных из Google Sheets');
      }
      
      console.log(`✅ Успешно загружено ${result.data.length} товаров из Google Sheets`);
      console.log(`🕰️ Время загрузки: ${result.lastUpdated}`);
      console.log(`📊 Примеры товаров:`, result.data.slice(0, 3).map((p: any) => ({
        name: p.name,
        cargoPlaces: p.cargoPlaces?.length || 0
      })));
      
      // Принудительно обновляем кэш через POST запрос
      console.log('🔄 Этап 3: Принудительное обновление серверного кэша');
      try {
        const postResponse = await fetch('/api/furniture-products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ forceUpdate: true })
        });
        
        if (postResponse.ok) {
          const postResult = await postResponse.json();
          console.log('✅ Серверный кэш принудительно обновлен:', postResult.data?.length || 0, 'товаров');
        }
      } catch (postError) {
        console.warn('⚠️ Не удалось обновить через POST, но GET обновление прошло успешно');
      }
      
      // Отправляем сообщение в главное окно для полной перезагрузки компонентов
      if (window.opener) {
        window.opener.postMessage({
          type: 'PRODUCTS_FULLY_UPDATED',
          data: {
            productsCount: result.data.length,
            lastUpdated: result.lastUpdated,
            forceReload: true,
            clearAllCache: true
          }
        }, '*');
        console.log('📡 Отправлено сообщение в главное окно о полном обновлении товаров');
      }
      
      // Отправляем событие для принудительной перезагрузки всех компонентов с товарами
      window.dispatchEvent(new CustomEvent('furnitureDataUpdated', {
        detail: {
          productsCount: result.data.length,
          lastUpdated: result.lastUpdated,
          fullReset: true
        }
      }));
      
      // Сохраняем время последнего обновления
      localStorage.setItem('lastProductDataUpdate', new Date().toISOString());
      localStorage.setItem('productDataForceUpdate', 'true');
      
      setUpdateStatus('success');
      setLastUpdateTime(new Date().toLocaleString('ru-RU'));
      setHasUnsavedChanges(false);
      
      console.log('🎉 Полное обновление данных завершено успешно!');
      
      // Автоматически скрываем статус через 5 секунд (дольше, чтобы пользователь увидел успех)
      setTimeout(() => setUpdateStatus('idle'), 5000);
      
    } catch (error: any) {
      console.error('❌ Ошибка полного обновления данных:', error);
      setUpdateStatus('error');
      
      // Показываем подробную ошибку в консоли
      console.error('❌ Детали ошибки:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      setTimeout(() => setUpdateStatus('idle'), 8000);
    } finally {
      setIsUpdatingData(false);
    }
  };

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
  const generateTestCargos = (count: number, variant: 'small' | 'medium' | 'large' | 'mixed' = 'mixed') => {
    const cargos: Array<{length: number; width: number; height: number; weight: number}> = [];
    
    for (let i = 0; i < count; i++) {
      let cargo;
      
      switch (variant) {
        case 'small':
          cargo = {
            length: 30 + Math.floor(Math.random() * 70),  // 30-100 см
            width: 20 + Math.floor(Math.random() * 50),   // 20-70 см
            height: 15 + Math.floor(Math.random() * 35),  // 15-50 см
            weight: 1 + Math.floor(Math.random() * 19)    // 1-20 кг
          };
          break;
        case 'medium':
          cargo = {
            length: 80 + Math.floor(Math.random() * 70),  // 80-150 см
            width: 60 + Math.floor(Math.random() * 60),   // 60-120 см
            height: 40 + Math.floor(Math.random() * 80),  // 40-120 см
            weight: 15 + Math.floor(Math.random() * 35)   // 15-50 кг
          };
          break;
        case 'large':
          cargo = {
            length: 150 + Math.floor(Math.random() * 100), // 150-250 см (негабарит)
            width: 120 + Math.floor(Math.random() * 80),   // 120-200 см
            height: 100 + Math.floor(Math.random() * 100), // 100-200 см
            weight: 40 + Math.floor(Math.random() * 460)   // 40-500 кг
          };
          break;
        default: // mixed
          const types = ['small', 'medium', 'large'] as const;
          const randomType = types[Math.floor(Math.random() * types.length)];
          cargo = generateTestCargos(1, randomType)[0];
          break;
      }
      
      cargos.push(cargo);
    }
    
    return cargos;
  };

  // 🔧 Генератор всех комбинаций опций с расширенными сценариями
  const generateOptionsCombinations = () => {
    const combinations: any[] = [];
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
    
    // Добавляем специальные комбинации с разными стоимостями
    const specialCombinations = [
      { ...combinations[0], declaredValue: 10000, testCase: 'low_value' },
      { ...combinations[0], declaredValue: 100000, testCase: 'medium_value' },
      { ...combinations[0], declaredValue: 500000, testCase: 'high_value' },
      { ...combinations[0], declaredValue: 1000000, testCase: 'very_high_value' },
      // Тестирование разных маршрутов
      { ...combinations[0], fromCity: 'Екатеринбург', toCity: 'Новосибирск', testCase: 'long_distance' },
      { ...combinations[0], fromCity: 'Москва', toCity: 'Мытищи', testCase: 'short_distance' }
    ];
    
    return [...combinations, ...specialCombinations];
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

  // 🔧 РАСШИРЕННОЕ ПОЛНОЕ ТЕСТИРОВАНИЕ
  const runFullTesting = async () => {
    setIsFullTesting(true);
    setFullTestResults(null);
    setTestProgress(null);
    
    const allResults: any[] = [];
    const errors: string[] = [];
    let totalTests = 0;
    let successful = 0;
    let skipped = 0;
    let totalResponseTime = 0;
    
    console.log('🧪 ===== НАЧАЛО РАСШИРЕННОГО ПОЛНОГО ТЕСТИРОВАНИЯ =====');
    
    try {
      const transportCompanies = ['pek', 'railcontinent', 'vozovoz', 'nordwheel', 'dellin'];
      // Расширенный набор тестирования количества грузовых мест
      const cargoCountTests = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50];
      const cargoVariants = ['small', 'medium', 'large', 'mixed'] as const;
      const optionCombinations = generateOptionsCombinations();
      
      // Планируем более полное тестирование
      const totalPlannedTests = transportCompanies.length * cargoCountTests.length * cargoVariants.length * Math.min(optionCombinations.length, 8);
      
      console.log(`🧪 Планируется тестов: ${totalPlannedTests} (${transportCompanies.length} ТК × ${cargoCountTests.length} вариантов мест × ${cargoVariants.length} типов груза × до 8 комбинаций опций)`);
      
      for (const tk of transportCompanies) {
        console.log(`🧪 Начинаем тестирование ${tk.toUpperCase()}...`);
        
        setTestProgress({
          currentTK: tk.toUpperCase(),
          completedTests: totalTests,
          totalPlannedTests,
          stage: 'Инициализация тестирования'
        });
        
        let testsForCurrentTK = 0;
        const maxTestsPerTK = 150; // Увеличиваем лимит для более полного тестирования
        
        // Тестируем различное количество грузовых мест
        for (const cargoCount of cargoCountTests) {
          if (testsForCurrentTK >= maxTestsPerTK) {
            console.log(`⚠️ Достигнут лимит тестов для ${tk} (${maxTestsPerTK})`);
            break;
          }
          
          setTestProgress({
            currentTK: tk.toUpperCase(),
            completedTests: totalTests,
            totalPlannedTests,
            stage: `Тестирование ${cargoCount} грузовых мест`
          });
          
          // Тестируем разные типы грузов
          for (const cargoVariant of cargoVariants) {
            if (testsForCurrentTK >= maxTestsPerTK) break;
            
            // Выбираем разнообразные комбинации опций
            const selectedCombinations = [
              optionCombinations[0],  // Базовая (все false)
              optionCombinations[15], // Все услуги (все true)
              optionCombinations[5],  // Частичная комбинация 1
              optionCombinations[10], // Частичная комбинация 2
              ...optionCombinations.filter(c => c.testCase).slice(0, 4) // Специальные сценарии
            ].slice(0, Math.min(8, Math.ceil(maxTestsPerTK / (cargoCountTests.length * cargoVariants.length))));
            
            for (const options of selectedCombinations) {
              if (testsForCurrentTK >= maxTestsPerTK) break;
              
              const testData = {
                ...options,
                cargos: generateTestCargos(cargoCount, cargoVariant),
                testMetadata: {
                  cargoVariant,
                  cargoCount,
                  testCase: options.testCase || 'standard'
                }
              };
              
              const activeOptions = Object.entries(options)
                .filter(([k, v]) => typeof v === 'boolean' && v && !['testCase'].includes(k))
                .map(([k]) => k)
                .join(', ') || 'базовые';
              
              console.log(`🧪 ${tk}: ${cargoCount} мест (${cargoVariant}), опции: [${activeOptions}]${options.testCase ? ` - ${options.testCase}` : ''}`);
              
              setTestProgress({
                currentTK: tk.toUpperCase(),
                completedTests: totalTests,
                totalPlannedTests,
                stage: `${cargoCount} мест (${cargoVariant}) - ${activeOptions}`
              });
              
              const result = await testSingleTK(tk, testData);
              allResults.push({
                ...result,
                testMetadata: testData.testMetadata
              });
              
              totalTests++;
              testsForCurrentTK++;
              
              if (result.timing) {
                totalResponseTime += result.timing;
              }
              
              if (result.status === 'success') {
                successful++;
                console.log(`✅ ${tk}: ${result.message} (${result.timing}ms)`);
              } else if (result.status === 'skipped') {
                skipped++;
                console.log(`⏭️ ${tk}: ${result.message}`);
              } else {
                console.log(`❌ ${tk}: ${result.message} (${result.timing || 0}ms)`);
                errors.push(`${tk} (${cargoCount} мест, ${cargoVariant}): ${result.message}`);
              }
              
              // Динамическое обновление прогресса
              if (totalTests % 10 === 0) {
                const currentSuccessRate = totalTests > 0 ? (successful / totalTests) * 100 : 0;
                console.log(`📊 Промежуточные результаты: ${totalTests} тестов, ${successful} успешных (${currentSuccessRate.toFixed(1)}%)`);
              }
              
              // Адаптивная пауза между запросами
              const pauseTime = result.status === 'error' ? 500 : 200;
              await new Promise(resolve => setTimeout(resolve, pauseTime));
            }
          }
        }
        
        console.log(`🏁 Завершено тестирование ${tk.toUpperCase()}: ${testsForCurrentTK} тестов`);
      }
      
      const averageResponseTime = totalTests > 0 ? Math.round(totalResponseTime / (totalTests - skipped)) : 0;
      const successRate = totalTests > 0 ? (successful / totalTests) * 100 : 0;
      
      const summary = {
        totalTests,
        successful,
        failed: totalTests - successful - skipped,
        skipped,
        errors,
        averageResponseTime,
        successRate
      };
      
      setFullTestResults({
        summary,
        details: allResults,
        progressInfo: null
      });
      
      // Детальная статистика
      console.log('🧪 ===== РЕЗУЛЬТАТЫ РАСШИРЕННОГО ПОЛНОГО ТЕСТИРОВАНИЯ =====');
      console.log(`📊 Всего тестов: ${totalTests}`);
      console.log(`✅ Успешных: ${successful}`);
      console.log(`❌ Неудачных: ${totalTests - successful - skipped}`);
      console.log(`⏭️ Пропущенных: ${skipped}`);
      console.log(`📈 Процент успеха: ${successRate.toFixed(1)}%`);
      console.log(`⏱️ Среднее время ответа: ${averageResponseTime}ms`);
      
      // Статистика по ТК
      const tkStats = transportCompanies.map(tk => {
        const tkResults = allResults.filter(r => r.tk === tk);
        const tkSuccessful = tkResults.filter(r => r.status === 'success').length;
        const tkTotal = tkResults.length;
        return {
          tk: tk.toUpperCase(),
          tests: tkTotal,
          successful: tkSuccessful,
          successRate: tkTotal > 0 ? (tkSuccessful / tkTotal) * 100 : 0
        };
      });
      
      console.log('📊 Статистика по ТК:');
      tkStats.forEach(stat => {
        console.log(`   ${stat.tk}: ${stat.successful}/${stat.tests} (${stat.successRate.toFixed(1)}%)`);
      });
      
      if (errors.length > 0) {
        console.log('❌ Основные ошибки:');
        // Группируем ошибки по типам
        const errorGroups = errors.reduce((acc, error) => {
          const key = error.split(':')[0];
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});
        
        Object.entries(errorGroups).forEach(([errorType, count]) => {
          console.log(`   - ${errorType}: ${count} раз`);
        });
      }
      
    } catch (error: any) {
      console.error('🧪 Критическая ошибка полного тестирования:', error);
      errors.push(`Критическая ошибка: ${error.message}`);
      
      setFullTestResults({
        summary: { 
          totalTests, 
          successful, 
          failed: totalTests - successful - skipped, 
          skipped,
          errors,
          averageResponseTime: 0,
          successRate: 0
        },
        details: allResults,
        progressInfo: null
      });
    } finally {
      setIsFullTesting(false);
      setTestProgress(null);
      console.log('🧪 ===== КОНЕЦ РАСШИРЕННОГО ПОЛНОГО ТЕСТИРОВАНИЯ =====');
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
          <Button onClick={() => window.open('/env-check', '_blank')} variant="outline" className="text-black bg-white border-gray-300 hover:bg-gray-100">
            <Building2 className="h-4 w-4 mr-2" />
            Проверить переменные окружения
          </Button>
          <Button 
            onClick={() => {
              window.open('https://docs.google.com/spreadsheets/d/1e0P91PfGKVIuSWDY0ceWkIE7jD-vzD_xrIesBeQno1Y/edit?gid=0#gid=0', '_blank');
            }} 
            variant="outline" 
            className="bg-green-600 hover:bg-green-700 text-white border-green-600"
            title="Открыть Google Sheets с базой товаров и размеров"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            База товаров
          </Button>
          <Button 
            onClick={updateProductData}
            disabled={isUpdatingData}
            variant="outline"
            className={
              updateStatus === 'success' 
                ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                : updateStatus === 'error'
                ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            }
            title="Обновить данные о товарах из Google Sheets"
          >
            {updateStatus === 'updating' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {updateStatus === 'updating' && 'Обновление...'}
            {updateStatus === 'success' && 'Обновлено!'}
            {updateStatus === 'error' && 'Ошибка'}
            {updateStatus === 'idle' && 'Обновить данные'}
          </Button>
          <Button onClick={() => window.close()} variant="outline" className="text-black bg-white border-gray-300 hover:bg-gray-100">
            Закрыть
          </Button>
        </div>

        {/* Информация о Google Sheets */}
        <Alert className="border-green-500 bg-green-900/20 mb-6">
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            <strong>База товаров и размеров:</strong> Кликните кнопку "База товаров" для открытия Google Sheets с полной базой данных о товарах.
            <br /><br />
            <strong>🔄 ПОЛНОЕ ОБНОВЛЕНИЕ ДАННЫХ:</strong> Кнопка "Обновить данные" выполняет ПОЛНУЮ ОЧИСТКУ всех старых данных о товарах и грузовых местах, затем заново парсит всю информацию из Google Sheets. Это включает:
            <ul className="list-disc list-inside mt-2 mb-2 space-y-1">
              <li>🧹 Удаление всех кэшированных данных о товарах из localStorage</li>
              <li>🗑️ Очистка кэша браузера и серверного кэша API</li>
              <li>📥 Новый парсинг всех товаров из Google Sheets CSV</li>
              <li>🔄 Принудительное обновление всех компонентов с товарами</li>
              <li>📡 Уведомление главного окна о полном обновлении</li>
            </ul>
            {lastUpdateTime && (
              <><strong>Последнее обновление:</strong> {lastUpdateTime}<br /><br /></>
            )}
            <strong>Структура данных в Google Sheets:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>ID товара и внешний код</li>
              <li>Название товара и активность</li>
              <li>Цена и категория</li>
              <li>До 7 грузовых мест для каждого товара</li>
              <li>Для каждого места: вес, высота, глубина, длина</li>
              <li>Автоматическое определение правил размещения</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Правила работы и стандарты */}
        <Card className="border-purple-500 bg-purple-900/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Правила работы и стандарты разработки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-medium text-purple-400 mb-3">🎯 Основные принципы работы:</h3>
                <ul className="text-sm space-y-2 text-gray-300">
                  <li>• <strong>Не срезать углы:</strong> Найти корневую проблему, а не создавать альтернативные способы</li>
                  <li>• <strong>Точечные исправления:</strong> Не переписывать файлы целиком, делать точечные изменения</li>
                  <li>• <strong>Исследование перед действием:</strong> Если уверенность &lt;0.95, делать дип-ресерч</li>
                  <li>• <strong>Автономность:</strong> Действовать максимально автономно, исправлять ошибки, коммитить</li>
                  <li>• <strong>Указывать уверенность:</strong> Для каждого действия указывать уровень уверенности</li>
                </ul>
              </div>
              
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-medium text-purple-400 mb-3">🔍 Протокол проверки (Challenge Protocol):</h3>
                <ol className="text-sm space-y-2 text-gray-300 list-decimal list-inside">
                  <li>Проверить результат, прочитать логи, выписать что не учел и где ошибся</li>
                  <li>Фальсифицировать вывод и гипотезу - протокол челендж</li>
                  <li>Навести порядок, проверить что файлы на своих местах</li>
                  <li>Выписать что не учел, что будет непонятно команде</li>
                  <li>Проверить gap между ожидаемым и фактическим output</li>
                </ol>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-medium text-purple-400 mb-3">📋 Стандарты тестирования:</h3>
                <ul className="text-sm space-y-2 text-gray-300">
                  <li>• <strong>Независимый cross-check:</strong> Не подтверждать без проверки</li>
                  <li>• <strong>Валидация output:</strong> Использовать команды валидации результата</li>
                  <li>• <strong>Тест-кейсы:</strong> Планировать и выполнять по AI QA Standard</li>
                  <li>• <strong>Ручное тестирование:</strong> Документировать результаты и задачи на исправление</li>
                </ul>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-medium text-purple-400 mb-3">🏗️ Heroes Platform - Структура проекта:</h3>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• <strong>Основная папка:</strong> heroes-platform/</li>
                  <li>• <strong>MCP Server:</strong> heroes-platform/mcp_server/</li>
                  <li>• <strong>Конфигурация:</strong> pyproject.toml, setup.py, Makefile</li>
                  <li>• <strong>Тестирование:</strong> run_tests.py (для обхода проблем pytest)</li>
                  <li>• <strong>Команды:</strong> make test, make lint, make format</li>
                </ul>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-medium text-purple-400 mb-3">🔄 Git и синхронизация:</h3>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• <strong>Проверка:</strong> Синхронизировать изменения если уверенность &gt;0.9</li>
                  <li>• <strong>Мердж:</strong> Сначала дип-ресерч и стратегия в чат</li>
                  <li>• <strong>Подтверждение:</strong> Мерджить только после подтверждения стратегии</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Правила размещения грузов */}
        <Card className="border-green-500 bg-green-900/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-400" />
              Правила размещения грузов в кузове фургона
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-gray-800 p-3 rounded">
                <h3 className="font-medium text-green-400 mb-2">Габариты кузова:</h3>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• Длина: 4200 мм</li>
                  <li>• Ширина: 2025 мм</li>
                  <li>• Высота: 2025 мм</li>
                </ul>
              </div>
              
              <div className="bg-gray-800 p-3 rounded">
                <h3 className="font-medium text-green-400 mb-2">Правила размещения:</h3>
                <div className="text-sm space-y-2 text-gray-300">
                  <div>
                    <strong>1. Поворот и штабелирование:</strong>
                    <p className="ml-4">• Грузы можно складывать друг на друга и поворачивать любой стороной</p>
                  </div>
                  
                  <div>
                    <strong>2. Правило по весу:</strong>
                    <p className="ml-4">• Грузы с большим весом нельзя складывать на грузы с меньшим весом</p>
                  </div>
                  
                  <div>
                    <strong>3. Ограничения для стульев и кресел:</strong>
                    <p className="ml-4">• Грузы с ключевыми словами "стул" или "кресло" нельзя поворачивать относительно горизонтальной оси</p>
                    <p className="ml-4">• На такие грузы можно складывать только другие грузы с теми же ключевыми словами</p>
                    <p className="ml-4">• Друг на друге не может быть больше двух таких грузов</p>
                  </div>
                  
                  <div>
                    <strong>4. Цель оптимизации:</strong>
                    <p className="ml-4">• Минимизация занятой площади пола</p>
                    <p className="ml-4">• Максимально компактное размещение</p>
                  </div>
                  
                  <div>
                    <strong>5. Алгоритм размещения 3D:</strong>
                    <p className="ml-4">• Поддержка поворотов грузов под углами: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°</p>
                    <p className="ml-4">• Диагональное размещение для оптимизации пространства</p>
                    <p className="ml-4">• 6 базовых ориентаций + вращение = до 48 вариантов размещения на груз</p>
                    <p className="ml-4">• Сетка размещения с шагом 25мм для точного позиционирования</p>
                    <p className="ml-4">• Приоритет: площадь пола → высота размещения → общий объем</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Прогресс полного тестирования */}
        {testProgress && (
          <Card className="border-blue-500 bg-blue-900/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-400 animate-pulse" />
                Выполняется тестирование
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Текущая ТК: <strong>{testProgress.currentTK}</strong></span>
                  <span>{testProgress.completedTests}/{testProgress.totalPlannedTests} тестов</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(testProgress.completedTests / testProgress.totalPlannedTests) * 100}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400">
                  Этап: {testProgress.stage}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Результаты полного тестирования */}
        {fullTestResults && (
          <Card className="border-gray-700 bg-gray-900 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-purple-400" />
                Результаты расширенного полного тестирования
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
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
                  <div className="text-2xl font-bold text-gray-400">{fullTestResults.summary.skipped}</div>
                  <div className="text-sm text-gray-400">Пропущено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {fullTestResults.summary.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Успешность</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{fullTestResults.summary.averageResponseTime}ms</div>
                  <div className="text-sm text-gray-400">Среднее время</div>
                </div>
              </div>
              
              {/* Статистика по ТК */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Статистика по транспортным компаниям:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {['PEK', 'RAILCONTINENT', 'VOZOVOZ', 'NORDWHEEL', 'DELLIN'].map(tk => {
                    const tkResults = fullTestResults.details.filter((r: any) => r.tk === tk.toLowerCase());
                    const tkSuccessful = tkResults.filter((r: any) => r.status === 'success').length;
                    const tkTotal = tkResults.length;
                    const tkSuccessRate = tkTotal > 0 ? (tkSuccessful / tkTotal) * 100 : 0;
                    
                    return (
                      <div key={tk} className="bg-gray-800 p-2 rounded text-sm">
                        <div className="font-medium">{tk}</div>
                        <div className="text-xs text-gray-400">
                          {tkSuccessful}/{tkTotal} ({tkSuccessRate.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {fullTestResults.summary.errors.length > 0 && (
                <Alert className="border-red-500 bg-red-900/20 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Найденные ошибки ({fullTestResults.summary.errors.length}):</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {fullTestResults.summary.errors.slice(0, 15).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {fullTestResults.summary.errors.length > 15 && (
                        <li>... и еще {fullTestResults.summary.errors.length - 15} ошибок</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Подробные результаты ({fullTestResults.details.length} записей)</summary>
                <div className="mt-2 max-h-96 overflow-y-auto">
                  <pre className="text-xs p-2 bg-gray-800 rounded">
                    {JSON.stringify(fullTestResults.details.map(detail => ({
                      tk: detail.tk,
                      status: detail.status,
                      cargoCount: detail.cargoCount,
                      testMetadata: detail.testMetadata,
                      timing: detail.timing,
                      price: detail.price,
                      message: detail.message
                    })), null, 2)}
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

        {/* Управление типами автомобилей */}
        <Card className="border-blue-500 bg-blue-900/20 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-400" />
                Типы автомобилей
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-orange-400 border-orange-400">
                    Есть несохранённые изменения
                  </Badge>
                )}
              </CardTitle>
              <Button 
                onClick={saveVehicleTypes}
                disabled={!hasUnsavedChanges || isSaving}
                className={
                  saveStatus === 'success' 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : saveStatus === 'error'
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                }
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveStatus === 'saving' && 'Сохранение...'}
                {saveStatus === 'success' && 'Сохранено!'}
                {saveStatus === 'error' && 'Ошибка'}
                {saveStatus === 'idle' && 'Сохранить'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Информационное сообщение */}
            <Alert className="border-blue-500 bg-blue-900/20 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Изменения в размерах и названиях типов автомобилей будут сохранены локально в браузере. Нажмите "Сохранить" для применения изменений.
                <br /><br />
                <strong>Обновление из Google Sheets:</strong> Данные также могут быть автоматически обновлены с помощью кнопки "Обновить данные" сверху. Это заменит все местные данные на актуальную информацию из таблицы.
              </AlertDescription>
            </Alert>
            
            {/* Список существующих автомобилей */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium text-white">Существующие типы:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleTypes.map((vehicle) => (
                  <div key={vehicle.id} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-gray-300">Название</Label>
                        <Input
                          value={vehicle.name}
                          onChange={(e) => updateVehicleType(vehicle.id, 'name', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-gray-400">Длина (мм)</Label>
                          <Input
                            type="number"
                            value={vehicle.length}
                            onChange={(e) => updateVehicleType(vehicle.id, 'length', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Ширина (мм)</Label>
                          <Input
                            type="number"
                            value={vehicle.width}
                            onChange={(e) => updateVehicleType(vehicle.id, 'width', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Высота (мм)</Label>
                          <Input
                            type="number"
                            value={vehicle.height}
                            onChange={(e) => updateVehicleType(vehicle.id, 'height', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white text-xs"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-xs text-gray-400">
                          Объём: {((vehicle.length * vehicle.width * vehicle.height) / 1000000000).toFixed(1)} м³
                        </div>
                        <Button
                          onClick={() => removeVehicleType(vehicle.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Добавление нового автомобиля */}
            <div className="bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-600">
              <h3 className="text-lg font-medium text-white mb-4">Добавить новый тип:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm text-gray-300">Название</Label>
                  <Input
                    placeholder="напр. Мерседес Спринтер"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Длина кузова (внутри), мм</Label>
                  <Input
                    type="number"
                    placeholder="4200"
                    value={newVehicle.length}
                    onChange={(e) => setNewVehicle({ ...newVehicle, length: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Ширина кузова (внутри), мм</Label>
                  <Input
                    type="number"
                    placeholder="2025"
                    value={newVehicle.width}
                    onChange={(e) => setNewVehicle({ ...newVehicle, width: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Высота кузова (внутри), мм</Label>
                  <Input
                    type="number"
                    placeholder="2025"
                    value={newVehicle.height}
                    onChange={(e) => setNewVehicle({ ...newVehicle, height: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {newVehicle.length && newVehicle.width && newVehicle.height && (
                    <span>
                      Прогнозируемый объём: {((parseInt(newVehicle.length) * parseInt(newVehicle.width) * parseInt(newVehicle.height)) / 1000000000).toFixed(1)} м³
                    </span>
                  )}
                </div>
                <Button 
                  onClick={addVehicleType}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}