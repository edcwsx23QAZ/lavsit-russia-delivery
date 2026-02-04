/**
 * Импорт данных из Google Sheets
 * 
 * Для использования:
 * 1. Сделайте Google Sheets файл публичным для чтения
 * 2. Или используйте Google Sheets API с ключом
 */

export interface GoogleSheetsOrder {
  date: string // DD.MM или DD.MM.YYYY
  orderNumber: string
  wrote: boolean
  confirmed: boolean
  products: string
  fsm: string
  address: string
  contact: string
  payment: string
  time: string
  comment: string
  shipped: boolean
  delivered: boolean
}

/**
 * Парсинг даты из формата DD.MM или DD.MM.YYYY
 */
export function parseDate(dateStr: string, defaultYear?: number): string {
  if (!dateStr || !dateStr.trim()) {
    const today = new Date()
    return format(today, 'yyyy-MM-dd')
  }

  const parts = dateStr.trim().split('.')
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parts[2] ? parseInt(parts[2], 10) : (defaultYear || new Date().getFullYear())
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return format(date, 'yyyy-MM-dd')
      }
    }
  }

  // Попытка парсинга как ISO строки
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return format(parsed, 'yyyy-MM-dd')
  }

  // Если не удалось распарсить, возвращаем сегодняшнюю дату
  const today = new Date()
  return format(today, 'yyyy-MM-dd')
}

/**
 * Парсинг булевого значения
 */
export function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value
  if (!value) return false
  const lower = String(value).toLowerCase().trim()
  return lower === 'да' || lower === 'yes' || lower === 'true' || lower === '1' || 
         lower === '✓' || lower === 'v' || lower === '+' || lower === 'x' ||
         lower === 'checked' || lower === 'отмечено'
}

/**
 * Загрузка данных из Google Sheets через публичный CSV экспорт
 */
export async function loadFromGoogleSheetsCSV(
  spreadsheetId: string,
  gid: string = '0',
  startRow: number = 1622
): Promise<GoogleSheetsOrder[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets: ${response.statusText}`)
    }

    const csvText = await response.text()
    const lines = csvText.split('\n')
    
    // Пропускаем заголовки и строки до startRow
    const dataLines = lines.slice(startRow - 1)
    
    // Парсим CSV (простой парсер)
    const orders: GoogleSheetsOrder[] = []
    const headers = parseCSVLine(dataLines[0] || '')
    
    for (let i = 1; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue
      
      const values = parseCSVLine(line)
      if (values.length === 0) continue
      
      // Маппинг столбцов (нужно настроить в зависимости от реальных названий)
      const order: Partial<GoogleSheetsOrder> = {}
      
      // Ищем столбцы по названиям
      const dateIndex = findColumnIndex(headers, ['Дата', 'дата', 'Date', 'date'])
      const orderNumberIndex = findColumnIndex(headers, ['№ заказа', 'номер заказа', 'Order', 'order'])
      const wroteIndex = findColumnIndex(headers, ['Написали', 'написали', 'Wrote'])
      const confirmedIndex = findColumnIndex(headers, ['Подтвердили', 'подтвердили', 'Confirmed'])
      const productsIndex = findColumnIndex(headers, ['Товары', 'товары', 'Products', 'products'])
      const fsmIndex = findColumnIndex(headers, ['ФСМ', 'fsm', 'FSM'])
      const addressIndex = findColumnIndex(headers, ['Адрес', 'адрес', 'Address', 'address'])
      const contactIndex = findColumnIndex(headers, ['Контакт', 'контакт', 'Contact', 'contact'])
      const paymentIndex = findColumnIndex(headers, ['Оплата', 'оплата', 'Payment', 'payment'])
      const timeIndex = findColumnIndex(headers, ['Время', 'время', 'Time', 'time'])
      const commentIndex = findColumnIndex(headers, ['Комментарий', 'комментарий', 'Comment', 'comment'])
      const shippedIndex = findColumnIndex(headers, ['Отгрузили', 'отгрузили', 'Shipped'])
      const deliveredIndex = findColumnIndex(headers, ['Доставлен', 'доставлен', 'Delivered'])
      
      if (dateIndex >= 0 && values[dateIndex]) {
        order.date = parseDate(values[dateIndex])
      }
      if (orderNumberIndex >= 0) order.orderNumber = values[orderNumberIndex] || ''
      if (wroteIndex >= 0) order.wrote = parseBoolean(values[wroteIndex])
      if (confirmedIndex >= 0) order.confirmed = parseBoolean(values[confirmedIndex])
      if (productsIndex >= 0) order.products = values[productsIndex] || ''
      if (fsmIndex >= 0) order.fsm = values[fsmIndex] || ''
      if (addressIndex >= 0) order.address = values[addressIndex] || ''
      if (contactIndex >= 0) order.contact = values[contactIndex] || ''
      if (paymentIndex >= 0) order.payment = values[paymentIndex] || ''
      if (timeIndex >= 0) order.time = values[timeIndex] || ''
      if (commentIndex >= 0) order.comment = values[commentIndex] || ''
      if (shippedIndex >= 0) order.shipped = parseBoolean(values[shippedIndex])
      if (deliveredIndex >= 0) order.delivered = parseBoolean(values[deliveredIndex])
      
      // Пропускаем пустые строки
      if (!order.orderNumber && !order.products && !order.address) {
        continue
      }
      
      // Если нет даты, используем сегодняшнюю
      if (!order.date) {
        order.date = format(new Date(), 'yyyy-MM-dd')
      }
      
      orders.push(order as GoogleSheetsOrder)
    }
    
    return orders
  } catch (error) {
    console.error('Error loading from Google Sheets:', error)
    throw error
  }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current.trim())
  return values
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    for (const name of possibleNames) {
      if (header === name.toLowerCase().trim() || header.includes(name.toLowerCase().trim())) {
        return i
      }
    }
  }
  return -1
}

function format(date: Date, formatStr: string): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return formatStr
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
}


