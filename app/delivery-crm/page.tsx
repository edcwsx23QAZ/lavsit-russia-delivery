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
  Calculator,
  Upload,
  Loader2,
  Plus,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, addDays, subDays, startOfToday, parseISO } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeliveryOrder {
  id: string
  date: string // ISO date string
  orderNumber: string
  reklType?: string // Тип рекламации, если установлен REKL
  tk: boolean // Флаг ТК
  wrote: boolean
  confirmed: boolean
  products: string
  fsm: string
  address: string
  contact: string
  payment: string
  time: string // Формат: "11:00 - 13:00" (слот времени)
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
  const startDate = new Date(new Date().getFullYear(), 0, 1) // 01.01 текущего года
  const endDate = new Date(new Date().getFullYear(), 11, 31) // 31.12 текущего года
  const dates: string[] = []
  
  let currentDate = startDate
  while (currentDate <= endDate) {
    dates.push(format(currentDate, 'yyyy-MM-dd'))
    currentDate = addDays(currentDate, 1)
  }
  
  return dates
}

// Создание начальных данных (заполнение с 01.01)
const createInitialOrders = (): DeliveryOrder[] => {
  const dates = generateDates()
  const orders: DeliveryOrder[] = []
  let orderCounter = 1
  
  dates.forEach((date) => {
    // 3 заполненные строки на каждый день
    for (let i = 0; i < 3; i++) {
      orders.push({
        id: `${date}-${i}`,
        date,
        orderNumber: `OR${String(orderCounter).padStart(3, '0')}`,
        reklType: undefined,
        tk: false,
        wrote: i === 0,
        confirmed: i < 2,
        products: `Товар ${orderCounter}`,
        fsm: `ФСМ-${String(orderCounter).padStart(3, '0')}`,
        address: `Адрес ${orderCounter}`,
        contact: `+7 (999) ${String(orderCounter).padStart(3, '0')}-${String(orderCounter).padStart(2, '0')}-${String(orderCounter).padStart(2, '0')}`,
        payment: i === 0 ? 'Оплачено' : 'Частично',
        time: i === 0 ? '9:00 - 13:00' : i === 1 ? '11:00 - 13:00' : '11:00 - 13:00',
        comment: i === 0 ? 'Комментарий' : '',
        shipped: i === 2,
        delivered: false,
        isEmpty: false,
      })
      orderCounter++
    }
  })
  
  return orders
}

// Варианты рекламаций
const reklOptions = [
  'Повреждение при доставке',
  'Несоответствие заказу',
  'Брак',
  'Другое',
]

// Ширины столбцов (в пикселях) - оптимизированы для видимости всей таблицы
const columnWidths: Record<string, number> = {
  drag: 15,
  date: 30,
  orderNumber: 60,
  wrote: 30,
  confirmed: 30,
  products: 240,
  fsm: 70,
  address: 150,
  contact: 120,
  payment: 70,
  time: 60,
  comment: 165,
  shipped: 30,
  delivered: 30,
}

// Загрузка данных из localStorage
const loadOrdersFromStorage = (): DeliveryOrder[] => {
  if (typeof window === 'undefined') return createInitialOrders()
  try {
    const saved = localStorage.getItem('delivery-crm-orders')
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.length > 0 ? parsed : createInitialOrders()
    }
  } catch (error) {
    console.error('Error loading orders from localStorage:', error)
  }
  return createInitialOrders()
}

// Сохранение данных в localStorage
const saveOrdersToStorage = (orders: DeliveryOrder[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('delivery-crm-orders', JSON.stringify(orders))
  } catch (error) {
    console.error('Error saving orders to localStorage:', error)
  }
}

