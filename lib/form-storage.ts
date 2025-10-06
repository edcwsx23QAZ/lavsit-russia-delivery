'use client';

// Константы для ключей localStorage
const FORM_DATA_KEY = 'deliveryFormData';
const FORM_VERSION = '1.2'; // Поддержка полного состояния формы + enabledCompanies

export interface StoredFormData {
  version: string;
  timestamp: number;
  cargos: Array<{
    id: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    productId?: string;
    placeNumber?: number;
    isFromProduct?: boolean;
    addedAt?: number;
  }>;
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
  selectedProducts: Array<{
    product: {
      id: string;
      externalCode: string;
      name: string;
      retailPrice: number;
      isActive: boolean;
      cargoPlaces: Array<{
        placeNumber: number;
        weight: number;
        height: number;
        depth: number;
        length: number;
      }>;
    };
    quantity: number;
    totalPrice: number;
    cargoIndexes: number[];
    addedAt: number;
  }>;
  enabledCompanies?: Record<string, boolean>;
}

/**
 * Сохраняет данные формы в localStorage
 * НЕ сохраняет результаты расчетов - только пользовательский ввод
 */
export const saveFormData = (formData: Partial<StoredFormData>): boolean => {
  try {
    if (typeof window === 'undefined') {
      return false; // SSR safe
    }

    const dataToSave: StoredFormData = {
      version: FORM_VERSION,
      timestamp: Date.now(),
      cargos: formData.cargos || [],
      fromCity: formData.fromCity || '',
      toCity: formData.toCity || '',
      fromAddress: formData.fromAddress || '',
      toAddress: formData.toAddress || '',
      declaredValue: formData.declaredValue || 0,
      needPackaging: formData.needPackaging || false,
      needLoading: formData.needLoading || false,
      needCarry: formData.needCarry || false,
      floor: formData.floor || 1,
      hasFreightLift: formData.hasFreightLift || false,
      needInsurance: formData.needInsurance || false,
      fromTerminal: formData.fromTerminal ?? true,
      toTerminal: formData.toTerminal ?? true,
      fromAddressDelivery: formData.fromAddressDelivery || false,
      toAddressDelivery: formData.toAddressDelivery || false,
      fromLavsiteWarehouse: formData.fromLavsiteWarehouse || false,
      selectedProducts: formData.selectedProducts || [],
      enabledCompanies: formData.enabledCompanies || {},
    };

    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(dataToSave));
    console.log('💾 Данные формы сохранены в localStorage:', dataToSave);
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения данных формы:', error);
    return false;
  }
};

/**
 * Загружает сохраненные данные формы из localStorage
 */
export const loadFormData = (): StoredFormData | null => {
  try {
    if (typeof window === 'undefined') {
      return null; // SSR safe
    }

    const savedData = localStorage.getItem(FORM_DATA_KEY);
    if (!savedData) {
      console.log('📝 Сохраненные данные формы не найдены');
      return null;
    }

    const parsedData = JSON.parse(savedData) as StoredFormData;
    
    // Проверка версии данных
    if (parsedData.version !== FORM_VERSION) {
      console.warn('⚠️ Версия сохраненных данных не совпадает, выполняется миграция...');
      // Здесь можно добавить логику миграции данных при изменении структуры
      return migrateFormData(parsedData);
    }

    // Проверка срока давности данных (опционально - удаляем данные старше 30 дней)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsedData.timestamp > thirtyDaysInMs) {
      console.log('🗑️ Сохраненные данные слишком старые, удаляем...');
      clearFormData();
      return null;
    }

    console.log('📂 Данные формы загружены из localStorage:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('❌ Ошибка загрузки данных формы:', error);
    return null;
  }
};

/**
 * Миграция данных при изменении версии структуры
 */
const migrateFormData = (oldData: any): StoredFormData | null => {
  try {
    // Базовая миграция - приводим к текущей структуре
    const migratedData: StoredFormData = {
      version: FORM_VERSION,
      timestamp: Date.now(),
      cargos: oldData.cargos || [{ id: '1', length: 0, width: 0, height: 0, weight: 0 }],
      fromCity: oldData.fromCity || '',
      toCity: oldData.toCity || '',
      fromAddress: oldData.fromAddress || '',
      toAddress: oldData.toAddress || '',
      declaredValue: oldData.declaredValue || 0,
      needPackaging: oldData.needPackaging || false,
      needLoading: oldData.needLoading || false,
      needCarry: oldData.needCarry || false,
      floor: oldData.floor || 1,
      hasFreightLift: oldData.hasFreightLift || false,
      needInsurance: oldData.needInsurance || false,
      fromTerminal: oldData.fromTerminal ?? true,
      toTerminal: oldData.toTerminal ?? true,
      fromAddressDelivery: oldData.fromAddressDelivery || false,
      toAddressDelivery: oldData.toAddressDelivery || false,
      fromLavsiteWarehouse: oldData.fromLavsiteWarehouse || false,
      selectedProducts: oldData.selectedProducts || [],
      enabledCompanies: oldData.enabledCompanies || {},
    };

    // Сохраняем мигрированные данные
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(migratedData));
    console.log('✅ Данные успешно мигрированы');
    return migratedData;
  } catch (error) {
    console.error('❌ Ошибка миграции данных:', error);
    return null;
  }
};

/**
 * Очищает сохраненные данные формы
 */
export const clearFormData = (): boolean => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    localStorage.removeItem(FORM_DATA_KEY);
    console.log('🗑️ Данные формы удалены из localStorage');
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления данных формы:', error);
    return false;
  }
};

/**
 * Проверяет, есть ли сохраненные данные
 */
export const hasStoredFormData = (): boolean => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem(FORM_DATA_KEY) !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Дебаунс функция для ограничения частоты сохранения
 */
export const createDebouncedSaver = (delay: number = 1000) => {
  let timeoutId: NodeJS.Timeout;
  
  return (formData: Partial<StoredFormData>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      saveFormData(formData);
    }, delay);
  };
};