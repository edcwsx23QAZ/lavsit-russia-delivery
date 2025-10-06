// PERSISTENT FORM DATA GUARDIAN
// Защищает данные формы от любых видов очистки localStorage
(function() {
  'use strict';
  
  console.log('[FORM-GUARDIAN] Инициализация защиты данных формы...');
  
  const FORM_DATA_KEY = 'deliveryFormData';
  const APP_VERSION_KEY = 'appVersion';
  const BACKUP_KEYS = ['formBackup1', 'formBackup2', 'formBackup3'];
  
  let formDataBackup = null;
  let appVersionBackup = null;
  let guardianActive = false;
  
  // Функция сохранения данных в резервные копии
  function createBackups() {
    try {
      const formData = localStorage.getItem(FORM_DATA_KEY);
      const appVersion = localStorage.getItem(APP_VERSION_KEY);
      
      if (formData) {
        formDataBackup = formData;
        // Создаем несколько резервных копий в localStorage
        BACKUP_KEYS.forEach((key, index) => {
          setTimeout(() => {
            try {
              localStorage.setItem(key, formData);
            } catch (e) {
              console.warn('[FORM-GUARDIAN] Backup failed for:', key, e);
            }
          }, index * 10);
        });
      }
      
      if (appVersion) {
        appVersionBackup = appVersion;
        localStorage.setItem('appVersionBackup', appVersion);
      }
      
      console.log('[FORM-GUARDIAN] Backup created:', !!formData, !!appVersion);
    } catch (e) {
      console.warn('[FORM-GUARDIAN] Backup creation failed:', e);
    }
  }
  
  // Функция восстановления данных
  function restoreFormData() {
    try {
      let restored = false;
      
      // Проверяем, нужно ли восстановление
      const currentFormData = localStorage.getItem(FORM_DATA_KEY);
      if (currentFormData) {
        console.log('[FORM-GUARDIAN] Form data already exists, no restore needed');
        return;
      }
      
      // Пытаемся восстановить из memory backup
      if (formDataBackup) {
        localStorage.setItem(FORM_DATA_KEY, formDataBackup);
        console.log('[FORM-GUARDIAN] Restored from memory backup');
        restored = true;
      }
      
      // Пытаемся восстановить из localStorage backups
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
      
      // Восстанавливаем версию приложения
      if (appVersionBackup && !localStorage.getItem(APP_VERSION_KEY)) {
        localStorage.setItem(APP_VERSION_KEY, appVersionBackup);
        console.log('[FORM-GUARDIAN] App version restored');
      }
      
      if (restored) {
        console.log('[FORM-GUARDIAN] ✅ Form data successfully restored');
        // Пересоздаем backup после восстановления
        setTimeout(createBackups, 100);
      } else {
        console.log('[FORM-GUARDIAN] No backup data found for restoration');
      }
      
    } catch (e) {
      console.warn('[FORM-GUARDIAN] Restore failed:', e);
    }
  }
  
  // Мониторинг изменений localStorage
  function monitorLocalStorage() {
    if (guardianActive) return;
    
    guardianActive = true;
    console.log('[FORM-GUARDIAN] Monitoring localStorage changes...');
    
    // Сохраняем текущие данные
    createBackups();
    
    // Периодически проверяем и восстанавливаем данные
    const restoreInterval = setInterval(() => {
      const formData = localStorage.getItem(FORM_DATA_KEY);
      if (!formData && (formDataBackup || localStorage.getItem(BACKUP_KEYS[0]))) {
        console.log('[FORM-GUARDIAN] Detected data loss, restoring...');
        restoreFormData();
      }
    }, 500);
    
    // Отложенное восстановление после загрузки страницы
    setTimeout(() => {
      restoreFormData();
    }, 1000);
    
    // Дополнительное восстановление через 3 секунды (после всех Clear-Site-Data)
    setTimeout(() => {
      restoreFormData();
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
    window.addEventListener('storage', function(e) {
      if (e.key === FORM_DATA_KEY && !e.newValue && formDataBackup) {
        console.log('[FORM-GUARDIAN] Storage event detected data loss, restoring...');
        setTimeout(restoreFormData, 100);
      }
    });
    
    console.log('[FORM-GUARDIAN] ✅ Guardian activated');
  }
  
  // Запускаем мониторинг
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorLocalStorage);
  } else {
    monitorLocalStorage();
  }
  
  // Запускаем немедленно
  setTimeout(monitorLocalStorage, 0);
  
})();