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
  time: string
  comment: string
  shipped: boolean
  delivered: boolean
  isEmpty: boolean // Флаг пустой строки
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

// Начальные ширины столбцов (в пикселях)
const initialColumnWidths: Record<string, number> = {
  drag: 40,
  date: 80,
  orderNumber: 100,
  wrote: 80,
  confirmed: 100,
  products: 400,
  fsm: 80,
  address: 200,
  contact: 180,
  payment: 100,
  time: 80,
  comment: 200,
  shipped: 100,
  delivered: 100,
}

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
  const editingCellRef = useRef<{ orderId: string; field: keyof DeliveryOrder } | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  
  const today = startOfToday()

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

      alert(`Импорт завершен!\nИмпортировано: ${data.imported}\nОбновлено: ${data.updated}\nВсего: ${data.total}\nОшибок: ${data.errors}`)

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

  // Группировка заказов по датам с сортировкой (пустые в конце)
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, DeliveryOrder[]> = {}
    orders.forEach(order => {
      if (!grouped[order.date]) {
        grouped[order.date] = []
      }
      grouped[order.date].push(order)
    })
    // Сортируем каждую группу: сначала заполненные, потом пустые
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (a.isEmpty && !b.isEmpty) return 1
        if (!a.isEmpty && b.isEmpty) return -1
        return 0
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

  React.useEffect(() => {
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

  // Компонент для заголовка столбца с возможностью изменения размера
  const ResizableTableHead = ({ columnKey, children, className = '' }: { columnKey: string; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`relative border-r border-gray-200 dark:border-gray-700 ${className}`}
      style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey], maxWidth: columnWidths[columnKey] }}
    >
      <div className="flex items-center justify-center relative h-full">
        <div className="flex-1 px-1 text-center break-words overflow-hidden" style={{ wordWrap: 'break-word', hyphens: 'auto' }}>
          {children}
        </div>
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400 dark:hover:bg-blue-500 active:bg-blue-600 dark:active:bg-blue-700 transition-colors z-10"
          onMouseDown={(e) => handleResizeStart(e, columnKey)}
          style={{ 
            marginRight: '-1px',
            width: '3px'
          }}
          title="Перетащите для изменения ширины столбца"
        />
      </div>
    </TableHead>
  )

  // Компонент для ячейки с фиксированной шириной
  const ResizableTableCell = ({ columnKey, children, className = '', ...props }: { columnKey: string; children: React.ReactNode; className?: string; [key: string]: any }) => (
    <TableCell 
      className={`border-r border-gray-200 dark:border-gray-700 p-0 relative ${className}`}
      style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey], maxWidth: columnWidths[columnKey] }}
      {...props}
    >
      <div className="w-full h-full px-0.5 py-0.5">
        {children}
      </div>
      {/* Ползунок на разделительной линии */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400 dark:hover:bg-blue-500 active:bg-blue-600 dark:active:bg-blue-700 transition-colors z-10"
        onMouseDown={(e) => handleResizeStart(e, columnKey)}
        style={{ 
          marginRight: '-1px',
          width: '3px'
        }}
        title="Перетащите для изменения ширины столбца"
      />
    </TableCell>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-8 h-8" />
                  Delivery CRM
                </h1>
                <p className="text-muted-foreground mt-1">
                  Система управления заказами доставки
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline">
                  <Calculator className="w-4 h-4 mr-2" />
                  Открыть калькулятор
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleManualImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isImporting ? 'Импорт...' : 'Импорт из Google Sheets'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'Скрыть историю' : 'Показать историю'}
                {showHistory ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Заказы доставки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table ref={tableRef} className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <ResizableTableHead columnKey="drag" className="text-center"></ResizableTableHead>
                    <ResizableTableHead columnKey="date" className="text-center">Дата</ResizableTableHead>
                    <ResizableTableHead columnKey="orderNumber" className="text-center">№ заказа</ResizableTableHead>
                    <ResizableTableHead columnKey="wrote" className="text-center" style={{ fontSize: '0.75rem', lineHeight: '1.2', padding: '0.5rem 0.25rem' }}>
                      <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}>Написали</div>
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="confirmed" className="text-center" style={{ fontSize: '0.75rem', lineHeight: '1.2', padding: '0.5rem 0.25rem' }}>
                      <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}>Подтвердили</div>
                    </ResizableTableHead>
                    <ResizableTableHead columnKey="products" className="text-center">Товары</ResizableTableHead>
                    <ResizableTableHead columnKey="fsm" className="text-center">ФСМ</ResizableTableHead>
                    <ResizableTableHead columnKey="address" className="text-center">Адрес</ResizableTableHead>
                    <ResizableTableHead columnKey="contact" className="text-center">Контакт</ResizableTableHead>
                    <ResizableTableHead columnKey="payment" className="text-center">Оплата</ResizableTableHead>
                    <ResizableTableHead columnKey="time" className="text-center">Время</ResizableTableHead>
                    <ResizableTableHead columnKey="comment" className="text-center">Комментарий</ResizableTableHead>
                    <ResizableTableHead columnKey="shipped" className="text-center">Отгрузили</ResizableTableHead>
                    <ResizableTableHead columnKey="delivered" className="text-center">Доставлен</ResizableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDates.map((date, dateIndex) => {
                    const dateOrders = ordersByDate[date] || []
                    const ordersCount = getOrdersCountForDate(orders, date)
                    const dateColor = getDateColor(ordersCount)
                    const isDragOver = dragOverDate === date
                    const isFirstDate = dateIndex === 0

                    return dateOrders.map((order, index) => {
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
                          className={`${isDragging ? 'opacity-50' : ''} ${isDragOver && !isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${hasTopBorder ? 'border-t-4 border-gray-600 dark:border-gray-500' : ''} cursor-move`}
                          style={{ height: 'auto' }}
                        >
                          <ResizableTableCell columnKey="drag">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnKey="date"
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`text-center font-medium ${isFirstInDate ? dateColor : ''} ${isFirstInDate ? 'font-bold' : ''}`}
                          >
                            {isFirstInDate ? formatDate(date) : ''}
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="orderNumber" className="text-center">
                            <div className="flex items-center gap-1">
                              <Textarea
                                value={order.orderNumber}
                                onChange={(e) => handleCellChange(order.id, 'orderNumber', e.target.value)}
                                placeholder="№ заказа"
                                className="border-0 bg-transparent p-0 h-auto min-h-[2rem] flex-1 resize-none focus-visible:ring-0 overflow-hidden text-center"
                                rows={1}
                                style={{ 
                                  height: 'auto',
                                  overflow: 'hidden',
                                  wordWrap: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  textAlign: 'center'
                                }}
                                onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                              onFocus={() => editingCellRef.current = { orderId: order.id, field: 'orderNumber' }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
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
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                            </Button>
                            </div>
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="wrote"
                            className="text-center cursor-pointer"
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
                            className="text-center cursor-pointer"
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
                          <ResizableTableCell columnKey="products" className="align-top">
                            <Textarea
                              value={order.products}
                              onChange={(e) => handleCellChange(order.id, 'products', e.target.value)}
                              placeholder="Товары"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="fsm" className="text-center">
                            <Textarea
                              value={order.fsm}
                              onChange={(e) => handleCellChange(order.id, 'fsm', e.target.value)}
                              placeholder="ФСМ"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden text-center"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                textAlign: 'center'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="address" className="align-top">
                            <Textarea
                              value={order.address}
                              onChange={(e) => handleCellChange(order.id, 'address', e.target.value)}
                              placeholder="Адрес"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="contact" className="text-center">
                            <Textarea
                              value={order.contact}
                              onChange={(e) => handleCellChange(order.id, 'contact', e.target.value)}
                              placeholder="Контакт"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden text-center"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                textAlign: 'center'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="payment"
                            className={`text-center ${
                              order.payment.toLowerCase().includes('оплачено') || order.payment.toLowerCase().includes('оплачен')
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : order.payment.trim() === ''
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}
                          >
                            <Textarea
                              value={order.payment}
                              onChange={(e) => handleCellChange(order.id, 'payment', e.target.value)}
                              placeholder="Оплата"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden text-center"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                textAlign: 'center'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="time" className="text-center">
                            <Textarea
                              value={order.time}
                              onChange={(e) => handleCellChange(order.id, 'time', e.target.value)}
                              placeholder="Время"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden text-center"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                textAlign: 'center'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell columnKey="comment" className="align-top">
                            <Textarea
                              value={order.comment}
                              onChange={(e) => handleCellChange(order.id, 'comment', e.target.value)}
                              placeholder="Комментарий"
                              className="border-0 bg-transparent p-0 h-auto min-h-[2rem] w-full resize-none focus-visible:ring-0 overflow-hidden"
                              rows={1}
                              style={{ 
                                height: 'auto',
                                overflow: 'hidden',
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${target.scrollHeight}px`
                              }}
                            />
                          </ResizableTableCell>
                          <ResizableTableCell 
                            columnKey="shipped"
                            className="text-center cursor-pointer"
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
                            className="text-center cursor-pointer"
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
                    })
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {hasMoreDates && (
            <div className="flex justify-center p-4 border-t">
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
        </Card>
      </div>
    </div>
  )
}
