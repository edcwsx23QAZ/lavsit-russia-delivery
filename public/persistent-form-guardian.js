// PERSISTENT FORM DATA GUARDIAN WITH TRIPLE PROTECTION
// Защищает данные формы от любых видов очистки, включая Clear-Site-Data
// Тройная защита: localStorage + IndexedDB + cookies
(function() {
  'use strict';
  
  console.log('[FORM-GUARDIAN] Инициализация с тройной защитой (localStorage + IndexedDB + cookies)...');
  
  const FORM_DATA_KEY = 'deliveryFormData';
  const APP_VERSION_KEY = 'appVersion';
  const BACKUP_KEYS = ['formBackup1', 'formBackup2', 'formBackup3'];
  const DB_NAME = 'LavsitFormStorage';
  const DB_VERSION = 1;
  const STORE_NAME = 'formData';
  const COOKIE_NAME = 'lavsit_form_guardian';
  const MAX_COOKIE_SIZE = 4000;
  
  let formDataBackup = null;
  let appVersionBackup = null;
  let guardianActive = false;
  let dbInstance = null;
  
  // IndexedDB helper functions
  function initIndexedDB() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('[FORM-GUARDIAN] IndexedDB не доступна');
        resolve(null);
        return;
      }
      
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('[FORM-GUARDIAN] Ошибка открытия IndexedDB:', request.error);
        resolve(null);
      };
      
      request.onsuccess = () => {
        dbInstance = request.result;
        console.log('[FORM-GUARDIAN] IndexedDB инициализирована');
        resolve(dbInstance);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[FORM-GUARDIAN] IndexedDB объект-хранилище создано');
        }
      };
    });
  }
  
  function saveToIndexedDB(key, value) {
    return new Promise((resolve) => {
      if (!dbInstance) {
        resolve(false);
        return;
      }
      
      try {
        const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const data = {
          key: key,
          value: value,
          timestamp: Date.now()
        };
        
        const request = store.put(data);
        
        request.onsuccess = () => {
          console.log(`[FORM-GUARDIAN] Сохранено в IndexedDB: ${key}`);
          resolve(true);
        };
        
        request.onerror = () => {
          console.error(`[FORM-GUARDIAN] Ошибка сохранения в IndexedDB: ${key}`, request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('[FORM-GUARDIAN] Исключение при сохранении в IndexedDB:', error);
        resolve(false);
      }
    });
  }
  
  function loadFromIndexedDB(key) {
    return new Promise((resolve) => {
      if (!dbInstance) {
        resolve(null);
        return;
      }
      
      try {
        const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.log(`[FORM-GUARDIAN] Загружено из IndexedDB: ${key}`);
            resolve(result.value);
          } else {
            console.log(`[FORM-GUARDIAN] Данные не найдены в IndexedDB: ${key}`);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error(`[FORM-GUARDIAN] Ошибка загрузки из IndexedDB: ${key}`, request.error);
          resolve(null);
        };
      } catch (error) {
        console.error('[FORM-GUARDIAN] Исключение при загрузке из IndexedDB:', error);
        resolve(null);
      }
    });
  }
  
  // Cookie helper functions
  function compressFormData(data) {
    try {
      const parsed = JSON.parse(data);
      const compressed = {
        v: parsed.version,
        t: parsed.timestamp,
        c: parsed.cargos,
        fc: parsed.fromCity,
        tc: parsed.toCity,
        fa: parsed.fromAddress,
        ta: parsed.toAddress,
        dv: parsed.declaredValue
      };
      return JSON.stringify(compressed);
    } catch (error) {
      return data;
    }
  }
  
  function decompressFormData(data) {
    try {
      const compressed = JSON.parse(data);
      if (compressed.version) return data; // Уже полные данные
      
      const decompressed = {
        version: compressed.v || '1.2',
        timestamp: compressed.t || Date.now(),
        cargos: compressed.c || [],
        fromCity: compressed.fc || '',
        toCity: compressed.tc || '',
        fromAddress: compressed.fa || '',
        toAddress: compressed.ta || '',
        declaredValue: compressed.dv || 0,
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
        selectedProducts: [],
        enabledCompanies: {}
      };
      return JSON.stringify(decompressed);
    } catch (error) {
      return data;
    }
  }
  
  function saveToCookies(data) {
    try {
      const compressed = compressFormData(data);
      
      if (compressed.length > MAX_COOKIE_SIZE) {
        console.warn('[FORM-GUARDIAN] Data too large for cookies');
        return false;
      }
      
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(compressed)}; expires=${expires}; path=/; SameSite=Lax`;
      console.log('[FORM-GUARDIAN] Сохранено в cookies');
      return true;
    } catch (error) {
      console.warn('[FORM-GUARDIAN] Cookie save failed:', error);
      return false;
    }
  }
  
  function loadFromCookies() {
    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(`${COOKIE_NAME}=`)) {
          const compressed = decodeURIComponent(cookie.substring(`${COOKIE_NAME}=`.length));
          const data = decompressFormData(compressed);
          console.log('[FORM-GUARDIAN] Загружено из cookies');
          return data;
        }
      }
    } catch (error) {
      console.warn('[FORM-GUARDIAN] Cookie load failed:', error);
    }
    return null;
  }
  
  // Функция создания резервных копий во всех хранилищах
  async function createBackups() {
    try {
      const formData = localStorage.getItem(FORM_DATA_KEY);
      const appVersion = localStorage.getItem(APP_VERSION_KEY);
      
      let localStorageSuccess = false;
      let cookieSuccess = false;
      let indexedDBSuccess = false;
      
      if (formData) {
        formDataBackup = formData;
        
        // 1. Создаем резервные копии в localStorage
        try {
          BACKUP_KEYS.forEach((key, index) => {
            setTimeout(() => {
              try {
                localStorage.setItem(key, formData);
              } catch (e) {
                console.warn('[FORM-GUARDIAN] Backup failed for:', key, e);
              }
            }, index * 10);
          });
          localStorageSuccess = true;
        } catch (error) {
          console.warn('[FORM-GUARDIAN] localStorage backup failed:', error);
        }
        
        // 2. Сохраняем в cookies
        try {
          cookieSuccess = saveToCookies(formData);
        } catch (error) {
          console.warn('[FORM-GUARDIAN] Cookie backup failed:', error);
        }
        
        // 3. Сохраняем в IndexedDB
        if (dbInstance) {
          try {
            indexedDBSuccess = await saveToIndexedDB(FORM_DATA_KEY, formData);
          } catch (error) {
            console.warn('[FORM-GUARDIAN] IndexedDB backup failed:', error);
          }
        }
      }
      
      if (appVersion) {
        appVersionBackup = appVersion;
        localStorage.setItem('appVersionBackup', appVersion);
        if (dbInstance) {
          await saveToIndexedDB(APP_VERSION_KEY, appVersion);
        }
      }
      
      console.log(`[FORM-GUARDIAN] Triple backup created: localStorage=${localStorageSuccess}, cookies=${cookieSuccess}, indexedDB=${indexedDBSuccess}`);
    } catch (e) {
      console.warn('[FORM-GUARDIAN] Backup creation failed:', e);
    }
  }
  
  // Функция восстановления данных из всех источников
  async function restoreFormData() {
    try {
      // Проверяем, нужно ли восстановление
      const currentFormData = localStorage.getItem(FORM_DATA_KEY);
      if (currentFormData) {
        console.log('[FORM-GUARDIAN] Form data already exists, no restore needed');
        return;
      }
      
      console.log('[FORM-GUARDIAN] Data lost, attempting restore from all sources...');
      let restored = false;
      
      // 1. Пытаемся восстановить из memory backup
      if (formDataBackup) {
        localStorage.setItem(FORM_DATA_KEY, formDataBackup);
        console.log('[FORM-GUARDIAN] Restored from memory backup');
        restored = true;
      }
      
      // 2. Пытаемся восстановить из localStorage backups
      if (!restored) {
        for (const backupKey of BACKUP_KEYS) {
          const backup = localStorage.getItem(backupKey);
          if (backup) {
            localStorage.setItem(FORM_DATA_KEY, backup);
            console.log('[FORM-GUARDIAN] Restored from', backupKey);
            restored = true;
            break;
          }
        }
      }
      
      // 3. Пытаемся восстановить из cookies
      if (!restored) {
        const cookieData = loadFromCookies();
        if (cookieData) {
          localStorage.setItem(FORM_DATA_KEY, cookieData);
          console.log('[FORM-GUARDIAN] Restored from cookies');
          restored = true;
        }
      }
      
      // 4. Пытаемся восстановить из IndexedDB
      if (!restored && dbInstance) {
        const indexedData = await loadFromIndexedDB(FORM_DATA_KEY);
        if (indexedData) {
          localStorage.setItem(FORM_DATA_KEY, indexedData);
          console.log('[FORM-GUARDIAN] Restored from IndexedDB');
          restored = true;
        }
      }
      
      // Восстанавливаем версию приложения
      if (appVersionBackup && !localStorage.getItem(APP_VERSION_KEY)) {
        localStorage.setItem(APP_VERSION_KEY, appVersionBackup);
        console.log('[FORM-GUARDIAN] App version restored');
      }
      
      if (restored) {
        console.log('[FORM-GUARDIAN] ✅ Form data successfully restored from triple protection');
        // Пересоздаем backup после восстановления
        setTimeout(createBackups, 100);
        
        // Уведомляем React о восстановлении данных
        window.dispatchEvent(new CustomEvent('formDataRestored', {
          detail: { source: 'triple-protection-guardian' }
        }));
      } else {
        console.log('[FORM-GUARDIAN] No backup data found in any source for restoration');
      }
      
    } catch (e) {
      console.warn('[FORM-GUARDIAN] Restore failed:', e);
    }
  }
  
  // Мониторинг изменений localStorage с тройной защитой
  async function monitorLocalStorage() {
    if (guardianActive) return;
    
    guardianActive = true;
    console.log('[FORM-GUARDIAN] Monitoring localStorage with triple protection...');
    
    // Инициализируем IndexedDB
    await initIndexedDB();
    
    // Сохраняем текущие данные во всех хранилищах
    await createBackups();
    
    // Периодически проверяем и восстанавливаем данные
    const restoreInterval = setInterval(async () => {
      const formData = localStorage.getItem(FORM_DATA_KEY);
      if (!formData && (formDataBackup || localStorage.getItem(BACKUP_KEYS[0]))) {
        console.log('[FORM-GUARDIAN] Detected data loss, restoring from triple protection...');
        await restoreFormData();
      }
    }, 500);
    
    // Отложенное восстановление после загрузки страницы
    setTimeout(async () => {
      await restoreFormData();
    }, 1000);
    
    // Дополнительное восстановление через 3 секунды (после всех Clear-Site-Data)
    setTimeout(async () => {
      await restoreFormData();
    }, 3000);
    
    // Обновляем backup при изменениях
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (key === FORM_DATA_KEY || key === APP_VERSION_KEY) {
        setTimeout(createBackups, 50);
      }
    };
    
    // Восстанавливаем при storage events
    window.addEventListener('storage', async function(e) {
      if (e.key === FORM_DATA_KEY && !e.newValue && formDataBackup) {
        console.log('[FORM-GUARDIAN] Storage event detected data loss, restoring...');
        setTimeout(restoreFormData, 100);
      }
    });
    
    console.log('[FORM-GUARDIAN] ✅ Triple protection guardian activated');
  }
  
  // Экспортируем функции для использования в React
  window.formGuardian = {
    createBackups,
    restoreFormData,
    saveToCookies,
    loadFromCookies,
    saveToIndexedDB,
    loadFromIndexedDB,
    initIndexedDB
  };
  
  // Запускаем мониторинг
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorLocalStorage);
  } else {
    monitorLocalStorage();
  }
  
  // Запускаем немедленно
  setTimeout(monitorLocalStorage, 0);
  
})();