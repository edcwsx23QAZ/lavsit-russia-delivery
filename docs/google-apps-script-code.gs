/**
 * Google Apps Script для синхронизации Delivery CRM с Google Sheets
 * 
 * Инструкция по установке:
 * 1. Откройте вашу таблицу Google Sheets
 * 2. Extensions → Apps Script
 * 3. Вставьте этот код
 * 4. Сохраните (Ctrl+S)
 * 5. Deploy → New deployment → Web app
 * 6. Execute as: Me, Who has access: Anyone
 * 7. Скопируйте Web App URL и добавьте в .env.local как NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL
 */

// ⚠️ ВАЖНО: Замените на ID вашей таблицы
const SPREADSHEET_ID = '1lP2s2eTYWBqdKVsymlfBxDRioP_AiGxlTWGhYjiqBXk';
const SHEET_NAME = 'Доставки';
const HISTORY_SHEET_NAME = 'История изменений';
const HEADER_ROW = 1;

/**
 * Форматирование даты из ISO формата в DD.MM
 */
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Пробуем парсить как DD.MM
      const parts = dateString.split('.');
      if (parts.length >= 2) {
        return dateString; // Уже в формате DD.MM
      }
      return '';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  } catch (e) {
    return dateString;
  }
}

/**
 * Получение или создание листа
 */
function getOrCreateSheet(name) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(name);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  
  return sheet;
}

/**
 * Полная синхронизация всех заказов
 */
