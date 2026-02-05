'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { syncManager } from '@/lib/delivery-crm/sync-manager'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Truck,
  GripVertical,
  ChevronDown,
  Calculator,
  FileText,
  Plus,
  Upload,
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
  groupId?: string // ID группы связанных заказов
  groupPosition?: 'first' | 'middle' | 'last' | 'single' // Позиция в группе
  groupSize?: number // Размер группы
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
  const [dropIndicator, setDropIndicator] = useState<{ date: string; position: 'before' | 'after'; index: number } | null>(null)
  const [daysToShow, setDaysToShow] = useState(8) // Сегодня + 7 дней = 8 дней
  const [daysBack, setDaysBack] = useState(0) // Количество дней назад для показа
  const [showExpandDialog, setShowExpandDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [reklMenu, setReklMenu] = useState<{ orderId: string; x: number; y: number } | null>(null)
  const [linkingOrderId, setLinkingOrderId] = useState<string | null>(null) // ID заказа, который нужно связать
  const [headerHeight, setHeaderHeight] = useState(80)
  const tableRef = useRef<HTMLTableElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  
  const today = startOfToday()
  const isInitialMount = useRef(true)

  // Функция для открытия лога в Google Sheets
  const handleOpenLog = () => {
    const spreadsheetId = '1lP2s2eTYWBqdKVsymlfBxDRioP_AiGxlTWGhYjiqBXk'
    // Открываем лист "История изменений" (gid можно получить из URL таблицы)
    // Если gid неизвестен, открываем таблицу и пользователь может перейти на нужный лист
    const logUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`
    window.open(logUrl, '_blank')
  }

  // Функция для импорта из Google Sheets
  const handleImport = async () => {
    if (!importUrl.trim()) {
      alert('Пожалуйста, введите ссылку на Google Sheet')
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/delivery-crm/import-google-sheets-legacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: importUrl.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Ошибка импорта')
      }

      // Показываем результат импорта
      let message = `Импорт завершен!\nИмпортировано: ${data.imported}\nОбновлено: ${data.updated}\nВсего: ${data.total}`
      
      if (data.errors > 0) {
        message += `\nОшибок: ${data.errors}`
        if (data.errorDetails && data.errorDetails.length > 0) {
          message += `\n\nПервые ошибки:\n${data.errorDetails.slice(0, 5).map((e: any, i: number) => 
            `${i + 1}. Заказ ${e.orderNumber || 'N/A'}: ${e.error}${e.code ? ` (${e.code})` : ''}`
          ).join('\n')}`
        }
      }
      
      alert(message)
      
      // Если есть ошибки, логируем их в консоль для детального анализа
      if (data.errors > 0 && data.errorDetails) {
        console.error('Import errors:', data.errorDetails)
      }

      // Загружаем данные из БД
      try {
        const ordersResponse = await fetch('/api/delivery-crm/orders')
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          if (ordersData.orders && Array.isArray(ordersData.orders)) {
            // Преобразуем даты из БД в ISO строки и восстанавливаем reklType/tk из tags
            const formattedOrders = ordersData.orders.map((order: any) => {
              const tags = Array.isArray(order.tags) ? order.tags : []
              const hasRekl = tags.includes('REKL')
              const hasTk = tags.includes('ТК')
              
              return {
                ...order,
                date: order.date ? (typeof order.date === 'string' ? order.date : order.date.split('T')[0]) : new Date().toISOString().split('T')[0],
                reklType: hasRekl ? (order.reklType || '') : undefined,
                tk: hasTk,
                // groupId, groupPosition, groupSize не сохраняются в БД, они только в localStorage
                groupId: order.groupId || undefined,
                groupPosition: order.groupPosition || undefined,
                groupSize: order.groupSize || undefined,
              }
            })
            setOrders(formattedOrders)
            saveOrdersToStorage(formattedOrders)
          }
        }
      } catch (loadError) {
        console.error('Error loading orders after import:', loadError)
        // Если не удалось загрузить из БД, просто перезагружаем страницу
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Import error:', error)
      alert(`Ошибка импорта: ${error.message}`)
    } finally {
      setIsImporting(false)
      setShowImportDialog(false)
      setImportUrl('')
    }
  }

  // Инициализация syncManager с URL из переменных окружения
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // В Next.js переменные с префиксом NEXT_PUBLIC_ доступны на клиенте
      const scriptUrl = (process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL as string) || null
      if (scriptUrl) {
        syncManager.setSyncUrl(scriptUrl)
        console.log('✅ Google Sheets auto-sync enabled (30s delay):', scriptUrl.substring(0, 50) + '...')
      } else {
        console.warn('⚠️ Google Apps Script URL not configured. Set NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL in .env.local')
        console.warn('📖 See instructions: docs/google-sheets-sync-setup.md')
      }
    }
  }, [])

  // Обновление позиций в группах при изменении orders
  useEffect(() => {
    const groupKeys = orders.map(o => `${o.id}-${o.groupId || ''}-${o.date}`).join(',')
    const updatedOrders = updateGroupPositions(orders)
    
    // Проверяем, изменились ли позиции
    const hasChanges = updatedOrders.some((order, index) => {
      const original = orders[index]
      return !original || 
        order.groupPosition !== original.groupPosition || 
        order.groupSize !== original.groupSize
    })
    
    if (hasChanges) {
      // Используем функциональное обновление, чтобы избежать зацикливания
      setOrders(prevOrders => {
        const updated = updateGroupPositions(prevOrders)
        return updated
      })
    }
  }, [orders.map(o => `${o.id}-${o.groupId || ''}-${o.date}`).join(',')])

  // Сохранение в localStorage и автоматическая синхронизация с Google Sheets
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    // Сохраняем в localStorage (синхронно, быстро)
    saveOrdersToStorage(orders)
    
    // Устанавливаем заказы для автоматической синхронизации
    // Синхронизация произойдет автоматически через 30 секунд после последнего изменения
    syncManager.setOrdersForSync(orders)
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
        const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'comment', 'fsm', 'address', 'contact', 'payment', 'time', 'shipped', 'delivered']
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
        const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'comment', 'fsm', 'address', 'contact', 'payment', 'time', 'shipped', 'delivered']
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
                  const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'comment', 'fsm', 'address', 'contact', 'payment', 'time', 'shipped', 'delivered']
                  const colName = columnNames[index] || `col${index}`
                  cellWidths[colName] = rect.width
                })
              }
              
              // Переизмеряем заголовки
              headerDivs.forEach((div, index) => {
                const el = div as HTMLElement
                const rect = el.getBoundingClientRect()
                const columnNames = ['drag', 'date', 'orderNumber', 'wrote', 'confirmed', 'products', 'comment', 'fsm', 'address', 'contact', 'payment', 'time', 'shipped', 'delivered']
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
    // Если в режиме выбора для связывания, отменяем drag
    if (linkingOrderId) {
      e.preventDefault()
      return
    }

    setDraggedOrderId(orderId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', orderId)
  }

  const handleDragOver = (e: React.DragEvent, date: string, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
    
    // Определяем, куда именно вставлять - до или после строки
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseY = e.clientY
    const rowMiddle = rect.top + rect.height / 2
    
    if (mouseY < rowMiddle) {
      // Вставляем ПЕРЕД этой строкой
      setDropIndicator({ date, position: 'before', index })
      setDragOverIndex(index)
    } else {
      // Вставляем ПОСЛЕ этой строки
      setDropIndicator({ date, position: 'after', index })
      setDragOverIndex(index + 1)
    }
  }

  const handleDragLeave = () => {
    // Не очищаем dropIndicator сразу, чтобы избежать мерцания
    // Очистим только если действительно покинули область таблицы
  }

  const handleDrop = (e: React.DragEvent, targetDate: string, targetIndex: number) => {
    e.preventDefault()
    setDragOverDate(null)
    setDragOverIndex(null)
    
    if (!draggedOrderId) {
      setDropIndicator(null)
      return
    }
    
    const draggedOrder = orders.find(o => o.id === draggedOrderId)
    if (!draggedOrder) {
      setDropIndicator(null)
      return
    }

    // Если заказ связан с другими, перемещаем всю группу
    const linkedOrders: DeliveryOrder[] = []
    if (draggedOrder.groupId) {
      linkedOrders.push(...orders.filter(o => o.groupId === draggedOrder.groupId && o.id !== draggedOrderId))
    }

    const oldDate = draggedOrder.date

    // Используем dropIndicator для точной позиции вставки
    if (dropIndicator) {
      // Получаем все заказы для целевой даты (без перетаскиваемого)
      const allOrdersForDate = orders.filter(o => o.date === dropIndicator.date && !o.isEmpty)
      
      // Если перетаскиваемый заказ уже в этой дате, исключаем его из списка для правильного расчета позиции
      const targetDateOrders = allOrdersForDate.filter(o => o.id !== draggedOrderId)
      
      // Определяем индекс вставки
      const insertIndex = dropIndicator.position === 'before' 
        ? dropIndicator.index 
        : dropIndicator.index + 1
      
      // Если перемещаем в ту же дату, нужно скорректировать индекс
      if (draggedOrder.date === dropIndicator.date) {
        const currentIndex = targetDateOrders.findIndex(o => o.id === draggedOrderId)
        if (currentIndex !== -1 && insertIndex > currentIndex) {
          // Если вставляем после текущей позиции, нужно уменьшить индекс на 1
          const adjustedIndex = insertIndex - 1
          const beforeOrders = targetDateOrders.slice(0, adjustedIndex)
          const afterOrders = targetDateOrders.slice(adjustedIndex)
          const updatedOrder = { ...draggedOrder, date: dropIndicator.date }
          
          const otherDateOrders = orders.filter(o => o.date !== dropIndicator.date)
          const newOrders = [
            ...otherDateOrders,
            ...beforeOrders,
            updatedOrder,
            ...afterOrders
          ]
          
          // Логируем перемещение (если дата изменилась)
          if (oldDate !== dropIndicator.date) {
            syncManager.logChange({
              type: 'move',
              orderId: draggedOrderId,
              field: 'date',
              oldValue: oldDate,
              newValue: dropIndicator.date
            })
          }
          
          setOrders(newOrders)
          setDraggedOrderId(null)
          setDropIndicator(null)
          return
        }
      }
      
      // Исключаем связанные заказы из списка целевой даты
      const linkedOrderIds = linkedOrders.map(o => o.id)
      const targetDateOrdersFiltered = targetDateOrders.filter(o => !linkedOrderIds.includes(o.id))
      
      // Разделяем заказы на те, что до и после точки вставки
      const beforeOrders = targetDateOrdersFiltered.slice(0, insertIndex)
      const afterOrders = targetDateOrdersFiltered.slice(insertIndex)
      
      // Обновляем перетаскиваемый заказ и связанные заказы с новой датой
      const updatedOrder = { ...draggedOrder, date: dropIndicator.date }
      const updatedLinkedOrders = linkedOrders.map(o => ({ ...o, date: dropIndicator.date }))
      
      // Собираем новый массив: заказы других дат + заказы до вставки + перетаскиваемый + связанные + заказы после вставки
      const otherDateOrders = orders.filter(o => 
        o.date !== dropIndicator.date && 
        o.id !== draggedOrderId && 
        !linkedOrderIds.includes(o.id)
      )
      
      // Создаем финальный массив
      const newOrders = [
        ...otherDateOrders,
        ...beforeOrders,
        updatedOrder,
        ...updatedLinkedOrders,
        ...afterOrders
      ]
      
      // Логируем перемещение (если дата изменилась)
      if (oldDate !== dropIndicator.date) {
        syncManager.logChange({
          type: 'move',
          orderId: draggedOrderId,
          field: 'date',
          oldValue: oldDate,
          newValue: dropIndicator.date
        })
        // Логируем перемещение для всех связанных заказов
        linkedOrders.forEach(linkedOrder => {
          syncManager.logChange({
            type: 'move',
            orderId: linkedOrder.id,
            field: 'date',
            oldValue: linkedOrder.date,
            newValue: dropIndicator.date
          })
        })
      }
      
      setOrders(newOrders)
    } else {
      // Fallback: просто меняем дату (старое поведение)
    if (draggedOrder.date === targetDate) {
      setDraggedOrderId(null)
        setDropIndicator(null)
      return
    }

      // Обновляем дату для перетаскиваемого заказа и связанных
      const linkedOrderIds = linkedOrders.map(o => o.id)
      
      // Логируем перемещение (если дата изменилась)
      if (oldDate !== targetDate) {
        syncManager.logChange({
          type: 'move',
          orderId: draggedOrderId,
          field: 'date',
          oldValue: oldDate,
          newValue: targetDate
        })
        // Логируем перемещение для всех связанных заказов
        linkedOrders.forEach(linkedOrder => {
          syncManager.logChange({
            type: 'move',
            orderId: linkedOrder.id,
            field: 'date',
            oldValue: linkedOrder.date,
            newValue: targetDate
          })
        })
      }
      
      setOrders(orders.map(order => {
        if (order.id === draggedOrderId) {
          return { ...order, date: targetDate }
        }
        if (linkedOrderIds.includes(order.id)) {
          return { ...order, date: targetDate }
        }
        return order
      }))
    }
    
    setDraggedOrderId(null)
    setDropIndicator(null)
  }

  const handleDragEnd = () => {
    setDraggedOrderId(null)
    setDragOverDate(null)
    setDragOverIndex(null)
    setDropIndicator(null)
  }

  // Обработка изменений
  const handleCellChange = (id: string, field: keyof DeliveryOrder, value: any) => {
    const order = orders.find(o => o.id === id)
    const oldValue = order?.[field]
    
    const updatedOrders = orders.map(order => {
      if (order.id === id) {
        const updated = { ...order, [field]: value, isEmpty: false }
        
        // Если изменился адрес и заказ в группе, проверяем нужно ли разорвать связь
        if (field === 'address' && order.groupId) {
          const groupOrders = orders.filter(o => o.groupId === order.groupId && o.id !== id)
          const newAddress = value.toLowerCase().trim()
          
          // Проверяем, совпадает ли новый адрес с адресами других заказов в группе
          const addressesMatch = groupOrders.every(o => 
            o.address.toLowerCase().trim() === newAddress && newAddress !== ''
          )
          
          if (!addressesMatch && newAddress !== '') {
            // Адреса не совпадают - разрываем связь
            const ungrouped = { ...updated, groupId: undefined, groupPosition: undefined, groupSize: undefined }
            
            // Логируем разрыв связи
            syncManager.logChange({
              type: 'ungroup',
              orderId: id,
              field: 'groupId',
              oldValue: order.groupId,
              newValue: undefined
            })
            
            return ungrouped
          }
        }
        
        // Логируем изменение поля
        if (oldValue !== value) {
          syncManager.logChange({
            type: 'update',
            orderId: id,
            field: field as string,
            oldValue: oldValue,
            newValue: value
          })
        }
        
        return updated
      }
      return order
    })
    
    setOrders(updatedOrders)
  }

  const handleCheckboxChange = (id: string, field: keyof DeliveryOrder) => {
    const order = orders.find(o => o.id === id)
    const oldValue = order?.[field]
    const newValue = !oldValue
    
    // Логируем изменение чекбокса
    syncManager.logChange({
      type: 'update',
      orderId: id,
      field: field as string,
      oldValue: oldValue,
      newValue: newValue
    })
    
    setOrders(orders.map(order => 
      order.id === id 
        ? { ...order, [field]: newValue }
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
    // handleCellChange уже логирует изменение, просто вызываем его
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

  // Получение цвета группы для связанных заказов
  const getGroupColor = (groupId: string | undefined): string | null => {
    if (!groupId) return null
    
    // Генерируем цвет на основе groupId
    const colors = [
      '#d1fae5', // светло-зеленый
      '#dbeafe', // светло-голубой
      '#fef3c7', // светло-желтый
      '#fce7f3', // светло-розовый
      '#e9d5ff', // светло-фиолетовый
    ]
    
    const hash = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Определение позиции заказа в группе
  const getGroupPosition = (
    order: DeliveryOrder, 
    date: string
  ): { position: 'first' | 'middle' | 'last' | 'single', size: number } => {
    if (!order.groupId) return { position: 'single', size: 1 }
    
    const groupOrders = orders
      .filter(o => o.date === date && o.groupId === order.groupId && !o.isEmpty)
      .sort((a, b) => {
        const indexA = orders.findIndex(o => o.id === a.id)
        const indexB = orders.findIndex(o => o.id === b.id)
        return indexA - indexB
      })
    
    const currentIndex = groupOrders.findIndex(o => o.id === order.id)
    const size = groupOrders.length
    
    if (size === 1) return { position: 'single', size: 1 }
    if (currentIndex === 0) return { position: 'first', size }
    if (currentIndex === size - 1) return { position: 'last', size }
    return { position: 'middle', size }
  }

  // Обновление позиций в группах для всех заказов
  const updateGroupPositions = (updatedOrders: DeliveryOrder[]): DeliveryOrder[] => {
    const dates = Array.from(new Set(updatedOrders.map(o => o.date)))
    
    return updatedOrders.map(order => {
      if (!order.groupId) {
        return { ...order, groupPosition: 'single', groupSize: 1 }
      }
      
      const groupInfo = getGroupPosition(order, order.date)
      return {
        ...order,
        groupPosition: groupInfo.position,
        groupSize: groupInfo.size
      }
    })
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

  // Валидация времени (часы: 0-23, минуты: 0-59)
  const validateTime = (timeStr: string): string | null => {
    if (!timeStr) return null
    
    // Проверяем формат HH:MM или HHMM
    const timeMatch = timeStr.match(/^(\d{1,2}):?(\d{0,2})$/)
    if (!timeMatch) return null
    
    let hours = parseInt(timeMatch[1] || '0', 10)
    let minutes = parseInt(timeMatch[2] || '0', 10)
    
    // Валидация часов (0-23)
    if (hours < 0) hours = 0
    if (hours > 23) hours = 23
    
    // Валидация минут (0-59)
    if (minutes < 0) minutes = 0
    if (minutes > 59) minutes = 59
    
    // Форматируем с ведущими нулями
    const formattedHours = String(hours).padStart(2, '0')
    const formattedMinutes = String(minutes).padStart(2, '0')
    
    return `${formattedHours}:${formattedMinutes}`
  }

  // Обработка изменения времени начала
  const handleTimeStartChange = (id: string, startValue: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    
    // Удаляем все нецифровые символы кроме двоеточия
    const cleaned = startValue.replace(/[^\d:]/g, '')
    
    // Если есть двоеточие, разбиваем на части
    let formatted = cleaned
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':')
      let hours = parts[0] || ''
      let minutes = parts[1] || ''
      
      // Ограничиваем длину
      if (hours.length > 2) hours = hours.slice(0, 2)
      if (minutes.length > 2) minutes = minutes.slice(0, 2)
      
      // Валидируем и форматируем
      const validated = validateTime(`${hours}:${minutes}`)
      if (validated) {
        formatted = validated
      } else if (hours) {
        formatted = hours
      }
    } else {
      // Если нет двоеточия, форматируем автоматически
      const digitsOnly = cleaned.replace(/\D/g, '')
    if (digitsOnly.length > 2) {
        const hours = digitsOnly.slice(0, 2)
        const minutes = digitsOnly.slice(2, 4)
        const validated = validateTime(`${hours}:${minutes}`)
        if (validated) {
          formatted = validated
        } else {
          formatted = hours
        }
      } else {
        formatted = digitsOnly
      }
    }
    
    // Валидируем финальное значение
    const finalTime = validateTime(formatted) || formatted
    
    const { end } = parseTimeSlot(order.time)
    const newTime = end ? `${finalTime} - ${end}` : finalTime
    handleCellChange(id, 'time', newTime)
  }

  // Обработка изменения времени окончания
  const handleTimeEndChange = (id: string, endValue: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    
    // Удаляем все нецифровые символы кроме двоеточия
    const cleaned = endValue.replace(/[^\d:]/g, '')
    
    // Если есть двоеточие, разбиваем на части
    let formatted = cleaned
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':')
      let hours = parts[0] || ''
      let minutes = parts[1] || ''
      
      // Ограничиваем длину
      if (hours.length > 2) hours = hours.slice(0, 2)
      if (minutes.length > 2) minutes = minutes.slice(0, 2)
      
      // Валидируем и форматируем
      const validated = validateTime(`${hours}:${minutes}`)
      if (validated) {
        formatted = validated
      } else if (hours) {
        formatted = hours
      }
    } else {
      // Если нет двоеточия, форматируем автоматически
      const digitsOnly = cleaned.replace(/\D/g, '')
    if (digitsOnly.length > 2) {
        const hours = digitsOnly.slice(0, 2)
        const minutes = digitsOnly.slice(2, 4)
        const validated = validateTime(`${hours}:${minutes}`)
        if (validated) {
          formatted = validated
        } else {
          formatted = hours
        }
      } else {
        formatted = digitsOnly
      }
    }
    
    // Валидируем финальное значение
    const finalTime = validateTime(formatted) || formatted
    
    const { start } = parseTimeSlot(order.time)
    const newTime = start ? `${start} - ${finalTime}` : finalTime
    handleCellChange(id, 'time', newTime)
  }

  // Добавление пустой строки сразу после текущей
  const handleAddEmptyRow = (orderId: string) => {
    const currentOrder = orders.find(o => o.id === orderId)
    if (!currentOrder) return
    
    const newOrder: DeliveryOrder = {
      id: `empty-${Date.now()}-${Math.random()}`,
      date: currentOrder.date,
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
    
    // Находим индекс текущего заказа
    const currentIndex = orders.findIndex(o => o.id === orderId)
    if (currentIndex === -1) return
    
    // Вставляем новую строку сразу после текущей
    const newOrders = [
      ...orders.slice(0, currentIndex + 1),
      newOrder,
      ...orders.slice(currentIndex + 1)
    ]
    
    // Логируем создание нового заказа
    syncManager.logChange({
      type: 'create',
      orderId: newOrder.id,
      newValue: newOrder
    })
    
    setOrders(newOrders)
  }

  // Удаление строки
  const handleDeleteRow = (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId)
    if (!orderToDelete) return
    
    // Логируем удаление заказа
    syncManager.logChange({
      type: 'delete',
      orderId: orderId,
      oldValue: orderToDelete
    })
    
    // Если заказ в группе, разрываем связь перед удалением
    let updatedOrders = orders
    if (orderToDelete.groupId) {
      const groupOrders = orders.filter(o => o.groupId === orderToDelete.groupId && o.id !== orderId)
      if (groupOrders.length > 1) {
        // Оставляем группу для остальных заказов
        updatedOrders = orders.map(o => 
          o.id === orderId ? o : o
        )
      } else {
        // Удаляем группу, если остался один заказ
        updatedOrders = orders.map(o => 
          o.groupId === orderToDelete.groupId && o.id !== orderId
            ? { ...o, groupId: undefined, groupPosition: undefined, groupSize: undefined }
            : o
        )
      }
    }
    
    setOrders(updatedOrders.filter(order => order.id !== orderId))
  }

  // Связывание заказов - новая логика с выбором заказа
  const handleLinkOrder = (orderId: string) => {
    const currentOrder = orders.find(o => o.id === orderId)
    if (!currentOrder) return

    // Если заказ уже в группе, разрываем связь
    if (currentOrder.groupId) {
      handleUnlinkOrder(orderId)
      setLinkingOrderId(null)
      return
    }

    // Если уже в режиме выбора для этого заказа, отменяем выбор
    if (linkingOrderId === orderId) {
      setLinkingOrderId(null)
      return
    }

    // Переходим в режим выбора заказа для связывания
    setLinkingOrderId(orderId)
  }

  // Обработка клика на строку в режиме выбора заказа для связывания
  const handleRowClickForLinking = (targetOrderId: string) => {
    if (!linkingOrderId) return

    const sourceOrder = orders.find(o => o.id === linkingOrderId)
    const targetOrder = orders.find(o => o.id === targetOrderId)

    if (!sourceOrder || !targetOrder) {
      setLinkingOrderId(null)
      return
    }

    // Нельзя связать заказ с самим собой
    if (sourceOrder.id === targetOrder.id) {
      setLinkingOrderId(null)
      return
    }

    // Проверяем, не превышен ли лимит группы
    if (targetOrder.groupId) {
      const groupSize = orders.filter(o => o.groupId === targetOrder.groupId).length
      if (groupSize >= 5) {
        alert('Максимальное количество заказов в группе - 5')
        setLinkingOrderId(null)
        return
      }
      
      // Добавляем в существующую группу
      syncManager.logChange({
        type: 'group',
        orderId: linkingOrderId,
        field: 'groupId',
        oldValue: undefined,
        newValue: targetOrder.groupId
      })
      
      setOrders(orders.map(o => 
        o.id === linkingOrderId 
          ? { ...o, groupId: targetOrder.groupId }
          : o
      ))
    } else if (sourceOrder.groupId) {
      // Если исходный заказ уже в группе, добавляем целевой в эту группу
      const groupSize = orders.filter(o => o.groupId === sourceOrder.groupId).length
      if (groupSize >= 5) {
        alert('Максимальное количество заказов в группе - 5')
        setLinkingOrderId(null)
        return
      }
      
      syncManager.logChange({
        type: 'group',
        orderId: targetOrderId,
        field: 'groupId',
        oldValue: undefined,
        newValue: sourceOrder.groupId
      })
      
      setOrders(orders.map(o => 
        o.id === targetOrderId 
          ? { ...o, groupId: sourceOrder.groupId }
          : o
      ))
    } else {
      // Создаем новую группу для обоих заказов
      const newGroupId = `group-${Date.now()}-${Math.random()}`
      
      syncManager.logChange({
        type: 'group',
        orderId: linkingOrderId,
        field: 'groupId',
        oldValue: undefined,
        newValue: newGroupId
      })
      syncManager.logChange({
        type: 'group',
        orderId: targetOrderId,
        field: 'groupId',
        oldValue: undefined,
        newValue: newGroupId
      })
      
      setOrders(orders.map(o => 
        o.id === linkingOrderId || o.id === targetOrderId
          ? { ...o, groupId: newGroupId }
          : o
      ))
    }

    setLinkingOrderId(null)
  }

  // Разрыв связи заказа
  const handleUnlinkOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order || !order.groupId) return

    const groupOrders = orders.filter(o => o.groupId === order.groupId)
    const oldGroupId = order.groupId
    
    if (groupOrders.length <= 2) {
      // Если в группе 2 заказа, удаляем группу полностью
      // Логируем разрыв связи для всех заказов в группе
      groupOrders.forEach(o => {
        syncManager.logChange({
          type: 'ungroup',
          orderId: o.id,
          field: 'groupId',
          oldValue: oldGroupId,
          newValue: undefined
        })
      })
      
      setOrders(orders.map(o => 
        o.groupId === order.groupId
          ? { ...o, groupId: undefined, groupPosition: undefined, groupSize: undefined }
          : o
      ))
    } else {
      // Удаляем только текущий заказ из группы
      // Логируем разрыв связи
      syncManager.logChange({
        type: 'ungroup',
        orderId: orderId,
        field: 'groupId',
        oldValue: oldGroupId,
        newValue: undefined
      })
      
      setOrders(orders.map(o => 
        o.id === orderId
          ? { ...o, groupId: undefined, groupPosition: undefined, groupSize: undefined }
          : o
      ))
    }
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Импорт
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenLog}
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Лог
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Calculator className="w-3 h-3 mr-1.5" />
                  Открыть калькулятор
                </Button>
              </Link>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Заказы доставки</CardTitle>
                  {linkingOrderId && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-md border border-yellow-300 dark:border-yellow-700">
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">
                        С каким заказом связать?
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLinkingOrderId(null)}
                        className="h-6 px-2 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                      >
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleExpandPrevious}>
                  {daysBack > 0 ? 'Скрыть предыдущие' : 'Раскрыть предыдущие'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="rounded-md border" 
                style={{ overflow: 'visible' }}
                onDragLeave={(e) => {
                  // Очищаем индикатор только если покинули область таблицы
                  const relatedTarget = e.relatedTarget as HTMLElement
                  if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                    setDropIndicator(null)
                    setDragOverDate(null)
                    setDragOverIndex(null)
                  }
                }}
              >
                {/* Заголовки столбцов над таблицей */}
                <div className="sticky z-50 bg-white dark:bg-gray-900 border-b shadow-sm" style={{ top: `${headerHeight}px` }}>
                  <div className="flex w-full" style={{ boxSizing: 'border-box' }}>
                    <div style={{ width: columnWidths.drag, minWidth: columnWidths.drag, maxWidth: columnWidths.drag, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700"> </div>
                    <div style={{ width: columnWidths.date, minWidth: columnWidths.date, maxWidth: columnWidths.date, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Дата</div>
                    <div style={{ width: columnWidths.orderNumber, minWidth: columnWidths.orderNumber, maxWidth: columnWidths.orderNumber, flexShrink: 0, boxSizing: 'border-box', paddingTop: '10px' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-base leading-tight whitespace-nowrap">№ Заказа</div>
                    <div style={{ width: columnWidths.wrote, minWidth: columnWidths.wrote, maxWidth: columnWidths.wrote, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-[0.65rem] leading-tight">Напи-<br/>сали</div>
                    <div style={{ width: columnWidths.confirmed, minWidth: columnWidths.confirmed, maxWidth: columnWidths.confirmed, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700 text-[0.65rem] leading-tight">Подтве-<br/>рдили</div>
                    <div style={{ width: columnWidths.products, minWidth: columnWidths.products, maxWidth: columnWidths.products, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Товары</div>
                    <div style={{ width: columnWidths.comment, minWidth: columnWidths.comment, maxWidth: columnWidths.comment, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Комментарии</div>
                    <div style={{ width: columnWidths.fsm, minWidth: columnWidths.fsm, maxWidth: columnWidths.fsm, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">ФСМ</div>
                    <div style={{ width: columnWidths.address, minWidth: columnWidths.address, maxWidth: columnWidths.address, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Адрес</div>
                    <div style={{ width: columnWidths.contact, minWidth: columnWidths.contact, maxWidth: columnWidths.contact, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Контакт</div>
                    <div style={{ width: columnWidths.payment, minWidth: columnWidths.payment, maxWidth: columnWidths.payment, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Оплачено</div>
                    <div style={{ width: columnWidths.time, minWidth: columnWidths.time, maxWidth: columnWidths.time, flexShrink: 0, boxSizing: 'border-box' }} className="text-center bg-white dark:bg-gray-900 font-semibold py-2 border-r border-gray-200 dark:border-gray-700">Время</div>
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
                    <col style={{ width: columnWidths.comment - 1 }} />
                    <col style={{ width: columnWidths.fsm - 1 }} />
                    <col style={{ width: columnWidths.address - 1 }} />
                    <col style={{ width: columnWidths.contact - 1 }} />
                    <col style={{ width: columnWidths.payment - 1 }} />
                    <col style={{ width: columnWidths.time - 1 }} />
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
                          
                          // Определяем, нужно ли показывать индикатор вставки
                          const showDropIndicatorBefore = dropIndicator?.date === date && 
                            dropIndicator?.position === 'before' && 
                            dropIndicator?.index === index
                          
                          const showDropIndicatorAfter = dropIndicator?.date === date && 
                            dropIndicator?.position === 'after' && 
                            dropIndicator?.index === index

                          return (
                            <React.Fragment key={order.id}>
                              {/* Индикатор вставки ПЕРЕД строкой */}
                              {showDropIndicatorBefore && (
                                <tr className="drop-indicator-row">
                                  <td colSpan={14} className="p-0 h-0">
                                    <div 
                                      className="drop-indicator-line"
                                      style={{
                                        height: '3px',
                                        background: 'linear-gradient(to right, transparent 0%, rgb(59, 130, 246) 20%, rgb(59, 130, 246) 80%, transparent 100%)',
                                        borderTop: '2px dashed rgb(59, 130, 246)',
                                        margin: '4px 0',
                                        animation: 'pulse-indicator 1.5s ease-in-out infinite',
                                      }}
                                    />
                                  </td>
                                </tr>
                              )}
                              
                            <TableRow
                              key={order.id}
                          onDragOver={(e) => {
                            e.preventDefault()
                            handleDragOver(e, date, index)
                          }}
                          onDrop={(e) => handleDrop(e, date, index)}
                          onClick={(e) => {
                            // Если в режиме выбора для связывания, обрабатываем клик
                            // Но только если клик был не на интерактивном элементе (input, button, textarea)
                            if (linkingOrderId && linkingOrderId !== order.id) {
                              const target = e.target as HTMLElement
                              const isInteractive = target.tagName === 'INPUT' || 
                                                    target.tagName === 'BUTTON' || 
                                                    target.tagName === 'TEXTAREA' ||
                                                    target.closest('button') ||
                                                    target.closest('input') ||
                                                    target.closest('textarea')
                              if (!isInteractive) {
                                handleRowClickForLinking(order.id)
                              }
                            }
                          }}
                          className={`${isDragging ? 'opacity-50' : ''} 
                            ${showDropIndicatorBefore ? 'border-t-2 border-blue-500' : ''}
                            ${showDropIndicatorAfter ? 'border-b-2 border-blue-500' : ''}
                            ${dragOverDate === date && dragOverIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''} 
                            ${hasTopBorder ? 'border-t-4 border-gray-600 dark:border-gray-500' : ''}
                            ${linkingOrderId === order.id ? 'ring-2 ring-yellow-400 ring-opacity-75' : ''}
                            ${linkingOrderId && linkingOrderId !== order.id ? 'cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : ''}
                            transition-all duration-200`}
                          style={{ 
                            background: getRowBackgroundColor(order) || getGroupColor(order.groupId) || undefined,
                            marginTop: showDropIndicatorBefore ? '4px' : undefined,
                            marginBottom: showDropIndicatorAfter ? '4px' : undefined,
                          }}
                            >
                                {/* Ползунок для drag-n-drop */}
                                <TableCell className="text-center border-r border-gray-200 dark:border-gray-700 py-2 px-0 relative" style={{ boxSizing: 'border-box' }}>
                                <div 
                                  className="flex items-center justify-center h-full cursor-move relative"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, order.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  {/* Скобка для связанных заказов */}
                                  {order.groupId && order.groupPosition && order.groupPosition !== 'single' && (
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 flex flex-col items-start justify-between pointer-events-none"
                                      style={{
                                        width: '10px',
                                        zIndex: 1,
                                      }}
                                    >
                                      {/* Верхняя горизонтальная линия */}
                                      {order.groupPosition === 'first' && (
                                        <div 
                                          className="bg-green-500"
                                          style={{
                                            width: '5px',
                                            height: '2px',
                                            marginTop: '50%',
                                          }}
                                        />
                                      )}
                                      
                                      {/* Вертикальная линия */}
                                      <div 
                                        className="bg-green-500"
                                        style={{
                                          width: '2px',
                                          height: order.groupPosition === 'first' || order.groupPosition === 'last' 
                                            ? '50%' 
                                            : '100%',
                                          marginLeft: '3px',
                                          marginTop: order.groupPosition === 'first' ? '50%' : '0',
                                          marginBottom: order.groupPosition === 'last' ? '50%' : '0',
                                        }}
                                      />
                                      
                                      {/* Нижняя горизонтальная линия */}
                                      {order.groupPosition === 'last' && (
                                        <div 
                                          className="bg-green-500"
                                          style={{
                                            width: '5px',
                                            height: '2px',
                                            marginBottom: '50%',
                                          }}
                                        />
                                      )}
                                      
                                      {/* Индикатор количества (для первой строки) */}
                                      {order.groupPosition === 'first' && order.groupSize && order.groupSize > 1 && (
                                        <div 
                                          className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-green-500 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center"
                                          style={{
                                            width: '14px',
                                            height: '14px',
                                            fontSize: '9px',
                                            lineHeight: '1',
                                          }}
                                          title={`Группа из ${order.groupSize} заказов`}
                                        >
                                          {order.groupSize}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <GripVertical className="w-4 h-4 text-muted-foreground relative z-10" />
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
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddEmptyRow(order.id)
                                      }}
                                      title="Добавить пустую строку после текущей"
                                    >
                                      +
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteRow(order.id)
                                      }}
                                      title="Удалить текущую строку"
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
                                      className="border-0 bg-transparent p-0 h-auto w-full resize-none focus-visible:ring-0 text-center text-sm font-medium order-number-textarea"
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
                                    paddingLeft: '3px',
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
                              <div className="flex items-center gap-1 h-full relative">
                                {/* Бейдж группы для первой строки */}
                                {order.groupId && order.groupPosition === 'first' && order.groupSize && order.groupSize > 1 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-[0.6rem] px-1 py-0 h-4 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700 flex-shrink-0"
                                    title={`Группа из ${order.groupSize} заказов`}
                                  >
                                    🔗 {order.groupSize}
                                  </Badge>
                                )}
                                
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
                                      className="border-0 bg-transparent p-0 flex-1 resize-none focus-visible:ring-0 text-sm"
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
                                
                                {/* Кнопка связывания */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`absolute top-0 right-0 h-4 w-4 p-0 z-10 flex-shrink-0 ${
                                    linkingOrderId === order.id 
                                      ? 'bg-yellow-200 dark:bg-yellow-800 opacity-100' 
                                      : 'opacity-60 hover:opacity-100'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLinkOrder(order.id)
                                  }}
                                  title={linkingOrderId === order.id 
                                    ? 'Отменить выбор' 
                                    : order.groupId 
                                      ? 'Разорвать связь' 
                                      : 'Связать с другим заказом'}
                                >
                                  {linkingOrderId === order.id ? '✓' : order.groupId ? '🔗' : '🔗'}
                                </Button>
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
                            
                            {/* Индикатор вставки ПОСЛЕ строки */}
                            {showDropIndicatorAfter && (
                              <tr className="drop-indicator-row">
                                <td colSpan={14} className="p-0 h-0">
                                  <div 
                                    className="drop-indicator-line"
                                    style={{
                                      height: '3px',
                                      background: 'linear-gradient(to right, transparent 0%, rgb(59, 130, 246) 20%, rgb(59, 130, 246) 80%, transparent 100%)',
                                      borderTop: '2px dashed rgb(59, 130, 246)',
                                      margin: '4px 0',
                                      animation: 'pulse-indicator 1.5s ease-in-out infinite',
                                    }}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
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

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Импорт из Google Sheets</AlertDialogTitle>
            <AlertDialogDescription>
              Вставьте ссылку на Google Sheet для импорта заказов. Таблица должна содержать заголовки столбцов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={isImporting}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={isImporting || !importUrl.trim()}>
              {isImporting ? 'Импорт...' : 'Импортировать'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