export default function DeliveryCRMPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>(loadOrdersFromStorage)
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [daysToShow, setDaysToShow] = useState(8) // Сегодня + 7 дней = 8 дней
  const [daysBack, setDaysBack] = useState(0) // Количество дней назад для показа
  const [showExpandDialog, setShowExpandDialog] = useState(false)
  const [reklMenu, setReklMenu] = useState<{ orderId: string; x: number; y: number } | null>(null)
  const [headerHeight, setHeaderHeight] = useState(80)
  const tableRef = useRef<HTMLTableElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  
  const today = startOfToday()
  const isInitialMount = useRef(true)

  // Сохранение в localStorage при изменении orders (кроме первой загрузки)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    saveOrdersToStorage(orders)
  }, [orders])

  // Измерение высоты хэдера
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight
        setHeaderHeight(height)
      }
    }
    
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => window.removeEventListener('resize', updateHeaderHeight)
  }, [])

  // #region agent log - измерение и синхронизация ширины столбцов
  useEffect(() => {
    const measureAndSyncColumnWidths = () => {
      // Измеряем заголовки
      const headerContainer = document.querySelector('[class*="sticky z-50"]') as HTMLElement
      if (!headerContainer) return
      
      const headerDivs = headerContainer.querySelectorAll('div[style*="width"]')
      const headerWidths: Record<string, number> = {}
      const headerData: any[] = []
      
      headerDivs.forEach((div, index) => {
        const el = div as HTMLElement
        const computedStyle = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'fsm', 'address', 'contact', 'payment', 'time', 'comment', 'shipped', 'delivered']
        const colName = columnNames[index] || `col${index}`
        
        headerWidths[colName] = rect.width
        headerData.push({
          colName,
          offsetWidth: el.offsetWidth,
          clientWidth: el.clientWidth,
          rectWidth: rect.width,
          computedWidth: computedStyle.width,
          borderRight: computedStyle.borderRightWidth,
          paddingLeft: computedStyle.paddingLeft,
          paddingRight: computedStyle.paddingRight,
          boxSizing: computedStyle.boxSizing
        })
      })
      
      // Измеряем ячейки таблицы
      const table = tableRef.current
      if (!table) return
      
      const firstRow = table.querySelector('tbody tr')
      if (!firstRow) return
      
      const cells = firstRow.querySelectorAll('td')
      const cellWidths: Record<string, number> = {}
      const cellData: any[] = []
      
      cells.forEach((cell, index) => {
        const el = cell as HTMLElement
        const computedStyle = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'fsm', 'address', 'contact', 'payment', 'time', 'comment', 'shipped', 'delivered']
        const colName = columnNames[index] || `col${index}`
        
        cellWidths[colName] = rect.width
        cellData.push({
          colName,
          offsetWidth: el.offsetWidth,
          clientWidth: el.clientWidth,
          rectWidth: rect.width,
          computedWidth: computedStyle.width,
          borderRight: computedStyle.borderRightWidth,
          paddingLeft: computedStyle.paddingLeft,
          paddingRight: computedStyle.paddingRight,
          boxSizing: computedStyle.boxSizing
        })
      })
      
      // Жестко привязываем ширину заголовков к ширине ячеек
      // Сначала синхронизируем colgroup с текущей шириной ячеек
      const colgroup = table.querySelector('colgroup')
      if (colgroup && firstRow) {
        const cols = colgroup.querySelectorAll('col')
        const measuredCells = firstRow.querySelectorAll('td')
        cols.forEach((col, index) => {
          if (measuredCells[index]) {
            const cellEl = measuredCells[index] as HTMLElement
            const cellRect = cellEl.getBoundingClientRect()
            const el = col as HTMLElement
            el.style.width = `${cellRect.width}px`
          }
        })
      }
      
      // Ждем применения стилей и переизмеряем ячейки, затем устанавливаем ширину заголовков
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (firstRow && headerDivs.length === cells.length) {
            const remeasuredCells = firstRow.querySelectorAll('td')
            remeasuredCells.forEach((cell, index) => {
              const cellEl = cell as HTMLElement
              const cellRect = cellEl.getBoundingClientRect()
              const cellWidth = cellRect.width
              
              // Устанавливаем ширину соответствующего заголовка равной ширине ячейки
              const headerDiv = headerDivs[index] as HTMLElement
              if (headerDiv) {
                headerDiv.style.width = `${cellWidth}px`
                headerDiv.style.minWidth = `${cellWidth}px`
                headerDiv.style.maxWidth = `${cellWidth}px`
              }
            })
            
            // Финальное переизмерение для логирования
            requestAnimationFrame(() => {
              if (firstRow) {
                const finalCells = firstRow.querySelectorAll('td')
                finalCells.forEach((cell, index) => {
                  const el = cell as HTMLElement
                  const rect = el.getBoundingClientRect()
                  const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'fsm', 'address', 'contact', 'payment', 'time', 'comment', 'shipped', 'delivered']
                  const colName = columnNames[index] || `col${index}`
                  cellWidths[colName] = rect.width
                })
              }
              
              // Переизмеряем заголовки
              headerDivs.forEach((div, index) => {
                const el = div as HTMLElement
                const rect = el.getBoundingClientRect()
                const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'fsm', 'address', 'contact', 'payment', 'time', 'comment', 'shipped', 'delivered']
                const colName = columnNames[index] || `col${index}`
                headerWidths[colName] = rect.width
              })
              
              // Сравниваем ширины после синхронизации
              const comparisons: any[] = []
              Object.keys(headerWidths).forEach(colName => {
                const headerW = headerWidths[colName]
                const cellW = cellWidths[colName]
                const diff = headerW - cellW
                comparisons.push({
                  colName,
                  headerWidth: headerW,
                  cellWidth: cellW,
                  difference: diff,
                  expectedWidth: columnWidths[colName]
                })
              })
              
              fetch('http://127.0.0.1:7243/ingest/8ab1f4de-87e7-4df6-9295-7afa67d5d9f6', {
        method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'app/delivery-crm/page.tsx:measureAndSyncColumnWidths',
                  message: 'Column width measurements and sync',
                  data: {
                    headerWidths,
                    cellWidths,
                    comparisons,
                    headerDetails: headerData,
                    cellDetails: cellData,
                    columnWidthsConfig: columnWidths,
                    synced: true
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  runId: 'post-fix',
                  hypothesisId: 'F'
                })
              }).catch(() => {})
            })
          }
        })
      })
    }
    
    // Запускаем измерение после рендеринга
    const timeoutId = setTimeout(measureAndSyncColumnWidths, 100)
    window.addEventListener('resize', measureAndSyncColumnWidths)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', measureAndSyncColumnWidths)
    }
  }, [])
  // #endregion

  // Получение дат для отображения (включая дни назад и вперед)
  const visibleDates = useMemo(() => {
    const dates: string[] = []
    // Добавляем дни назад (от сегодня в прошлое)
    for (let i = daysBack; i > 0; i--) {
      const date = subDays(today, i)
      dates.push(format(date, 'yyyy-MM-dd'))
    }
    // Добавляем дни вперед (от сегодня в будущее)
    for (let i = 0; i < daysToShow; i++) {
      const date = addDays(today, i)
      dates.push(format(date, 'yyyy-MM-dd'))
    }
    return dates.sort() // Сортируем по дате
  }, [today, daysToShow, daysBack])

  // Группировка заказов по датам
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, DeliveryOrder[]> = {}
    visibleDates.forEach(date => {
      grouped[date] = orders.filter(order => order.date === date)
    })
    return grouped
  }, [orders, visibleDates])

  // Проверка, есть ли еще даты для показа
  const hasMoreDates = useMemo(() => {
    const allDates = Array.from(new Set(orders.map(o => o.date))).sort()
    const lastVisibleDate = visibleDates[visibleDates.length - 1]
    const lastVisibleDateIndex = allDates.indexOf(lastVisibleDate)
    return lastVisibleDateIndex >= 0 && lastVisibleDateIndex < allDates.length - 1
  }, [orders, visibleDates])
  
  const handleShowMore = () => {
    setDaysToShow(prev => prev + 30)
  }

  const handleExpandPrevious = () => {
    if (daysBack > 0) {
      // Скрыть предыдущие дни
      setDaysBack(0)
    } else {
      // Показать диалог для раскрытия
      setShowExpandDialog(true)
    }
  }

  const handleExpand30Days = () => {
    setDaysBack(30)
    setShowExpandDialog(false)
  }

  const handleExpandAll = () => {
    // Находим все даты с заказами
    const allDatesWithOrders = Array.from(
      new Set(orders.filter(o => !o.isEmpty).map(o => o.date))
    ).sort()
    
    if (allDatesWithOrders.length > 0) {
      const earliestDate = parseISO(allDatesWithOrders[0])
      const daysDiff = Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))
      setDaysBack(Math.max(daysDiff, 0))
    }
    setShowExpandDialog(false)
  }

  // Обработка drag-n-drop
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', orderId)
  }

  const handleDragOver = (e: React.DragEvent, date: string, index?: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
    if (index !== undefined) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, targetDate: string, targetIndex?: number) => {
    e.preventDefault()
    setDragOverDate(null)
    setDragOverIndex(null)
    
    if (!draggedOrderId) return
    
    const draggedOrder = orders.find(o => o.id === draggedOrderId)
    if (!draggedOrder) return

    // Если дата не изменилась и индекс тот же, ничего не делаем
    if (draggedOrder.date === targetDate) {
      setDraggedOrderId(null)
      return
    }

    // Обновляем дату заказа
    setOrders(orders.map(order => 
      order.id === draggedOrderId 
        ? { ...order, date: targetDate }
        : order
    ))
    setDraggedOrderId(null)
  }

  const handleDragEnd = () => {
    setDraggedOrderId(null)
    setDragOverDate(null)
  }

  // Обработка изменений
  const handleCellChange = (id: string, field: keyof DeliveryOrder, value: any) => {
    setOrders(orders.map(order => 
      order.id === id 
        ? { ...order, [field]: value, isEmpty: false }
        : order
    ))
  }

  const handleCheckboxChange = (id: string, field: keyof DeliveryOrder) => {
    setOrders(orders.map(order => 
      order.id === id 
        ? { ...order, [field]: !order[field] }
        : order
    ))
  }

  // Обработка REKL
  const handleReklClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation()
    const order = orders.find(o => o.id === orderId)
    if (order?.reklType) {
      // Если уже есть REKL, убираем его
      handleCellChange(orderId, 'reklType', undefined)
    } else {
      // Показываем меню выбора типа
      setReklMenu({ orderId, x: e.clientX, y: e.clientY })
    }
  }

  const handleReklTypeSelect = (orderId: string, reklType: string) => {
    handleCellChange(orderId, 'reklType', reklType)
    setReklMenu(null)
  }

  // Обработка ТК
  const handleTkToggle = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    handleCellChange(orderId, 'tk', !order?.tk)
  }

  // Получение цвета строки (если ТК включен)
  const getRowBackgroundColor = (order: DeliveryOrder): string => {
    const hasRekl = !!order.reklType
    const hasTk = order.tk
    
    if (hasRekl && hasTk) {
      // Градиент: верхняя половина розовая, нижняя голубая
      return 'linear-gradient(to bottom, #fce7f3 0%, #fce7f3 50%, #dbeafe 50%, #dbeafe 100%)'
    } else if (hasRekl) {
      return '#fce7f3' // Бледно-розовый
    } else if (hasTk) {
      return '#dbeafe' // Бледно-голубой
    }
    return ''
  }

  // Парсинг времени на начало и конец слота
  const parseTimeSlot = (timeStr: string): { start: string; end: string } => {
    if (!timeStr) return { start: '', end: '' }
    
    const match = timeStr.match(/^(.+?)\s*[-—]\s*(.+)$/)
    if (match) {
      return { start: match[1].trim(), end: match[2].trim() }
    }
    
    return { start: timeStr.trim(), end: '' }
  }

  // Обработка изменения времени
  const handleTimeStartChange = (id: string, startValue: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    
    const digitsOnly = startValue.replace(/\D/g, '')
    let formatted = digitsOnly
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.slice(0, 2) + ':' + digitsOnly.slice(2, 4)
    }
    
    const { end } = parseTimeSlot(order.time)
    const newTime = end ? `${formatted} - ${end}` : formatted
    handleCellChange(id, 'time', newTime)
  }

  const handleTimeEndChange = (id: string, endValue: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    
    const digitsOnly = endValue.replace(/\D/g, '')
    let formatted = digitsOnly
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.slice(0, 2) + ':' + digitsOnly.slice(2, 4)
    }
    
    const { start } = parseTimeSlot(order.time)
    const newTime = start ? `${start} - ${formatted}` : formatted
    handleCellChange(id, 'time', newTime)
  }

  // Добавление пустой строки в конец дня
  const handleAddEmptyRow = (date: string) => {
    const newOrder: DeliveryOrder = {
      id: `empty-${Date.now()}-${Math.random()}`,
      date: date,
        orderNumber: '',
        wrote: false,
        confirmed: false,
        products: '',
        fsm: '',
        address: '',
        contact: '',
      payment: 'Не оплачено',
        time: '',
        comment: '',
        shipped: false,
        delivered: false,
      tk: false,
        isEmpty: true,
      }
    setOrders([...orders, newOrder])
  }

  // Удаление строки
  const handleDeleteRow = (orderId: string) => {
    setOrders(orders.filter(order => order.id !== orderId))
  }

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reklMenu) {
        setReklMenu(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [reklMenu])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed Header */}
      <div ref={headerRef} className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
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
              <Button variant="outline" size="sm" onClick={handleExpandPrevious}>
                {daysBack > 0 ? 'Скрыть предыдущие' : 'Раскрыть предыдущие'}
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
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Заказы доставки</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border" style={{ overflow: 'visible' }}>
                {/* Заголовки столбцов над таблицей */}
                <div className="sticky z-50 bg-white dark:bg-gray-900 border-b shadow-sm" style={{ top: `${headerHeight}px` }}>
                  <div className="flex w-full" style={{ boxSizing: 'border-box' }}>
                    <div style={{ width: columnWidths.drag, minWidth: columnWidths.drag, maxWidth: columnWidths.drag, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700"> </div>
                    <div style={{ width: columnWidths.date, minWidth: columnWidths.date, maxWidth: columnWidths.date, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Дата</div>
                    <div style={{ width: columnWidths.orderNumber, minWidth: columnWidths.orderNumber, maxWidth: columnWidths.orderNumber, flexShrink: 0, boxSizing: 'border-box', paddingTop: '10px' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-base leading-tight whitespace-nowrap">№ Заказа</div>
                    <div style={{ width: columnWidths.wrote, minWidth: columnWidths.wrote, maxWidth: columnWidths.wrote, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-[0.65rem] leading-tight">Напи-<br/>сали</div>
                    <div style={{ width: columnWidths.confirmed, minWidth: columnWidths.confirmed, maxWidth: columnWidths.confirmed, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-[0.65rem] leading-tight">Подтве-<br/>рдили</div>
                    <div style={{ width: columnWidths.products, minWidth: columnWidths.products, maxWidth: columnWidths.products, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Товары</div>
                    <div style={{ width: columnWidths.fsm, minWidth: columnWidths.fsm, maxWidth: columnWidths.fsm, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">ФСМ</div>
                    <div style={{ width: columnWidths.address, minWidth: columnWidths.address, maxWidth: columnWidths.address, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Адрес</div>
                    <div style={{ width: columnWidths.contact, minWidth: columnWidths.contact, maxWidth: columnWidths.contact, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Контакт</div>
                    <div style={{ width: columnWidths.payment, minWidth: columnWidths.payment, maxWidth: columnWidths.payment, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Оплачено</div>
                    <div style={{ width: columnWidths.time, minWidth: columnWidths.time, maxWidth: columnWidths.time, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Время</div>
                    <div style={{ width: columnWidths.comment, minWidth: columnWidths.comment, maxWidth: columnWidths.comment, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Комментарии</div>
                    <div style={{ width: columnWidths.shipped, minWidth: columnWidths.shipped, maxWidth: columnWidths.shipped, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-[0.65rem] leading-tight">Отгру-<br/>зили</div>
                    <div style={{ width: columnWidths.delivered, minWidth: columnWidths.delivered, maxWidth: columnWidths.delivered, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 text-[0.65rem] leading-tight">Доста-<br/>влен</div>
                  </div>
                </div>
                <Table ref={tableRef} className="w-full border-collapse" style={{ tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: 0 }}>
                  <colgroup>
                    <col style={{ width: columnWidths.drag - 1 }} />
                    <col style={{ width: columnWidths.date - 1 }} />
                    <col style={{ width: columnWidths.orderNumber - 1 }} />
                    <col style={{ width: columnWidths.wrote - 1 }} />
                    <col style={{ width: columnWidths.confirmed - 1 }} />
                    <col style={{ width: columnWidths.products - 1 }} />
                    <col style={{ width: columnWidths.fsm - 1 }} />
                    <col style={{ width: columnWidths.address - 1 }} />
                    <col style={{ width: columnWidths.contact - 1 }} />
                    <col style={{ width: columnWidths.payment - 1 }} />
                    <col style={{ width: columnWidths.time - 1 }} />
                    <col style={{ width: columnWidths.comment - 1 }} />
                    <col style={{ width: columnWidths.shipped - 1 }} />
                    <col style={{ width: columnWidths.delivered }} />
                  </colgroup>
                <TableBody>
                    {visibleDates.map((date, dateIndex) => {
                    const dateOrders = ordersByDate[date] || []
                    const isDragOver = dragOverDate === date
                    const isFirstDate = dateIndex === 0
                    
                    return (
                      <React.Fragment key={date}>
                        {dateOrders.map((order, index) => {
                          const isFirstInDate = index === 0
                          const isLastInDate = index === dateOrders.length - 1
                          const isDragging = draggedOrderId === order.id
                          const hasTopBorder = isFirstInDate && !isFirstDate

                          return (
                            <TableRow
                              key={order.id}
                          onDragOver={(e) => {
                            e.preventDefault()
                            handleDragOver(e, date, index)
                          }}
                          onDrop={(e) => handleDrop(e, date, index)}
                          className={`${isDragging ? 'opacity-50' : ''} ${dragOverDate === date && dragOverIndex === index ? 'bg-blue-100 dark:bg-blue-900/40' : ''} ${hasTopBorder ? 'border-t-4 border-gray-600 dark:border-gray-500' : ''}`}
                          style={{ 
                            background: getRowBackgroundColor(order) || undefined
                          }}
                            >
                                {/* Ползунок для drag-n-drop */}
                                <TableCell className="text-center border-r border-gray-200 dark:border-gray-700 py-2 px-0" style={{ boxSizing: 'border-box' }}>
                                <div 
                                  className="flex items-center justify-center h-full cursor-move"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, order.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                                </TableCell>

                                {/* Дата */}
                                <TableCell
                                  style={{ boxSizing: 'border-box' }}
                                onDragOver={(e) => handleDragOver(e, date, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, date, index)}
                                  className={`text-center align-middle font-medium border-r border-gray-200 dark:border-gray-700 py-2 px-3 ${isFirstInDate ? 'font-bold' : ''} ${dragOverDate === date && dragOverIndex === index ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
                              >
                                {isFirstInDate ? (
                                  <div className="w-full text-center" style={{ marginLeft: '-10px' }}>{formatDate(date)}</div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    {isLastInDate && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleAddEmptyRow(date)}
                                        title="Добавить пустую строку"
                                      >
                                        +
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleDeleteRow(order.id)}
                                      title="Удалить строку"
                                    >
                                      -
                                    </Button>
                                  </div>
                                )}
                                </TableCell>

                                {/* Номер заказа + REKL + ТК */}
                                <TableCell className="text-center align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-3" style={{ boxSizing: 'border-box', position: 'relative' }}>
                                  <div className="flex flex-col items-center justify-center gap-1 h-full">
                                    <Textarea
                                  value={order.orderNumber}
                                  onChange={(e) => {
                                    handleCellChange(order.id, 'orderNumber', e.target.value)
                                    e.target.style.height = 'auto'
                                    e.target.style.height = `${e.target.scrollHeight}px`
                                  }}
                                  placeholder="№ заказа"
                                      className="border-0 bg-transparent p-0 h-auto w-full resize-none focus-visible:ring-0 text-center text-sm font-medium"
                                  style={{ 
                                    minHeight: 'auto',
                                    height: 'auto',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.5',
                                    paddingTop: '16px',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  />
                                    {/* Кнопки REKL и ТК */}
                                    <div className="flex items-center justify-center gap-1" style={{ marginTop: '-25px' }}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                        className={`h-5 px-2 text-[0.65rem] ${order.reklType ? 'bg-pink-200 dark:bg-pink-800' : ''}`}
                                        onClick={(e) => handleReklClick(e, order.id)}
                                        title={order.reklType || 'Рекламация'}
                                  >
                                    REKL
                                  </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                        className={`h-5 px-2 text-[0.65rem] ${order.tk ? 'bg-blue-200 dark:bg-blue-800' : ''}`}
                                        onClick={() => handleTkToggle(order.id)}
                                  title="Отгрузка в ТК"
                                >
                                  ТК
                                </Button>
                              </div>
                            </div>
                                </TableCell>

                                {/* Написали */}
                                <TableCell 
                                  style={{ boxSizing: 'border-box' }}
                            className="text-center align-middle cursor-pointer border-r border-gray-200 dark:border-gray-700 py-2 px-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'wrote')
                            }}
                          >
                            <div className="flex items-center justify-center h-full">
                              <Checkbox
                                checked={order.wrote}
                                onCheckedChange={() => handleCheckboxChange(order.id, 'wrote')}
                              />
                            </div>
                                </TableCell>

                                {/* Подтвердили */}
                                <TableCell 
                                  style={{ boxSizing: 'border-box' }}
                            className="text-center align-middle cursor-pointer border-r border-gray-200 dark:border-gray-700 py-2 px-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'confirmed')
                            }}
                          >
                            <div className="flex items-center justify-center h-full">
                              <Checkbox
                                checked={order.confirmed}
                                onCheckedChange={() => handleCheckboxChange(order.id, 'confirmed')}
                              />
                            </div>
                                </TableCell>

                                {/* Товары */}
                                <TableCell 
                                  className="align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-0" 
                                  style={{ boxSizing: 'border-box', paddingLeft: '3px', position: 'relative', verticalAlign: 'middle', overflow: 'hidden' }}
                                  onClick={(e) => {
                                    const textarea = (e.currentTarget as HTMLElement).querySelector('textarea')
                                    if (textarea) textarea.focus()
                                  }}
                                >
                              <div className="flex items-center justify-start h-full">
                                <Textarea
                                  value={order.products}
                                  onChange={(e) => {
                                    handleCellChange(order.id, 'products', e.target.value)
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  placeholder="Товары"
                                      className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-sm"
                                  style={{ 
                                    minHeight: 'auto',
                                    width: '100%',
                                    height: 'auto',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    paddingLeft: '3px',
                                    paddingTop: '16px',
                                  }}
                                    />
                              </div>
                                </TableCell>

                                {/* ФСМ */}
                                <TableCell 
                                  className="text-center align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-0" 
                                  style={{ boxSizing: 'border-box', position: 'relative', verticalAlign: 'middle', overflow: 'hidden' }}
                                  onClick={(e) => {
                                    const textarea = (e.currentTarget as HTMLElement).querySelector('textarea')
                                    if (textarea) textarea.focus()
                                  }}
                                >
                              <div className="flex items-center justify-start h-full">
                                <Textarea
                                  value={order.fsm}
                                  onChange={(e) => {
                                    handleCellChange(order.id, 'fsm', e.target.value)
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  placeholder="ФСМ"
                                      className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-center text-sm"
                                  style={{ 
                                    minHeight: 'auto',
                                    width: '100%',
                                    height: 'auto',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    paddingTop: '16px',
                                  }}
                                    />
                              </div>
                                </TableCell>

                                {/* Адрес */}
                                <TableCell 
                                  className="align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-0" 
                                  style={{ boxSizing: 'border-box', paddingLeft: '3px', position: 'relative', verticalAlign: 'middle', overflow: 'hidden' }}
                                  onClick={(e) => {
                                    const textarea = (e.currentTarget as HTMLElement).querySelector('textarea')
                                    if (textarea) textarea.focus()
                                  }}
                                >
                              <div className="flex items-center justify-start h-full">
                                <Textarea
                                  value={order.address}
                                  onChange={(e) => {
                                    handleCellChange(order.id, 'address', e.target.value)
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  placeholder="Адрес"
                                      className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-sm"
                                  style={{ 
                                    minHeight: 'auto',
                                    width: '100%',
                                    height: 'auto',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    paddingLeft: '3px',
                                    paddingTop: '16px',
                                  }}
                                    />
                              </div>
                                </TableCell>

                                {/* Контакт */}
                                <TableCell 
                                  className="text-center align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-0" 
                                  style={{ boxSizing: 'border-box', position: 'relative', verticalAlign: 'middle', overflow: 'hidden' }}
                                  onClick={(e) => {
                                    const textarea = (e.currentTarget as HTMLElement).querySelector('textarea')
                                    if (textarea) textarea.focus()
                                  }}
                                >
                              <div className="flex items-center justify-start h-full">
                                <Textarea
                                  value={order.contact}
                                  onChange={(e) => {
                                    handleCellChange(order.id, 'contact', e.target.value)
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  placeholder="Контакт"
                                      className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-center text-sm"
                                  style={{ 
                                    minHeight: 'auto',
                                    width: '100%',
                                    height: 'auto',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    paddingTop: '16px',
                                  }}
                                    />
                              </div>
                                </TableCell>

                                {/* Оплачено */}
                                <TableCell 
                                  style={{ boxSizing: 'border-box' }}
                            className={`text-center align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-3 ${
                              order.payment.toLowerCase().includes('оплачено') || order.payment.toLowerCase().includes('оплачен')
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : order.payment.toLowerCase().includes('частично')
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}
                          >
                              <Select
                                value={order.payment || 'Не оплачено'}
                                onValueChange={(value) => handleCellChange(order.id, 'payment', value)}
                              >
                                <SelectTrigger className="border-0 bg-transparent h-auto p-0 w-full text-xs focus:ring-0 focus:ring-offset-0" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Оплачено">Оплачено</SelectItem>
                                  <SelectItem value="Частично">Частично</SelectItem>
                                  <SelectItem value="Не оплачено">Не оплачено</SelectItem>
                                </SelectContent>
                              </Select>
                                </TableCell>

                                {/* Время */}
                                <TableCell 
                                  className="text-center align-middle border-r border-gray-200 dark:border-gray-700 p-2" 
                                  style={{ boxSizing: 'border-box', position: 'relative' }}
                                  onClick={(e) => {
                                    const inputs = (e.currentTarget as HTMLElement).querySelectorAll('input')
                                    if (inputs.length > 0) inputs[0].focus()
                                  }}
                                >
                                  <div className="flex flex-col gap-0.5 items-center justify-center h-full">
                              <Input
                                value={parseTimeSlot(order.time).start}
                                      onChange={(e) => handleTimeStartChange(order.id, e.target.value)}
                                placeholder="11:00"
                                      className="border-0 bg-transparent p-0 h-auto text-center text-xs focus-visible:ring-0"
                                style={{ 
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  width: '100%'
                                }}
                              />
                              <Input
                                value={parseTimeSlot(order.time).end}
                                      onChange={(e) => handleTimeEndChange(order.id, e.target.value)}
                                placeholder="13:00"
                                      className="border-0 bg-transparent p-0 h-auto text-center text-xs focus-visible:ring-0"
                                style={{ 
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  width: '100%'
                                }}
                              />
                            </div>
                                </TableCell>

                                {/* Комментарии */}
                                <TableCell 
                                  className="align-middle border-r border-gray-200 dark:border-gray-700 py-2 px-0" 
                                  style={{ boxSizing: 'border-box', position: 'relative', verticalAlign: 'middle', overflow: 'hidden' }}
                                  onClick={(e) => {
                                    const textarea = (e.currentTarget as HTMLElement).querySelector('textarea')
                                    if (textarea) textarea.focus()
                                  }}
                                >
                              <div className="flex items-center justify-start h-full">
                                <Textarea
                                  value={order.comment}
                                  onChange={(e) => {
                                    handleCellChange(order.id, 'comment', e.target.value)
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = 'auto'
                                    target.style.height = `${target.scrollHeight}px`
                                  }}
                                    placeholder="Комментарии"
                                    className="border-0 bg-transparent p-0 w-full resize-none focus-visible:ring-0 text-sm"
                                  style={{ 
                                    minHeight: 'auto',
                                    width: '100%',
                                    height: 'auto',
                                    overflow: 'hidden',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    paddingTop: '16px',
                                  }}
                                    />
                              </div>
                                </TableCell>

                                {/* Отгрузили */}
                                <TableCell 
                                  style={{ boxSizing: 'border-box' }}
                            className="text-center align-middle cursor-pointer border-r border-gray-200 dark:border-gray-700 py-2 px-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'shipped')
                            }}
                          >
                            <div className="flex items-center justify-center h-full">
                              <Checkbox
                                checked={order.shipped}
                                onCheckedChange={() => handleCheckboxChange(order.id, 'shipped')}
                              />
                            </div>
                                </TableCell>

                                {/* Доставлен */}
                                <TableCell 
                                  style={{ boxSizing: 'border-box' }}
                            className="text-center align-middle cursor-pointer py-2 px-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckboxChange(order.id, 'delivered')
                            }}
                          >
                            <div className="flex items-center justify-center h-full">
                              <Checkbox
                                checked={order.delivered}
                                onCheckedChange={() => handleCheckboxChange(order.id, 'delivered')}
                              />
                            </div>
                                </TableCell>
                            </TableRow>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
        </div>

              {/* Кнопка "Раскрыть далее" */}
        {hasMoreDates && (
                <div className="p-4 flex justify-center border-t">
            <Button
              variant="outline"
              onClick={handleShowMore}
              className="w-full sm:w-auto"
            >
                    Раскрыть далее
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Меню выбора типа REKL */}
      {reklMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setReklMenu(null)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg p-2"
            style={{
              left: `${reklMenu.x}px`,
              top: `${reklMenu.y}px`,
              minWidth: '200px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold mb-2 px-2 py-1">Тип рекламации</div>
            {reklOptions.map((option, idx) => (
            <button
                key={idx}
                className="w-full px-3 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                onClick={() => handleReklTypeSelect(reklMenu.orderId, option)}
              >
                {option}
                </button>
              ))}
          </div>
        </>
      )}

      {/* Диалог для раскрытия предыдущих дней */}
      <AlertDialog open={showExpandDialog} onOpenChange={setShowExpandDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Раскрыть предыдущие дни</AlertDialogTitle>
            <AlertDialogDescription>
              Выберите, сколько предыдущих дней раскрыть:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleExpand30Days}>30</AlertDialogAction>
            <AlertDialogAction onClick={handleExpandAll}>Все</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