function syncAllOrders(ordersData) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAME);
    
    // Всегда проверяем и создаем/обновляем заголовки
    const headers = [
      'ID', 'Дата', '№ Заказа', 'REKL', 'ТК', 'Написали', 'Подтвердили',
      'Товары', 'ФСМ', 'Адрес', 'Контакт', 'Оплата', 'Время', 'Комментарий',
      'Отгрузили', 'Доставлен', 'Группа ID', 'Позиция в группе', 'Размер группы',
      'Время последнего изменения'
    ];
    
    // Проверяем, есть ли заголовки (читаем первую строку)
    let headersMatch = false;
    try {
      const existingHeader = sheet.getRange(HEADER_ROW, 1, 1, headers.length).getValues()[0];
      headersMatch = existingHeader && existingHeader.length === headers.length && 
                     existingHeader[0] === headers[0]; // Проверяем первый заголовок
    } catch (e) {
      // Если не удалось прочитать - значит заголовков нет
      headersMatch = false;
    }
    
    // Если заголовков нет или они не совпадают - создаем/обновляем
    if (!headersMatch || sheet.getLastRow() < HEADER_ROW) {
      const headerRange = sheet.getRange(HEADER_ROW, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f4f6');
      
      // Устанавливаем ширину столбцов (примерные значения)
      sheet.setColumnWidth(1, 100); // ID
      sheet.setColumnWidth(2, 60); // Дата
      sheet.setColumnWidth(3, 120); // № Заказа
      sheet.setColumnWidth(4, 60); // REKL
      sheet.setColumnWidth(5, 40); // ТК
      sheet.setColumnWidth(6, 60); // Написали
      sheet.setColumnWidth(7, 80); // Подтвердили
      sheet.setColumnWidth(8, 300); // Товары
      sheet.setColumnWidth(9, 100); // ФСМ
      sheet.setColumnWidth(10, 200); // Адрес
      sheet.setColumnWidth(11, 150); // Контакт
      sheet.setColumnWidth(12, 100); // Оплата
      sheet.setColumnWidth(13, 100); // Время
      sheet.setColumnWidth(14, 200); // Комментарий
      sheet.setColumnWidth(15, 60); // Отгрузили
      sheet.setColumnWidth(16, 60); // Доставлен
      sheet.setColumnWidth(17, 100); // Группа ID
      sheet.setColumnWidth(18, 100); // Позиция в группе
      sheet.setColumnWidth(19, 80); // Размер группы
      sheet.setColumnWidth(20, 180); // Время последнего изменения
    }
    
    // Очищаем все данные кроме заголовков
    const lastRow = sheet.getLastRow();
    if (lastRow > HEADER_ROW) {
      sheet.deleteRows(HEADER_ROW + 1, lastRow - HEADER_ROW);
    }
    
    // Подготавливаем данные для записи
    const values = ordersData.map(order => [
      order.id || '',
      formatDate(order.date) || '',
      order.orderNumber || '',
      order.reklType || '',
      order.tk ? 'ТК' : '',
      order.wrote ? '✓' : '',
      order.confirmed ? '✓' : '',
      order.products || '',
      order.fsm || '',
      order.address || '',
      order.contact || '',
      order.payment || '',
      order.time || '',
      order.comment || '',
      order.shipped ? '✓' : '',
      order.delivered ? '✓' : '',
      order.groupId || '',
      order.groupPosition || '',
      order.groupSize || '',
      new Date().toISOString()
    ]);
    
    // Записываем данные
    if (values.length > 0) {
      const dataRange = sheet.getRange(HEADER_ROW + 1, 1, values.length, values[0].length);
      dataRange.setValues(values);
      
      // Форматирование: выравнивание по центру для некоторых столбцов
      const centerColumns = [2, 4, 5, 6, 7, 15, 16]; // Дата, REKL, ТК, Написали, Подтвердили, Отгрузили, Доставлен
      centerColumns.forEach(col => {
        const range = sheet.getRange(HEADER_ROW + 1, col, values.length, 1);
        range.setHorizontalAlignment('center');
      });
    }
    
    return { 
      success: true, 
      rowsWritten: values.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in syncAllOrders:', error);
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * Запись истории изменений
 */
function logChange(changeData) {
  try {
    const sheet = getOrCreateSheet(HISTORY_SHEET_NAME);
    
    // Всегда проверяем и создаем/обновляем заголовки истории
    const headers = ['Время', 'Тип изменения', 'ID заказа', 'Поле', 'Старое значение', 'Новое значение'];
    
    // Проверяем, есть ли заголовки (читаем первую строку)
    let headersMatch = false;
    try {
      const existingHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      headersMatch = existingHeader && existingHeader.length === headers.length && 
                     existingHeader[0] === headers[0]; // Проверяем первый заголовок
    } catch (e) {
      // Если не удалось прочитать - значит заголовков нет
      headersMatch = false;
    }
    
    // Если заголовков нет или они не совпадают - создаем/обновляем
    if (!headersMatch || sheet.getLastRow() < 1) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f4f6');
      
      // Устанавливаем ширину столбцов
      sheet.setColumnWidth(1, 180); // Время
      sheet.setColumnWidth(2, 120); // Тип изменения
      sheet.setColumnWidth(3, 100); // ID заказа
      sheet.setColumnWidth(4, 100); // Поле
      sheet.setColumnWidth(5, 200); // Старое значение
      sheet.setColumnWidth(6, 200); // Новое значение
    }
    
    // Подготавливаем данные для записи
    const oldValueStr = changeData.oldValue !== undefined && changeData.oldValue !== null 
      ? String(changeData.oldValue).substring(0, 500) // Ограничиваем длину
      : '';
    const newValueStr = changeData.newValue !== undefined && changeData.newValue !== null
      ? String(changeData.newValue).substring(0, 500) // Ограничиваем длину
      : '';
    
    // Добавляем запись об изменении
    sheet.appendRow([
      changeData.timestamp || new Date().toISOString(),
      changeData.type || '',
      changeData.orderId || '',
      changeData.field || '',
      oldValueStr,
      newValueStr
    ]);
    
    return { 
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in logChange:', error);
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * HTTP endpoint для обработки запросов от приложения
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    let result;
    
    if (data.action === 'syncAll') {
      result = syncAllOrders(data.orders || []);
    } else if (data.action === 'logChange') {
      result = logChange(data.change || {});
    } else {
      result = { 
        success: false, 
        error: 'Unknown action: ' + (data.action || 'none')
      };
    }
    
    // Возвращаем результат с CORS заголовками
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Обработка OPTIONS запроса для CORS (если требуется)
 */
function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Тестовая функция для проверки работы скрипта
 * Запустите эту функцию вручную для проверки
 */
function testSync() {
  const testOrders = [
    {
      id: 'test-1',
      date: '2024-02-05',
      orderNumber: 'TEST-001',
      reklType: '',
      tk: false,
      wrote: true,
      confirmed: true,
      products: 'Тестовый товар',
      fsm: 'FSM-001',
      address: 'Тестовый адрес',
      contact: '+7 999 123-45-67',
      payment: 'Оплачено',
      time: '10:00 - 14:00',
      comment: 'Тестовый комментарий',
      shipped: false,
      delivered: false,
      groupId: undefined,
      groupPosition: undefined,
      groupSize: undefined
    }
  ];
  
  const result = syncAllOrders(testOrders);
  console.log('Test sync result:', result);
  return result;
}

