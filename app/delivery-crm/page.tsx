'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Truck,
  GripVertical,
  ChevronDown,
  ChevronUp,
  History,
  Download,
  Loader2,
  Calculator,
  Upload,
  Tag,
  MoreVertical,
  Palette,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { format, addDays, startOfToday, endOfYear, startOfYear, isBefore, isSameDay, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

interface DeliveryOrder {
  id: string
  date: string // ISO date string
  orderNumber: string
  wrote: boolean
  confirmed: boolean
  products: string
  fsm: string
  address: string
  contact: string
  payment: string
  time: string // Формат: "11:00 - 13:00" (слот времени)
  timeStart?: string // Начало слота (для сортировки)
  comment: string
  shipped: boolean
  delivered: boolean
  isEmpty: boolean // Флаг пустой строки
  tags?: string[] // Метки: ["REKL", "ТК"]
  rowColor?: string // Цвет строки (hex или название)
}

// Форматирование даты в "05.02" (ДД.ММ)
const formatDate = (dateString: string): string => {
  const date = parseISO(dateString)
  return format(date, 'dd.MM')
}

// Генерация дат от 01.01 текущего года до конца года
const generateDates = (): string[] => {
  const startDate = startOfYear(new Date())
  const endDate = endOfYear(new Date())
  const dates: string[] = []
  
  let currentDate = startDate
  while (currentDate <= endDate) {
    dates.push(format(currentDate, 'yyyy-MM-dd'))
    currentDate = addDays(currentDate, 1)
  }
  
  return dates
}

// Создание начальных данных
const createInitialOrders = (): DeliveryOrder[] => {
  const dates = generateDates()
  const orders: DeliveryOrder[] = []
  let orderCounter = 1
  
  dates.forEach((date) => {
    // 3 заполненные строки
    for (let i = 0; i < 3; i++) {
      orders.push({
        id: `${date}-${i}`,
        date,
        orderNumber: `ORD-${String(orderCounter).padStart(3, '0')}`,
        wrote: i === 0,
        confirmed: i < 2,
        products: `Товар ${orderCounter}`,
        fsm: `ФСМ-${String(orderCounter).padStart(3, '0')}`,
        address: `Адрес ${orderCounter}`,
        contact: `+7 (999) ${String(orderCounter).padStart(3, '0')}-${String(orderCounter).padStart(2, '0')}-${String(orderCounter).padStart(2, '0')}`,
        payment: i === 0 ? 'Оплачено' : 'Частично',
        time: `${9 + i}:00`,
        comment: i === 0 ? 'Комментарий' : '',
        shipped: i === 2,
        delivered: false,
        isEmpty: false,
      })
      orderCounter++
    }
    // 1 пустая строка
    orders.push({
      id: `${date}-empty`,
      date,
      orderNumber: '',
      wrote: false,
      confirmed: false,
      products: '',
      fsm: '',
      address: '',
      contact: '',
      payment: '',
      time: '',
      comment: '',
      shipped: false,
      delivered: false,
      isEmpty: true,
      tags: [],
      rowColor: undefined,
    })
  })
  
  return orders
}

// Подсчет заказов на день (исключая пустые)
const getOrdersCountForDate = (orders: DeliveryOrder[], date: string): number => {
  return orders.filter(order => order.date === date && !order.isEmpty).length
}

// Получение цвета для даты
const getDateColor = (count: number): string => {
  if (count >= 20) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
  } else if (count > 10) {
    // Градиент от желтого к красному
    const ratio = (count - 10) / 10 // 0 при 10, 1 при 20
    if (ratio < 0.5) {
      // От желтого к оранжевому
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
    } else {
      // От оранжевого к красному
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
    }
  }
  return ''
}

// Начальные ширины столбцов (в пикселях) - оптимизированы для экрана без горизонтальной прокрутки
const initialColumnWidths: Record<string, number> = {
  drag: 28,
  date: 55,
  orderNumber: 70,
  wrote: 55,
  confirmed: 70,
  products: 180,
  fsm: 60,
  address: 130,
  contact: 120,
  payment: 70,
  time: 95,
  comment: 100,
  shipped: 65,
  delivered: 70,
}

// Компонент для заголовка столбца
const ResizableTableHead = ({ columnKey, children, className = '', columnWidths }: { columnKey: string; children: React.ReactNode; className?: string; columnWidths: Record<string, number> }) => {
  return (
    <TableHead 
      className={`relative border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}
      style={{ 
        width: columnWidths[columnKey], 
        minWidth: columnWidths[columnKey], 
        maxWidth: columnWidths[columnKey]
      }}
    >
      <div className="flex items-center justify-center relative h-full">
        <div 
          className="flex-1 text-center" 
          style={{ 
            padding: '1px',
            fontSize: '0.75rem',
            lineHeight: '1.2',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            whiteSpace: 'normal'
          }}
        >
          {children}
        </div>
      </div>
    </TableHead>
  );
};

// Компонент для ячейки
const ResizableTableCell = ({ columnKey, children, className = '', columnWidths, ...props }: { columnKey: string; children: React.ReactNode; className?: string; columnWidths: Record<string, number>; [key: string]: any }) => {
  return (
    <TableCell 
      className={`border-r border-gray-200 dark:border-gray-700 p-0 relative ${className}`}
      style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey], maxWidth: columnWidths[columnKey] }}
      {...props}
    >
      <div className="w-full h-full px-0.5 py-0.5">
        {children}
      </div>
    </TableCell>
  );
};

export default function DeliveryCRMPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>(createInitialOrders)
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [daysToShow, setDaysToShow] = useState(14) // По умолчанию 2 недели (14 дней)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialColumnWidths)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)
  const [loadingBitrix, setLoadingBitrix] = useState<string | null>(null) // ID заказа, который загружается
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; orderId: string } | null>(null)
  const [tagMenu, setTagMenu] = useState<{ orderId: string; x: number; y: number } | null>(null)
  const editingCellRef = useRef<{ orderId: string; field: keyof DeliveryOrder } | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  
  const today = startOfToday()

  // Цвета для строк
  const rowColors = [
    { name: 'Без цвета', value: '' },
    { name: 'Красный', value: '#fee2e2' },
    { name: 'Оранжевый', value: '#fed7aa' },
    { name: 'Желтый', value: '#fef3c7' },
    { name: 'Зеленый', value: '#d1fae5' },
    { name: 'Голубой', value: '#dbeafe' },
    { name: 'Синий', value: '#dbeafe' },
    { name: 'Фиолетовый', value: '#e9d5ff' },
    { name: 'Розовый', value: '#fce7f3' },
    { name: 'Серый', value: '#f3f4f6' },
  ]

  // Варианты рекламаций (пока базовый список, можно расширить)
  const reklOptions = [
    'Повреждение при доставке',
    'Несоответствие заказу',
    'Брак',
    'Другое',
  ]

  // Парсинг времени на начало и конец слота
  const parseTimeSlot = (timeStr: string): { start: string; end: string } => {
    if (!timeStr) return { start: '', end: '' }
    
    // Пытаемся найти формат "11:00 - 13:00" или "11:00-13:00"
    const match = timeStr.match(/^(.+?)\s*[-—]\s*(.+)$/)
    if (match) {
      return { start: match[1].trim(), end: match[2].trim() }
    }
    
    // Если формат не найден, считаем что это только начало
    return { start: timeStr.trim(), end: '' }
  }

  // Обработка изменения начала времени с умным форматированием
  const handleTimeStartChange = (id: string, startValue: string, cursorPosition?: number) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    
    // Удаляем все нецифровые символы
    const digitsOnly = startValue.replace(/\D/g, '')
    
    // Форматируем как время (XX:XX)
    let formatted = digitsOnly
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.slice(0, 2) + ':' + digitsOnly.slice(2, 4)
    } else if (digitsOnly.length > 0) {
      formatted = digitsOnly
    }
    
    const { end } = parseTimeSlot(order.time)
    const newTime = end ? `${formatted} - ${end}` : formatted
    handleCellChange(id, 'time', newTime)
  }

  // Обработка изменения окончания времени с умным форматированием
  const handleTimeEndChange = (id: string, endValue: string, cursorPosition?: number) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    
    // Удаляем все нецифровые символы
    const digitsOnly = endValue.replace(/\D/g, '')
    
    // Форматируем как время (XX:XX)
    let formatted = digitsOnly
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.slice(0, 2) + ':' + digitsOnly.slice(2, 4)
    } else if (digitsOnly.length > 0) {
      formatted = digitsOnly
    }
    
    const { start } = parseTimeSlot(order.time)
    const newTime = start ? `${start} - ${formatted}` : formatted
    handleCellChange(id, 'time', newTime)
  }

  // Обработка добавления/удаления меток
  const handleTagToggle = (orderId: string, tag: string) => {
    setOrders(orders.map(order => {
      if (order.id === orderId) {
        const currentTags = order.tags || []
        const newTags = currentTags.includes(tag)
          ? currentTags.filter(t => t !== tag)
          : [...currentTags, tag]
        return { ...order, tags: newTags }
      }
      return order
    }))
  }

  // Обработка изменения цвета строки
  const handleRowColorChange = (orderId: string, color: string) => {
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { ...order, rowColor: color || undefined }
        : order
    ))
    setContextMenu(null)
  }

  // Получение цвета строки с учетом меток
  const getRowBackgroundColor = (order: DeliveryOrder): string => {
    // Если установлен цвет строки, используем его
    if (order.rowColor) {
      return order.rowColor
    }
    
    // Если есть метки, используем их цвета
    const tags = order.tags || []
    if (tags.includes('REKL')) {
      return '#fce7f3' // Бледно-розовый
    }
    if (tags.includes('ТК')) {
      return '#dbeafe' // Бледно-голубой
    }
    
    return ''
  }


  // Загрузка заказов из БД при инициализации
  useEffect(() => {
    const loadOrdersFromDB = async () => {
      if (isInitialized) return
      
      setIsLoadingOrders(true)
      try {
        // Сначала проверяем localStorage для быстрой загрузки
        const cachedOrders = localStorage.getItem('delivery-crm-orders')
        if (cachedOrders) {
          try {
            const parsed = JSON.parse(cachedOrders)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setOrders(parsed)
              setIsInitialized(true)
            }
          } catch (e) {
            console.error('Error parsing cached orders:', e)
          }
        }

        // Затем загружаем из БД
        const response = await fetch('/api/delivery-crm/orders?includeEmpty=true')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.orders && data.orders.length > 0) {
            // Преобразуем данные из БД в формат DeliveryOrder
            const dbOrders: DeliveryOrder[] = data.orders.map((o: any) => ({
              id: o.id,
              date: format(new Date(o.date), 'yyyy-MM-dd'),
              orderNumber: o.orderNumber || '',
              wrote: o.wrote || false,
              confirmed: o.confirmed || false,
              products: o.products || '',
              fsm: o.fsm || '',
              address: o.address || '',
              contact: o.contact || '',
              payment: o.payment || '',
              time: o.time || '',
              comment: o.comment || '',
              shipped: o.shipped || false,
              delivered: o.delivered || false,
              isEmpty: o.isEmpty || false,
              tags: Array.isArray(o.tags) ? o.tags : (o.tags ? [o.tags] : []),
              rowColor: o.rowColor || undefined,
            }))
            
            setOrders(dbOrders)
            // Сохраняем в localStorage
            localStorage.setItem('delivery-crm-orders', JSON.stringify(dbOrders))
          } else {
            // Если в БД нет заказов, загружаем данные из Google Sheets
            await loadFromGoogleSheets()
          }
        }
      } catch (error) {
        console.error('Error loading orders from DB:', error)
        // В случае ошибки используем данные из localStorage или начальные
        const cachedOrders = localStorage.getItem('delivery-crm-orders')
        if (cachedOrders) {
          try {
            const parsed = JSON.parse(cachedOrders)
            if (Array.isArray(parsed)) {
              setOrders(parsed)
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
      } finally {
        setIsLoadingOrders(false)
        setIsInitialized(true)
      }
    }

    loadOrdersFromDB()
  }, [isInitialized])

  // Функция загрузки данных из Google Sheets
  const loadFromGoogleSheets = async () => {
    try {
      // Пытаемся загрузить данные из Google Sheets через API
      // Используем spreadsheet ID из URL
      const spreadsheetId = '1Cvl-0P0uBoYupGGbZ2AG70S0VDyrAII8L0vNjUykOsI'
      const gid = '0' // Вкладка "Доставки"
      
      // Пытаемся получить данные через публичный CSV экспорт
      // Если файл не публичный, пользователь должен будет предоставить данные вручную
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
      
      try {
        const csvResponse = await fetch(csvUrl)
        if (csvResponse.ok) {
          const csvText = await csvResponse.text()
          const orders = parseGoogleSheetsCSV(csvText, 1622) // Начинаем со строки 1622
          
          if (orders.length > 0) {
            // Импортируем в БД
            const importResponse = await fetch('/api/delivery-crm/import-google-sheets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orders }),
            })
            
            if (importResponse.ok) {
              // Загружаем из БД после импорта
              const dbResponse = await fetch('/api/delivery-crm/orders?includeEmpty=true')
              if (dbResponse.ok) {
                const dbData = await dbResponse.json()
                if (dbData.success && dbData.orders && dbData.orders.length > 0) {
                  const dbOrders: DeliveryOrder[] = dbData.orders.map((o: any) => ({
                    id: o.id,
                    date: format(new Date(o.date), 'yyyy-MM-dd'),
                    orderNumber: o.orderNumber || '',
                    wrote: o.wrote || false,
                    confirmed: o.confirmed || false,
                    products: o.products || '',
                    fsm: o.fsm || '',
                    address: o.address || '',
                    contact: o.contact || '',
                    payment: o.payment || '',
                    time: o.time || '',
                    comment: o.comment || '',
              shipped: o.shipped || false,
              delivered: o.delivered || false,
              isEmpty: o.isEmpty || false,
              tags: Array.isArray(o.tags) ? o.tags : (o.tags ? [o.tags] : []),
              rowColor: o.rowColor || undefined,
            }))
            
            setOrders(dbOrders)
                  localStorage.setItem('delivery-crm-orders', JSON.stringify(dbOrders))
                  return
                }
              }
            }
          }
        }
      } catch (csvError) {
        console.log('Не удалось загрузить данные из Google Sheets напрямую. Используем начальные данные.')
      }
      
      // Если не удалось загрузить из Google Sheets, используем начальные данные
      const initialOrders = createInitialOrders()
      setOrders(initialOrders)
      localStorage.setItem('delivery-crm-orders', JSON.stringify(initialOrders))
    } catch (error) {
      console.error('Error loading from Google Sheets:', error)
      const initialOrders = createInitialOrders()
      setOrders(initialOrders)
      localStorage.setItem('delivery-crm-orders', JSON.stringify(initialOrders))
    }
  }

  // Парсинг CSV из Google Sheets
  // Структура столбцов: A=Дата, B=№ заказа, C=Написали, D=Подтвердил, E=Товар, F=ФСМ, G=Адрес, H=Контакт, I=Оплата, J=Время, K=Отгрузки, L=Доставлен
  const parseGoogleSheetsCSV = (csvText: string, startRow: number): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < startRow) return []
    
    // Пропускаем заголовки и строки до startRow
    const dataLines = lines.slice(startRow - 1)
    if (dataLines.length === 0) return []
    
    const orders: any[] = []
    
    // Прямой маппинг по индексам столбцов (A=0, B=1, C=2, и т.д.)
    for (let i = 1; i < dataLines.length; i++) {
      const values = parseCSVLine(dataLines[i])
      if (values.length === 0) continue
      
      const order: any = {}
      
      // A (0): Дата
      if (values[0] && values[0].trim()) {
        order.date = parseDateFromString(values[0])
      } else {
        // Если дата пустая, пропускаем строку
        continue
      }
      
      // B (1): № заказа
      order.orderNumber = values[1] || ''
      
      // C (2): Написали - описание товаров
      const wroteText = values[2] || ''
      
      // D (3): Подтвердил - может быть ФСМ или подтверждение
      const confirmedText = values[3] || ''
      
      // E (4): Товар
      const productText = values[4] || ''
      
      // Объединяем C (Написали) и E (Товар) в products
      order.products = [wroteText, productText].filter(t => t.trim()).join('\n')
      
      // F (5): ФСМ
      const fsmText = values[5] || ''
      order.fsm = fsmText || confirmedText || ''
      
      // G (6): Адрес
      order.address = values[6] || ''
      
      // H (7): Контакт
      order.contact = values[7] || ''
      
      // I (8): Оплата
      order.payment = values[8] || ''
      
      // J (9): Время
      order.time = values[9] || ''
      
      // K (10): Отгрузки (shipped)
      order.shipped = parseBooleanFromString(values[10])
      
      // L (11): Доставлен
      order.delivered = parseBooleanFromString(values[11])
      
      // Написали - если есть текст в столбце C, считаем что написали
      order.wrote = !!wroteText.trim()
      
      // Подтвердили - если есть текст в столбце D или F (ФСМ), считаем что подтвердили
      order.confirmed = !!confirmedText.trim() || !!fsmText.trim()
      
      // Комментарий - пустое поле, можно использовать для дополнительной информации
      order.comment = ''
      
      // Пропускаем пустые строки
      if (!order.orderNumber && !order.products && !order.address) {
        continue
      }
      
      orders.push(order)
    }
    
    return orders
  }

  const parseCSVLine = (line: string): string[] => {
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

  const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
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

  const parseDateFromString = (dateStr: string): string => {
    if (!dateStr || !dateStr.trim()) {
      return format(new Date(), 'yyyy-MM-dd')
    }

    // Формат DD.MM или DD.MM.YYYY
    const parts = dateStr.trim().split('.')
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()
      
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

    return format(new Date(), 'yyyy-MM-dd')
  }

  const parseBooleanFromString = (value: string): boolean => {
    if (!value) return false
    const lower = String(value).toLowerCase().trim()
    return lower === 'да' || lower === 'yes' || lower === 'true' || lower === '1' || 
           lower === '✓' || lower === 'v' || lower === '+' || lower === 'x' ||
           lower === 'checked' || lower === 'отмечено'
  }

  // Ручной импорт данных из Google Sheets
  const handleManualImport = async () => {
    if (!confirm('Импортировать данные из Google Sheets начиная со строки 1622? Это может занять некоторое время.')) {
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/delivery-crm/import-google-sheets-manual', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка импорта')
      }

      let message = `Импорт завершен!\nИмпортировано: ${data.imported}\nОбновлено: ${data.updated}\nВсего: ${data.total}\nОшибок: ${data.errors}`
      
      if (data.errorDetails && data.errorDetails.length > 0) {
        message += `\n\nПервые ошибки:\n`
        data.errorDetails.slice(0, 5).forEach((err: any, idx: number) => {
          message += `${idx + 1}. Строка ${err.row || 'N/A'}, Заказ: ${err.orderNumber || 'N/A'}\n   Ошибка: ${err.error || 'Unknown'}\n`
        })
        if (data.errorDetails.length > 5) {
          message += `\n... и еще ${data.errorDetails.length - 5} ошибок`
        }
      }
      
      alert(message)

      // Перезагружаем данные из БД
      const dbResponse = await fetch('/api/delivery-crm/orders?includeEmpty=true')
      if (dbResponse.ok) {
        const dbData = await dbResponse.json()
        if (dbData.success && dbData.orders && dbData.orders.length > 0) {
          const dbOrders: DeliveryOrder[] = dbData.orders.map((o: any) => ({
            id: o.id,
            date: format(new Date(o.date), 'yyyy-MM-dd'),
            orderNumber: o.orderNumber || '',
            wrote: o.wrote || false,
            confirmed: o.confirmed || false,
            products: o.products || '',
            fsm: o.fsm || '',
            address: o.address || '',
            contact: o.contact || '',
            payment: o.payment || '',
            time: o.time || '',
            comment: o.comment || '',
              shipped: o.shipped || false,
              delivered: o.delivered || false,
              isEmpty: o.isEmpty || false,
              tags: Array.isArray(o.tags) ? o.tags : (o.tags ? [o.tags] : []),
              rowColor: o.rowColor || undefined,
            }))
            
            setOrders(dbOrders)
          localStorage.setItem('delivery-crm-orders', JSON.stringify(dbOrders))
        }
      }
    } catch (error: any) {
      console.error('Error importing:', error)
      alert(`Ошибка импорта: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  // Закрытие контекстного меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null)
      }
      if (tagMenu) {
        setTagMenu(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu, tagMenu])

  // Синхронизация изменений с БД и localStorage
  useEffect(() => {
    if (!isInitialized) return

    // Сохраняем в localStorage при каждом изменении
    localStorage.setItem('delivery-crm-orders', JSON.stringify(orders))

    // Дебаунсинг для синхронизации с БД (чтобы не отправлять запрос при каждом изменении)
    const timeoutId = setTimeout(async () => {
      try {
        // Отправляем все заказы на сервер для синхронизации
        const response = await fetch('/api/delivery-crm/orders', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orders: orders.map(o => ({
              id: o.id,
              date: o.date,
              orderNumber: o.orderNumber,
              wrote: o.wrote,
              confirmed: o.confirmed,
              products: o.products,
              fsm: o.fsm,
              address: o.address,
              contact: o.contact,
              payment: o.payment,
              time: o.time,
              comment: o.comment,
              shipped: o.shipped,
              delivered: o.delivered,
              isEmpty: o.isEmpty,
              tags: o.tags || [],
              rowColor: o.rowColor || undefined,
            })),
          }),
        })

        if (!response.ok) {
          console.error('Error syncing orders to DB')
        }
      } catch (error) {
        console.error('Error syncing orders to DB:', error)
      }
    }, 2000) // Синхронизация через 2 секунды после последнего изменения

    return () => clearTimeout(timeoutId)
  }, [orders, isInitialized])

  // Парсинг времени для сортировки (извлекает начальное время из слота "11:00 - 13:00")
  const parseTimeForSort = (timeStr: string): number => {
    if (!timeStr) return 9999 // Пустые времена в конец
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/)
    if (match) {
      const hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      return hours * 60 + minutes
    }
    return 9999
  }

  // Группировка заказов по датам с сортировкой по времени (от ранних к поздним)
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, DeliveryOrder[]> = {}
    orders.forEach(order => {
      if (!grouped[order.date]) {
        grouped[order.date] = []
      }
      grouped[order.date].push(order)
    })
    // Сортируем каждую группу: сначала заполненные по времени, потом пустые
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (a.isEmpty && !b.isEmpty) return 1
        if (!a.isEmpty && b.isEmpty) return -1
        if (a.isEmpty && b.isEmpty) return 0
        
        // Сортируем по времени (от ранних к поздним)
        const timeA = parseTimeForSort(a.time)
        const timeB = parseTimeForSort(b.time)
        if (timeA !== timeB) {
          return timeA - timeB
        }
        
        // Если время одинаковое, сортируем по номеру заказа
        return (a.orderNumber || '').localeCompare(b.orderNumber || '')
      })
    })
    return grouped
  }, [orders])

  // Получение всех дат в порядке отображения с фильтрацией истории и будущих дат
  const allDates = useMemo(() => {
    const dates = Array.from(new Set(orders.map(o => o.date))).sort()
    
    // Разделяем на исторические и будущие даты
    const historicalDates = dates.filter(date => {
      const dateObj = parseISO(date)
      return isBefore(dateObj, today)
    })
    
    const futureDates = dates.filter(date => {
      const dateObj = parseISO(date)
      return !isBefore(dateObj, today) || isSameDay(dateObj, today)
    })
    
    // Ограничиваем количество показываемых дней вперед
    const limitedFutureDates = futureDates.slice(0, daysToShow)
    
    // Если история включена, добавляем исторические даты
    if (showHistory) {
      return [...historicalDates, ...limitedFutureDates]
    }
    
    return limitedFutureDates
  }, [orders, showHistory, today, daysToShow])
  
  // Проверяем, есть ли еще даты для показа
  const hasMoreDates = useMemo(() => {
    const allFutureDates = Array.from(new Set(orders.map(o => o.date)))
      .sort()
      .filter(date => {
        const dateObj = parseISO(date)
        return !isBefore(dateObj, today) || isSameDay(dateObj, today)
      })
    return allFutureDates.length > daysToShow
  }, [orders, today, daysToShow])
  
  const handleShowMore = () => {
    // Увеличиваем количество показываемых дней на месяц (30 дней)
    setDaysToShow(prev => prev + 30)
  }

  // Функция удаления строки
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту строку?')) {
      return
    }

    try {
      // Удаляем из локального состояния
      const updatedOrders = orders.filter(order => order.id !== orderId)
      setOrders(updatedOrders)

      // Удаляем из БД
      await fetch(`/api/delivery-crm/orders/${orderId}`, {
        method: 'DELETE',
      })

      // Обновляем localStorage
      localStorage.setItem('delivery-crm-orders', JSON.stringify(updatedOrders))
    } catch (error) {
      console.error('Ошибка при удалении заказа:', error)
      alert('Ошибка при удалении заказа')
    }

    setContextMenu(null)
  }

  // Загрузка заказа из Битрикса
  const handleLoadFromBitrix = async (orderId: string, targetOrderId?: string) => {
    if (!orderId.trim()) {
      alert('Введите ID заказа из Битрикса')
      return
    }

    setLoadingBitrix(orderId)
    try {
      const response = await fetch(`/api/bitrix/order/${orderId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки заказа')
      }

      const bitrixOrder = data.order

      // Преобразуем данные из БД в формат DeliveryOrder
      const newOrder: DeliveryOrder = {
        id: bitrixOrder.id,
        date: format(new Date(bitrixOrder.date), 'yyyy-MM-dd'),
        orderNumber: bitrixOrder.orderNumber || '',
        wrote: bitrixOrder.wrote || false,
        confirmed: bitrixOrder.confirmed || false,
        products: bitrixOrder.products || '',
        fsm: bitrixOrder.fsm || '',
        address: bitrixOrder.address || '',
        contact: bitrixOrder.contact || '',
        payment: bitrixOrder.payment || '',
        time: bitrixOrder.time || '',
        comment: bitrixOrder.comment || '',
        shipped: bitrixOrder.shipped || false,
        delivered: bitrixOrder.delivered || false,
        isEmpty: false,
        tags: [],
        rowColor: undefined,
      }

      // Обновляем заказы
      let updatedOrders: DeliveryOrder[]
      
      // Если указан targetOrderId, заменяем существующий заказ
      if (targetOrderId) {
        updatedOrders = orders.map(o => o.id === targetOrderId ? newOrder : o)
      } else {
        // Иначе добавляем новый заказ на нужную дату (или текущую)
        const orderDate = newOrder.date
        const dateOrders = orders.filter(o => o.date === orderDate)
        
        // Если есть пустая строка для этой даты, заменяем её
        const emptyRow = dateOrders.find(o => o.isEmpty)
        if (emptyRow) {
          updatedOrders = orders.map(o => o.id === emptyRow.id ? newOrder : o)
        } else {
          // Иначе добавляем в конец группы для этой даты
          const lastDateOrderIndex = orders.findIndex(o => 
            o.date === orderDate && 
            o === dateOrders[dateOrders.length - 1]
          )
          if (lastDateOrderIndex >= 0) {
            updatedOrders = [...orders]
            updatedOrders.splice(lastDateOrderIndex + 1, 0, newOrder)
          } else {
            // Если даты нет, просто добавляем
            updatedOrders = [...orders, newOrder]
          }
        }
      }

      // Создаем пустую строку для этой даты, если её нет
      const hasEmptyRow = updatedOrders.some(o => o.date === newOrder.date && o.isEmpty)
      if (!hasEmptyRow) {
        const newEmptyOrder: DeliveryOrder = {
          id: `${newOrder.date}-empty-${Date.now()}`,
          date: newOrder.date,
          orderNumber: '',
          wrote: false,
          confirmed: false,
          products: '',
          fsm: '',
          address: '',
          contact: '',
          payment: '',
          time: '',
          comment: '',
          shipped: false,
          delivered: false,
          isEmpty: true,
          tags: [],
          rowColor: undefined,
        }
        updatedOrders.push(newEmptyOrder)
      }

      setOrders(updatedOrders)
    } catch (error: any) {
      console.error('Error loading from Bitrix:', error)
      alert(`Ошибка загрузки заказа: ${error.message}`)
    } finally {
      setLoadingBitrix(null)
    }
  }

  const handleCheckboxChange = (id: string, field: keyof DeliveryOrder) => {
    setOrders(orders.map(order => 
      order.id === id 
        ? { ...order, [field]: !order[field] }
        : order
    ))
  }

  const handleCellChange = (id: string, field: keyof DeliveryOrder, value: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return

    const updated = { ...order, [field]: value, isEmpty: false }
    
    // Если это была пустая строка и теперь заполнена, создаем новую пустую
    if (order.isEmpty && value.trim() !== '') {
      const orderDate = order.date
      // Проверим, есть ли уже пустая строка для этой даты
      const hasEmptyRow = orders.some(o => o.date === orderDate && o.isEmpty && o.id !== id)
      
      if (!hasEmptyRow) {
        // Создаем новую пустую строку
        const newEmptyOrder: DeliveryOrder = {
          id: `${orderDate}-empty-${Date.now()}`,
          date: orderDate,
          orderNumber: '',
          wrote: false,
          confirmed: false,
          products: '',
          fsm: '',
          address: '',
          contact: '',
          payment: '',
          time: '',
          comment: '',
          shipped: false,
          delivered: false,
          isEmpty: true,
        }
        
        // Обновляем заказы: заменяем текущий и добавляем пустую в конец группы для этой даты
        const updatedOrders = orders.map(o => o.id === id ? updated : o)
        
        // Находим индекс последнего заказа для этой даты
        const dateOrders = updatedOrders.filter(o => o.date === orderDate)
        const lastDateOrderIndex = updatedOrders.findIndex(o => o.id === dateOrders[dateOrders.length - 1].id)
        
        // Вставляем пустую строку после последнего заказа для этой даты
        updatedOrders.splice(lastDateOrderIndex + 1, 0, newEmptyOrder)
        
        setOrders(updatedOrders)
        return
      }
    }
    
    // Обычное обновление
    setOrders(orders.map(o => o.id === id ? updated : o))
  }

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', orderId)
  }

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault()
    setDragOverDate(null)
    
    if (!draggedOrderId) return
    
    const draggedOrder = orders.find(o => o.id === draggedOrderId)
    if (!draggedOrder || draggedOrder.date === targetDate) {
      setDraggedOrderId(null)
      return
    }

    const oldDate = draggedOrder.date
    const isDraggedEmpty = draggedOrder.isEmpty

    // Обновляем дату заказа
    let updatedOrders = orders.map(order => 
      order.id === draggedOrderId 
        ? { ...order, date: targetDate }
        : order
    )

    // Если перемещаем не пустую строку, проверяем наличие пустой строки для исходной даты
    if (!isDraggedEmpty) {
      const oldDateOrders = updatedOrders.filter(o => o.date === oldDate && !o.isEmpty)
      const hasEmptyInOldDate = updatedOrders.some(o => o.date === oldDate && o.isEmpty)
      
      // Если в исходной дате нет пустой строки, создаем ее
      if (!hasEmptyInOldDate && oldDateOrders.length > 0) {
        const newEmptyOrder: DeliveryOrder = {
          id: `${oldDate}-empty-${Date.now()}`,
          date: oldDate,
          orderNumber: '',
          wrote: false,
          confirmed: false,
          products: '',
          fsm: '',
          address: '',
          contact: '',
          payment: '',
          time: '',
          comment: '',
          shipped: false,
          delivered: false,
          isEmpty: true,
        }
        updatedOrders.push(newEmptyOrder)
      }
    }

    // Проверяем наличие пустой строки для целевой даты
    const hasEmptyInTargetDate = updatedOrders.some(o => o.date === targetDate && o.isEmpty)
    if (!hasEmptyInTargetDate) {
      const newEmptyOrder: DeliveryOrder = {
        id: `${targetDate}-empty-${Date.now()}`,
        date: targetDate,
        orderNumber: '',
        wrote: false,
        confirmed: false,
        products: '',
        fsm: '',
        address: '',
        contact: '',
        payment: '',
        time: '',
        comment: '',
        shipped: false,
        delivered: false,
        isEmpty: true,
      }
      updatedOrders.push(newEmptyOrder)
    }

    setOrders(updatedOrders)
    setDraggedOrderId(null)
  }

  const handleDragEnd = () => {
    setDraggedOrderId(null)
    setDragOverDate(null)
  }

  // Обработчики для изменения размера столбцов
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(columnKey)
    setResizeStartX(e.clientX)
    setResizeStartWidth(columnWidths[columnKey])
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return

      const diff = e.clientX - resizeStartX
      const newWidth = Math.max(50, resizeStartWidth + diff) // Минимальная ширина 50px
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
    }

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth])

  return (
    <React.Fragment>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-6 h-6" />
                  Delivery CRM
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Система управления заказами доставки
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Calculator className="w-3 h-3 mr-1.5" />
                  Открыть калькулятор
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1.5" />
                )}
                {isImporting ? 'Импорт...' : 'Импорт из Google Sheets'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-3 h-3 mr-1.5" />
                {showHistory ? 'Скрыть историю' : 'Показать историю'}
                {showHistory ? (
                  <ChevronUp className="w-3 h-3 ml-1.5" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="w-full mx-auto">
          {/* Orders Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Заказы доставки</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table ref={tableRef} className="table-fixed w-full">
                  <TableHeader className="sticky top-[80px] z-10 bg-white dark:bg-gray-900">
                  <TableRow>
                    <ResizableTableHead columnKey="drag" className="text-center" columnWidths={columnWidths}></ResizableTableHead>
                    <ResizableTableHead columnKey="date" className="text-center" columnWidths={columnWidths}>
                      Дата
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="orderNumber" className="text-center" columnWidths={columnWidths}>
                      № заказа
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="wrote" className="text-center" columnWidths={columnWidths}>
                      Написали
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="confirmed" className="text-center" columnWidths={columnWidths}>
                      Подтвердили
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="products" className="text-center" columnWidths={columnWidths}>
                      Товары
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="fsm" className="text-center" columnWidths={columnWidths}>
                      ФСМ
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="address" className="text-center" columnWidths={columnWidths}>
                      Адрес
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="contact" className="text-center" columnWidths={columnWidths}>
                      Контакт
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="payment" className="text-center" columnWidths={columnWidths}>
                      Оплата
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="time" className="text-center" columnWidths={columnWidths}>
                      Время
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="comment" className="text-center" columnWidths={columnWidths}>
                      Комментарий
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="shipped" className="text-center" columnWidths={columnWidths}>
                      Отгрузили
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="delivered" className="text-center" columnWidths={columnWidths}>
                      Доставлен
                    </ResizableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDates.map((date, dateIndex) => {
                    const dateOrders = ordersByDate[date] || []
                    const ordersCount = getOrdersCountForDate(orders, date)
                    const dateColor = getDateColor(ordersCount)
                    const isDragOver = dragOverDate === date
                    const isFirstDate = dateIndex === 0
                    
                    return (
                      <React.Fragment key={date}>
                        {dateOrders.map((order, index) => {
                      const isFirstInDate = index === 0
                      const isDragging = draggedOrderId === order.id
                      // Добавляем жирную границу сверху для первой строки каждого дня (кроме первого дня)
                      const hasTopBorder = isFirstInDate && !isFirstDate

                      return (
                        <TableRow
                          key={order.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, order.id)}
                          onDragEnd={handleDragEnd}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({ x: e.clientX, y: e.clientY, orderId: order.id })
                          }}
                          className={`${isDragging ? 'opacity-50' : ''} ${isDragOver && !isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${hasTopBorder ? 'border-t-4 border-gray-600 dark:border-gray-500' : ''} cursor-move`}
                          style={{ 
                            height: order.isEmpty ? '2.5rem' : 'auto',
                            minHeight: '2.5rem',
                            backgroundColor: getRowBackgroundColor(order) || undefined
                          }}
                        >
                          <ResizableTableCell columnKey="drag" className="text-center">
                            <div className="flex items-center justify-center h-full">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnKey="date"
                            columnWidths={columnWidths}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`text-center align-middle font-medium ${isFirstInDate ? dateColor : ''} ${isFirstInDate ? 'font-bold' : ''}`}
                          >
                            {isFirstInDate ? formatDate(date) : ''}
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="orderNumber" className="text-center align-middle" columnWidths={columnWidths}>
                            <div className="relative h-full w-full flex flex-col" style={{ minHeight: '2.5rem' }}>
                              {/* Номер заказа сверху */}
                              <div 
                                className="flex items-start justify-center w-full pt-1"
                                style={{ 
                                  minHeight: '1.5rem'
                                }}
                              >
                                <Textarea
                                  value={order.orderNumber}
                                  onChange={(e) => handleCellChange(order.id, 'orderNumber', e.target.value)}
                                  placeholder="№ заказа"
                                  className="border-0 bg-transparent p-0 h-auto w-full resize-none focus-visible:ring-0 text-center"
                                  rows={1}
                                  style={{ 
                                    height: order.isEmpty ? '1.5rem' : 'auto',
                                    minHeight: '1.5rem',
                                    overflow: 'visible',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    textAlign: 'center',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.3',
                                    fontWeight: '500'
                                  }}
                                  onInput={(e) => {
                                    if (order.isEmpty) return
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    const newHeight = Math.max(24, target.scrollHeight)
                                    target.style.height = `${newHeight}px`
                                  }}
                                  onFocus={() => editingCellRef.current = { orderId: order.id, field: 'orderNumber' }}
                                />
                              </div>
                              {/* Кнопки внизу в одну строчку, выровнены по высоте */}
                              <div 
                                className="flex items-center justify-center gap-1 flex-shrink-0 mt-auto"
                                style={{ height: '18px', paddingBottom: '2px' }}
                              >
                                <div className="relative">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={`h-4 px-1 text-[0.65rem] ${(order.tags || []).includes('REKL') ? 'bg-pink-200 dark:bg-pink-800' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if ((order.tags || []).includes('REKL')) {
                                        handleTagToggle(order.id, 'REKL')
                                      } else {
                                        setTagMenu({ orderId: order.id, x: e.clientX, y: e.clientY })
                                      }
                                    }}
                                    title="Рекламация"
                                  >
                                    REKL
                                  </Button>
                                  {tagMenu && tagMenu.orderId === order.id && (
                                    <div
                                      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg p-2"
                                      style={{
                                        left: `${tagMenu.x}px`,
                                        top: `${tagMenu.y}px`,
                                        minWidth: '200px',
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="text-xs font-semibold mb-2 px-2 py-1">Тип рекламации</div>
                                      {reklOptions.map((option, idx) => (
                                        <button
                                          key={idx}
                                          className="w-full px-3 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                          onClick={() => {
                                            handleTagToggle(order.id, 'REKL')
                                            // Добавляем тип рекламации в комментарий
                                            const currentComment = order.comment || ''
                                            const newComment = currentComment 
                                              ? `${currentComment}\nРекламация: ${option}`
                                              : `Рекламация: ${option}`
                                            handleCellChange(order.id, 'comment', newComment)
                                            setTagMenu(null)
                                          }}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`h-4 px-1 text-[0.65rem] ${(order.tags || []).includes('ТК') ? 'bg-blue-200 dark:bg-blue-800' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleTagToggle(order.id, 'ТК')
                                  }}
                                  title="Отгрузка в ТК"
                                >
                                  ТК
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 flex-shrink-0"
                                  onClick={() => {
                                    const orderId = order.orderNumber.trim()
                                    if (orderId) {
                                      handleLoadFromBitrix(orderId, order.id)
                                    } else {
                                      const inputId = prompt('Введите ID заказа из Битрикса:')
                                      if (inputId) {
                                        handleLoadFromBitrix(inputId, order.id)
                                      }
                                    }
                                  }}
                                  disabled={loadingBitrix === order.orderNumber}
                                  title="Загрузить из Битрикса"
                                >
                                  {loadingBitrix === order.orderNumber ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <Download className="w-2.5 h-2.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="wrote"
                            columnWidths={columnWidths}
                            className="text-center align-middle cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'wrote')
                            }}
                          >
                            <Checkbox
                              checked={order.wrote}
                              onCheckedChange={() => handleCheckboxChange(order.id, 'wrote')}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="confirmed"
                            columnWidths={columnWidths}
                            className="text-center align-middle cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'confirmed')
                            }}
                          >
                            <Checkbox
                              checked={order.confirmed}
                              onCheckedChange={() => handleCheckboxChange(order.id, 'confirmed')}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="products" className="align-middle" columnWidths={columnWidths}>
                            <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '2.5rem' }}>
                              <Textarea
                                value={order.products}
                                onChange={(e) => handleCellChange(order.id, 'products', e.target.value)}
                                placeholder="Товары"
                                className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0"
                                rows={1}
                                style={{ 
                                  height: order.isEmpty ? '1.5rem' : 'auto',
                                  minHeight: '1.5rem',
                                  overflow: 'visible',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  verticalAlign: 'middle',
                                  lineHeight: '1.5rem'
                                }}
                                onInput={(e) => {
                                  if (order.isEmpty) return // Не изменяем высоту для пустых строк
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  const newHeight = Math.max(24, target.scrollHeight)
                                  target.style.height = `${newHeight}px`
                                  // Обновляем высоту строки если нужно
                                  const row = target.closest('tr')
                                  if (row) {
                                    row.style.height = 'auto'
                                    row.style.minHeight = `${newHeight + 16}px`
                                  }
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="fsm" className="text-center align-middle" columnWidths={columnWidths}>
                            <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '2.5rem' }}>
                              <Textarea
                                value={order.fsm}
                                onChange={(e) => handleCellChange(order.id, 'fsm', e.target.value)}
                                placeholder="ФСМ"
                                className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-center"
                                rows={1}
                                style={{ 
                                  height: order.isEmpty ? '1.5rem' : 'auto',
                                  minHeight: '1.5rem',
                                  overflow: 'visible',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  textAlign: 'center',
                                  fontSize: '0.7rem',
                                  lineHeight: '1.5rem'
                                }}
                                onInput={(e) => {
                                  if (order.isEmpty) return
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  target.style.height = `${target.scrollHeight}px`
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="address" className="align-middle" columnWidths={columnWidths}>
                            <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '2.5rem' }}>
                              <Textarea
                                value={order.address}
                                onChange={(e) => handleCellChange(order.id, 'address', e.target.value)}
                                placeholder="Адрес"
                                className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0"
                                rows={1}
                                style={{ 
                                  height: order.isEmpty ? '1.5rem' : 'auto',
                                  minHeight: '1.5rem',
                                  overflow: 'visible',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  verticalAlign: 'middle',
                                  lineHeight: '1.5rem'
                                }}
                                onInput={(e) => {
                                  if (order.isEmpty) return
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  const newHeight = Math.max(24, target.scrollHeight)
                                  target.style.height = `${newHeight}px`
                                  // Обновляем высоту строки если нужно
                                  const row = target.closest('tr')
                                  if (row) {
                                    row.style.height = 'auto'
                                    row.style.minHeight = `${newHeight + 16}px`
                                  }
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="contact" className="text-center align-middle" columnWidths={columnWidths}>
                            <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '2.5rem' }}>
                              <Textarea
                                value={order.contact}
                                onChange={(e) => handleCellChange(order.id, 'contact', e.target.value)}
                                placeholder="Контакт"
                                className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-center"
                                rows={1}
                                style={{ 
                                  height: order.isEmpty ? '1.5rem' : 'auto',
                                  minHeight: '1.5rem',
                                  overflow: 'visible',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  textAlign: 'center',
                                  fontSize: '0.7rem',
                                  lineHeight: '1.5rem'
                                }}
                                onInput={(e) => {
                                  if (order.isEmpty) return
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  target.style.height = `${target.scrollHeight}px`
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="payment"
                            columnWidths={columnWidths}
                            className={`text-center align-middle ${
                              order.payment.toLowerCase().includes('оплачено') || order.payment.toLowerCase().includes('оплачен')
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : order.payment.trim() === ''
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}
                          >
                            <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '2.5rem' }}>
                              <Textarea
                                value={order.payment}
                                onChange={(e) => handleCellChange(order.id, 'payment', e.target.value)}
                                placeholder="Оплата"
                                className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-center"
                                rows={1}
                                style={{ 
                                  height: order.isEmpty ? '1.5rem' : 'auto',
                                  minHeight: '1.5rem',
                                  overflow: 'visible',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  textAlign: 'center',
                                  lineHeight: '1.5rem'
                                }}
                                onInput={(e) => {
                                  if (order.isEmpty) return
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  target.style.height = `${target.scrollHeight}px`
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="time" className="text-center align-middle" columnWidths={columnWidths}>
                            <div className="flex flex-col gap-0.5 items-center justify-center h-full" style={{ minHeight: '2.5rem' }}>
                              <Input
                                value={parseTimeSlot(order.time).start}
                                onChange={(e) => {
                                  const value = e.target.value
                                  const cursorPos = e.target.selectionStart || 0
                                  handleTimeStartChange(order.id, value, cursorPos)
                                  // Восстанавливаем позицию курсора после форматирования
                                  setTimeout(() => {
                                    const input = e.target
                                    const newValue = parseTimeSlot(orders.find(o => o.id === order.id)?.time || '').start
                                    let newCursorPos = cursorPos
                                    // Если добавился двоеточие, сдвигаем курсор
                                    if (newValue.length > value.length && newValue.includes(':') && !value.includes(':')) {
                                      newCursorPos = Math.min(cursorPos + 1, newValue.length)
                                    }
                                    input.setSelectionRange(newCursorPos, newCursorPos)
                                  }, 0)
                                }}
                                onKeyDown={(e) => {
                                  // Позволяем удаление и навигацию
                                  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                    return
                                  }
                                  // Разрешаем только цифры
                                  if (!/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault()
                                  }
                                }}
                                placeholder="11:00"
                                className="border-0 bg-transparent p-0 h-5 text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                                style={{ 
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  lineHeight: '1.2',
                                  width: '100%'
                                }}
                              />
                              <Input
                                value={parseTimeSlot(order.time).end}
                                onChange={(e) => {
                                  const value = e.target.value
                                  const cursorPos = e.target.selectionStart || 0
                                  handleTimeEndChange(order.id, value, cursorPos)
                                  // Восстанавливаем позицию курсора после форматирования
                                  setTimeout(() => {
                                    const input = e.target
                                    const newValue = parseTimeSlot(orders.find(o => o.id === order.id)?.time || '').end
                                    let newCursorPos = cursorPos
                                    // Если добавился двоеточие, сдвигаем курсор
                                    if (newValue.length > value.length && newValue.includes(':') && !value.includes(':')) {
                                      newCursorPos = Math.min(cursorPos + 1, newValue.length)
                                    }
                                    input.setSelectionRange(newCursorPos, newCursorPos)
                                  }, 0)
                                }}
                                onKeyDown={(e) => {
                                  // Позволяем удаление и навигацию
                                  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                    return
                                  }
                                  // Разрешаем только цифры
                                  if (!/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault()
                                  }
                                }}
                                placeholder="13:00"
                                className="border-0 bg-transparent p-0 h-5 text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                                style={{ 
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  lineHeight: '1.2',
                                  width: '100%'
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="comment" className="align-middle" columnWidths={columnWidths}>
                            <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '2.5rem' }}>
                              <Textarea
                                value={order.comment}
                                onChange={(e) => handleCellChange(order.id, 'comment', e.target.value)}
                                placeholder="Комментарий"
                                className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-center"
                                rows={1}
                                style={{ 
                                  height: order.isEmpty ? '1.5rem' : 'auto',
                                  minHeight: '1.5rem',
                                  overflow: 'visible',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  lineHeight: '1.5rem'
                                }}
                                onInput={(e) => {
                                  if (order.isEmpty) return
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  const newHeight = Math.max(24, target.scrollHeight)
                                  target.style.height = `${newHeight}px`
                                  // Обновляем высоту строки если нужно
                                  const row = target.closest('tr')
                                  if (row) {
                                    row.style.height = 'auto'
                                    row.style.minHeight = `${newHeight + 16}px`
                                  }
                                }}
                              />
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="shipped"
                            columnWidths={columnWidths}
                            className="text-center align-middle cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'shipped')
                            }}
                          >
                            <Checkbox
                              checked={order.shipped}
                              onCheckedChange={() => handleCheckboxChange(order.id, 'shipped')}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="delivered"
                            columnWidths={columnWidths}
                            className="text-center align-middle cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'delivered')
                            }}
                          >
                            <Checkbox
                              checked={order.delivered}
                              onCheckedChange={() => handleCheckboxChange(order.id, 'delivered')}
                            />
                          </ResizableTableCell>
                        </TableRow>
                        )
                      })}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Кнопка "Показать далее" внизу страницы */}
        {hasMoreDates && (
          <div className="mt-4 pb-4 flex justify-center">
            <Button
              variant="outline"
              onClick={handleShowMore}
              className="w-full sm:w-auto"
            >
              Показать далее
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Контекстное меню для изменения цвета строки */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg p-2"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              minWidth: '150px',
            }}
          >
            <div className="text-xs font-semibold mb-2 px-2 py-1">Действия</div>
            <button
              className="w-full px-3 py-2 text-xs rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-left text-red-600 dark:text-red-400 mb-2"
              onClick={() => handleDeleteOrder(contextMenu.orderId)}
            >
              Удалить строку
            </button>
            <div className="text-xs font-semibold mb-2 px-2 py-1 border-t border-gray-200 dark:border-gray-700 pt-2">Цвет строки</div>
            <div className="grid grid-cols-2 gap-1">
              {rowColors.map((color) => (
                <button
                  key={color.value}
                  className="px-3 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left flex items-center gap-2"
                  onClick={() => handleRowColorChange(contextMenu.orderId, color.value)}
                  style={{
                    backgroundColor: color.value || undefined,
                  }}
                >
                  {color.value && (
                    <div
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: color.value }}
                    />
                  )}
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      </div>
    </React.Fragment>
  )
}
