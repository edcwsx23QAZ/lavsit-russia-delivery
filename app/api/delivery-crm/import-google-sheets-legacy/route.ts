import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// Проверяем, что переменные окружения загружены (lib/prisma.ts уже загружает их)
// Эта функция используется как дополнительная проверка на случай, если lib/prisma.ts не загрузил переменные
function ensureEnvLoaded() {
  if (!process.env.DATABASE_URL) {
    const envLocalPath = join(process.cwd(), '.env.local')
    if (existsSync(envLocalPath)) {
      try {
        const envContent = readFileSync(envLocalPath, 'utf-8')
        const lines = envContent.split(/\r?\n/)
        lines.forEach((line) => {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#')) {
            const equalIndex = trimmed.indexOf('=')
            if (equalIndex > 0) {
              const key = trimmed.substring(0, equalIndex).trim()
              const value = trimmed.substring(equalIndex + 1).trim()
              // Удаляем кавычки если есть
              const cleanValue = value.replace(/^["']|["']$/g, '')
              if (!process.env[key]) {
                process.env[key] = cleanValue
                if (key === 'DATABASE_URL') {
                  console.log('[Import] Loaded DATABASE_URL from .env.local (length:', cleanValue.length, ')')
                }
              }
            }
          }
        })
        console.log('[Import] Environment variables loaded from .env.local')
      } catch (error: any) {
        console.error('[Import] Error loading .env.local:', error.message)
      }
    } else {
      console.warn('[Import] .env.local file not found at:', envLocalPath)
    }
  } else {
    console.log('[Import] DATABASE_URL already set in process.env (length:', process.env.DATABASE_URL?.length, ')')
  }
}

interface ColumnMapping {
  date: number
  orderNumber: number
  wrote: number | null
  confirmed: number | null
  products: number
  comment: number | null
  fsm: number
  address: number
  contact: number
  payment: number | null
  time: number | null
  shipped: number | null
  delivered: number | null
}

function parseDate(dateStr: string): Date {
  if (!dateStr || !dateStr.trim()) {
    return new Date()
  }

  const dateStrTrimmed = dateStr.trim()
  const parts = dateStrTrimmed.split('.')
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()
    
    if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, day)
    }
  }

  const parsed = new Date(dateStrTrimmed)
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    if (year >= 2000 && year <= 2100) {
      return parsed
    }
  }

  return new Date()
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

function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value
  if (!value) return false
  const lower = String(value).toLowerCase().trim()
  return lower === 'true' || lower === '1' || lower === '✓' || 
         lower === 'да' || lower === 'yes' || lower === 'v' || 
         lower === '+' || lower === 'x' || lower === 'checked'
}

/**
 * Парсит ячейку "№ Заказа" согласно правилам:
 * - Номер заказа - это ВСЕГДА 5 цифр (например, 46554)
 * - Четырехзначные числа → ФСМ в формате FSM1234
 * - Остальной текст → комментарий
 * - REKL и ТК извлекаются отдельно
 */
function parseOrderNumberCell(cellValue: string): {
  orderNumbers: string[]
  fsm: string
  comment: string
  reklType?: string
  tk: boolean
} {
  const text = (cellValue || '').trim()
  const result = {
    orderNumbers: [] as string[],
    fsm: '',
    comment: '',
    reklType: undefined as string | undefined,
    tk: false,
  }

  if (!text) return result

  // 1. Извлекаем REKL
  const reklMatch = text.match(/REKL\s+([^\s)]+)/i)
  if (reklMatch) {
    result.reklType = reklMatch[1].trim()
  }

  // 2. Проверяем на ТК
  if (text.includes('ТК') || text.includes('TK')) {
    result.tk = true
  }

  // 3. Ищем все пятизначные числа (номера заказов)
  // Используем более надежное регулярное выражение:
  // - (?:^|[^\d]) - начало строки или не-цифра перед числом
  // - \d{5} - ровно 5 цифр
  // - (?:[^\d]|$) - не-цифра после числа или конец строки
  const fiveDigitRegex = /(?:^|[^\d])(\d{5})(?:[^\d]|$)/g
  const fiveDigitNumbers: string[] = []
  let match
  while ((match = fiveDigitRegex.exec(text)) !== null) {
    fiveDigitNumbers.push(match[1])
  }
  result.orderNumbers = Array.from(new Set(fiveDigitNumbers))

  // 4. Ищем все четырехзначные числа (для ФСМ)
  // Фильтруем: берем только те, которые не являются частью пятизначного числа
  const fourDigitRegex = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/g
  const fourDigitNumbers: string[] = []
  const fourDigitPositions: number[] = []
  
  while ((match = fourDigitRegex.exec(text)) !== null) {
    const num = match[1]
    const startPos = match.index + (match[0].startsWith(match[1]) ? 0 : 1)
    
    // Проверяем, не является ли это частью пятизначного числа
    // Проверяем символы до и после
    const before = startPos > 0 ? text[startPos - 1] : ' '
    const after = startPos + 4 < text.length ? text[startPos + 4] : ' '
    
    // Если до и после цифры - это не часть пятизначного числа
    if (!(/\d/.test(before) && /\d/.test(after))) {
      // Также проверяем, что это число не является частью уже найденного пятизначного
      const isPartOfFiveDigit = fiveDigitNumbers.some(fiveNum => {
        const fiveIndex = text.indexOf(fiveNum)
        return fiveIndex >= 0 && 
               startPos >= fiveIndex && 
               startPos + 4 <= fiveIndex + 5
      })
      
      if (!isPartOfFiveDigit) {
        fourDigitNumbers.push(num)
        fourDigitPositions.push(startPos)
      }
    }
  }
  
  if (fourDigitNumbers.length > 0) {
    result.fsm = `FSM${fourDigitNumbers[0]}`
  }

  // 5. Формируем комментарий из всего остального текста
  let commentText = text

  if (reklMatch) {
    commentText = commentText.replace(/REKL\s+[^\s)]+/i, '').trim()
  }

  // Удаляем пятизначные числа
  fiveDigitNumbers.forEach(num => {
    // Используем более точное удаление с учетом границ
    commentText = commentText.replace(new RegExp(`(?:^|[^\\d])${num}(?:[^\\d]|$)`, 'g'), ' ').trim()
  })

  // Удаляем четырехзначные числа (которые уже использованы для ФСМ)
  fourDigitNumbers.forEach(num => {
    commentText = commentText.replace(new RegExp(`(?:^|[^\\d])${num}(?:[^\\d]|$)`, 'g'), ' ').trim()
  })

  commentText = commentText.replace(/\bТК\b/gi, ' ').trim()
  commentText = commentText.replace(/\bTK\b/gi, ' ').trim()

  commentText = commentText
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .replace(/^\s*[,\-]\s*|\s*[,\-]\s*$/g, '')
    .trim()

  if (commentText) {
    result.comment = commentText
  }

  // Логирование для отладки
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ParseOrderNumber] Input: "${text}"`)
    console.log(`[ParseOrderNumber] Result:`, {
      orderNumbers: result.orderNumbers,
      fsm: result.fsm,
      comment: result.comment,
      reklType: result.reklType,
      tk: result.tk,
    })
  }

  return result
}

// Автоматическое определение структуры по заголовкам
function detectColumnMapping(headerRow: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: -1,
    orderNumber: -1,
    wrote: null,
    confirmed: null,
    products: -1,
    comment: null,
    fsm: -1,
    address: -1,
    contact: -1,
    payment: null,
    time: null,
    shipped: null,
    delivered: null,
  }

  headerRow.forEach((header, index) => {
    const lower = header.toLowerCase().trim()
    
    if (lower.includes('дата') || lower.includes('date')) {
      mapping.date = index
    } else if (lower.includes('заказ') || lower.includes('order') || lower.includes('номер')) {
      mapping.orderNumber = index
    } else if (lower.includes('написали') || lower.includes('wrote')) {
      mapping.wrote = index
    } else if (lower.includes('подтвердили') || lower.includes('confirmed') || lower.includes('подтвержден')) {
      mapping.confirmed = index
    } else if (lower.includes('товары') || lower.includes('products') || lower.includes('товар')) {
      mapping.products = index
    } else if (lower.includes('комментарии') || lower.includes('comment') || lower.includes('комментарий')) {
      mapping.comment = index
    } else if (lower.includes('фсм') || lower.includes('fsm')) {
      mapping.fsm = index
    } else if (lower.includes('адрес') || lower.includes('address')) {
      mapping.address = index
    } else if (lower.includes('контакт') || lower.includes('contact')) {
      mapping.contact = index
    } else if (lower.includes('оплачено') || lower.includes('payment') || lower.includes('оплата')) {
      mapping.payment = index
    } else if (lower.includes('время') || lower.includes('time')) {
      mapping.time = index
    } else if (lower.includes('отгрузили') || lower.includes('shipped') || lower.includes('отгрузка')) {
      mapping.shipped = index
    } else if (lower.includes('доставлен') || lower.includes('delivered') || lower.includes('доставка')) {
      mapping.delivered = index
    }
  })

  return mapping
}

// Извлечение spreadsheetId и gid из URL Google Sheets
function parseGoogleSheetsUrl(url: string): { spreadsheetId: string; gid: string } | null {
  try {
    // Формат: https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit?gid={gid}#gid={gid}
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) return null

    const spreadsheetId = match[1]
    const gidMatch = url.match(/[#&]gid=(\d+)/)
    const gid = gidMatch ? gidMatch[1] : '0'

    return { spreadsheetId, gid }
  } catch {
    return null
  }
}

/**
 * POST /api/delivery-crm/import-google-sheets-legacy
 * Импорт из Google Sheets с автоматическим определением структуры
 */
export async function POST(request: NextRequest) {
  try {
    // Убеждаемся, что переменные окружения загружены
    ensureEnvLoaded()
    
    // Проверяем наличие DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('[Import] DATABASE_URL is not set')
      return NextResponse.json(
        {
          error: 'DATABASE_URL is not configured',
          details: 'DATABASE_URL environment variable is missing',
          hint: 'Please add DATABASE_URL to .env.local file',
        },
        { status: 500 }
      )
    }
    
    console.log('[Import] DATABASE_URL is set:', process.env.DATABASE_URL.substring(0, 50) + '...')
    
    // Проверяем подключение к БД простым запросом (Prisma управляет соединениями автоматически)
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('[Import] Database connection check successful')
    } catch (dbError: any) {
      console.error('[Import] Database connection error:', dbError)
      console.error('[Import] Error code:', dbError.code)
      console.error('[Import] Error message:', dbError.message)
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: dbError.message || 'Cannot reach database server',
          code: dbError.code,
          hint: 'Please check DATABASE_URL environment variable in .env.local and ensure database is accessible',
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const url = body.url || body.spreadsheetUrl
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Парсим URL
    const urlData = parseGoogleSheetsUrl(url)
    if (!urlData) {
      return NextResponse.json(
        { error: 'Invalid Google Sheets URL' },
        { status: 400 }
      )
    }

    const { spreadsheetId, gid } = urlData
    const startRow = body.startRow || 1
    
    // Получаем данные через публичный CSV экспорт
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
    
    const csvResponse = await fetch(csvUrl)
    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Google Sheets: ${csvResponse.statusText}` },
        { status: 500 }
      )
    }

    const csvText = await csvResponse.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < startRow) {
      return NextResponse.json(
        { error: `Not enough rows in CSV. Found ${lines.length}, need at least ${startRow}` },
        { status: 400 }
      )
    }

    // Пропускаем строки до startRow
    const dataLines = lines.slice(startRow - 1)
    
    // Ищем строку с заголовками
    let headerRowIndex = -1
    let columnMapping: ColumnMapping | null = null
    
    for (let i = 0; i < Math.min(10, dataLines.length); i++) {
      const values = parseCSVLine(dataLines[i])
      const mapping = detectColumnMapping(values)
      
      // Проверяем, что найдены обязательные поля
      if (mapping.date >= 0 && mapping.orderNumber >= 0 && mapping.products >= 0) {
        headerRowIndex = i
        columnMapping = mapping
        break
      }
    }
    
    if (!columnMapping || headerRowIndex < 0) {
      return NextResponse.json(
        { error: 'Could not detect column structure. Please ensure headers are present.' },
        { status: 400 }
      )
    }

    // Начинаем парсинг данных со строки после заголовков
    const orders: any[] = []
    
    console.log(`[Import] Starting to parse ${dataLines.length - headerRowIndex - 1} data rows`)
    console.log(`[Import] Column mapping:`, columnMapping)
    
    for (let i = headerRowIndex + 1; i < dataLines.length; i++) {
      const values = parseCSVLine(dataLines[i])
      if (values.length < 3) {
        if (i < headerRowIndex + 5) {
          console.log(`[Import] Skipping row ${i + 1}: too few columns (${values.length})`)
        }
        continue
      }
      
      // Дата (обязательное поле)
      const dateValue = values[columnMapping.date]?.trim() || ''
      if (!dateValue) continue
      
      const orderDate = parseDate(dateValue)
      
      // Парсим ячейку "№ Заказа"
      const orderNumberCell = (values[columnMapping.orderNumber] || '').trim()
      if (i < headerRowIndex + 5) {
        console.log(`[Import] Row ${i + 1}, Order Number Cell: "${orderNumberCell}"`)
      }
      const parsedOrder = parseOrderNumberCell(orderNumberCell)
      if (i < headerRowIndex + 5) {
        console.log(`[Import] Row ${i + 1}, Parsed:`, {
          orderNumbers: parsedOrder.orderNumbers,
          fsm: parsedOrder.fsm,
          comment: parsedOrder.comment,
          reklType: parsedOrder.reklType,
          tk: parsedOrder.tk,
        })
      }
      
      // Если нет номеров заказов и нет товаров - пропускаем
      if (parsedOrder.orderNumbers.length === 0 && !values[columnMapping.products]?.trim()) {
        continue
      }
      
      // Получаем остальные данные
      const products = (values[columnMapping.products] || '').trim()
      const existingFsm = columnMapping.fsm >= 0 ? (values[columnMapping.fsm] || '').trim() : ''
      const fsm = existingFsm || parsedOrder.fsm
      const address = columnMapping.address >= 0 ? (values[columnMapping.address] || '').trim() : ''
      const contact = columnMapping.contact >= 0 ? (values[columnMapping.contact] || '').trim() : ''
      
      // Комментарии: сначала из столбца "Комментарии", потом из "№ Заказа"
      const commentFromColumn = columnMapping.comment !== null && columnMapping.comment >= 0 
        ? (values[columnMapping.comment] || '').trim() 
        : ''
      const commentFromOrderNumber = parsedOrder.comment || ''
      const comment = [commentFromColumn, commentFromOrderNumber]
        .filter(Boolean)
        .join(' ')
        .trim()
      
      // Время
      const time = columnMapping.time !== null && columnMapping.time >= 0 
        ? (values[columnMapping.time] || '').trim() 
        : ''
      
      // Чекбоксы
      const wrote = columnMapping.wrote !== null && columnMapping.wrote >= 0
        ? parseBoolean(values[columnMapping.wrote])
        : false
      
      const confirmed = columnMapping.confirmed !== null && columnMapping.confirmed >= 0
        ? parseBoolean(values[columnMapping.confirmed])
        : false
      
      const shipped = columnMapping.shipped !== null && columnMapping.shipped >= 0
        ? parseBoolean(values[columnMapping.shipped])
        : false
      
      const delivered = columnMapping.delivered !== null && columnMapping.delivered >= 0
        ? parseBoolean(values[columnMapping.delivered])
        : false
      
      // Оплата
      let payment = 'Не оплачено'
      if (columnMapping.payment !== null && columnMapping.payment >= 0) {
        const paymentValue = values[columnMapping.payment]?.trim() || ''
        if (paymentValue) {
          if (parseBoolean(paymentValue)) {
            payment = 'Оплачено'
          } else {
            payment = paymentValue || 'Не оплачено'
          }
        }
      }
      
      // Если найдено несколько номеров заказов - создаем группу
      if (parsedOrder.orderNumbers.length > 1) {
        const groupId = `group-${Date.now()}-${Math.random()}`
        
        parsedOrder.orderNumbers.forEach((orderNum, index) => {
          const isFirst = index === 0
          const isLast = index === parsedOrder.orderNumbers.length - 1
          const groupPosition = isFirst ? 'first' : isLast ? 'last' : 'middle'
          
          orders.push({
            date: orderDate,
            orderNumber: orderNum,
            products: products,
            fsm: fsm,
            address: address,
            contact: contact,
            payment: payment,
            time: time,
            comment: comment,
            wrote: wrote,
            confirmed: confirmed,
            shipped: shipped,
            delivered: delivered,
            isEmpty: false,
            reklType: parsedOrder.reklType,
            tk: parsedOrder.tk,
            groupId: groupId,
            groupPosition: groupPosition,
            groupSize: parsedOrder.orderNumbers.length,
          })
        })
      } else if (parsedOrder.orderNumbers.length === 1) {
        // Один номер заказа
        orders.push({
          date: orderDate,
          orderNumber: parsedOrder.orderNumbers[0],
          products: products,
          fsm: fsm,
          address: address,
          contact: contact,
          payment: payment,
          time: time,
          comment: comment,
          wrote: wrote,
          confirmed: confirmed,
          shipped: shipped,
          delivered: delivered,
          isEmpty: false,
          reklType: parsedOrder.reklType,
          tk: parsedOrder.tk,
        })
      } else {
        // Нет номеров заказов, но есть данные - пропускаем такие строки
        // или создаем с уникальным номером только если есть товары или адрес
        if (products.trim() || address.trim() || fsm.trim()) {
          orders.push({
            date: orderDate,
            orderNumber: `import-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            products: products,
            fsm: fsm,
            address: address,
            contact: contact,
            payment: payment,
            time: time,
            comment: comment,
            wrote: wrote,
            confirmed: confirmed,
            shipped: shipped,
            delivered: delivered,
            isEmpty: false,
            reklType: parsedOrder.reklType,
            tk: parsedOrder.tk,
          })
        }
        // Если нет ни товаров, ни адреса, ни ФСМ - пропускаем строку
      }
    }

    console.log(`[Import] Parsed ${orders.length} orders from CSV`)

    // Импортируем в БД
    let imported = 0
    let updated = 0
    const errors: any[] = []
    
    console.log(`[Import] Starting to save ${orders.length} orders to database`)

    for (const orderData of orders) {
      try {
        // Валидация обязательных полей
        if (!orderData.orderNumber || orderData.orderNumber.trim() === '') {
          throw new Error('Order number is required')
        }
        
        if (!orderData.date || isNaN(orderData.date.getTime())) {
          throw new Error('Invalid date')
        }
        
        // Преобразуем дату в ISO строку для сравнения
        const dateISO = orderData.date.toISOString().split('T')[0]
        
        // Формируем tags из reklType и tk
        const tags: string[] = []
        if (orderData.reklType) {
          tags.push('REKL')
        }
        if (orderData.tk) {
          tags.push('ТК')
        }
        
        // Ограничиваем длину строковых полей (на случай очень длинных значений)
        const maxStringLength = 50000
        const maxShortStringLength = 500
        
        // Подготавливаем данные для БД (только поля из схемы Prisma)
        const dbData: any = {
          orderNumber: String(orderData.orderNumber || '').substring(0, maxShortStringLength),
          date: new Date(dateISO),
          products: String(orderData.products || '').substring(0, maxStringLength),
          address: String(orderData.address || '').substring(0, maxStringLength),
          contact: String(orderData.contact || '').substring(0, maxShortStringLength),
          payment: String(orderData.payment || '').substring(0, maxShortStringLength),
          time: String(orderData.time || '').substring(0, 100),
          comment: String(orderData.comment || '').substring(0, maxStringLength),
          fsm: String(orderData.fsm || '').substring(0, maxShortStringLength),
          wrote: Boolean(orderData.wrote),
          confirmed: Boolean(orderData.confirmed),
          shipped: Boolean(orderData.shipped),
          delivered: Boolean(orderData.delivered),
          isEmpty: Boolean(orderData.isEmpty),
          tags: tags.length > 0 ? tags : null,
        }
        
        // Ищем существующий заказ (Prisma автоматически управляет соединениями)
        const existing = await prisma.deliveryOrder.findFirst({
          where: {
            orderNumber: orderData.orderNumber,
            date: new Date(dateISO),
          },
        })

        let saved = false
        if (existing) {
          await prisma.deliveryOrder.update({
            where: { id: existing.id },
            data: dbData,
          })
          updated++
          saved = true
        } else {
          try {
            await prisma.deliveryOrder.create({
              data: dbData,
            })
            imported++
            saved = true
          } catch (createError: any) {
            // Если ошибка уникальности при создании, пытаемся обновить
            if (createError.code === 'P2002') {
              const existingRetry = await prisma.deliveryOrder.findFirst({
                where: {
                  orderNumber: dbData.orderNumber,
                  date: dbData.date,
                },
              })
              if (existingRetry) {
                await prisma.deliveryOrder.update({
                  where: { id: existingRetry.id },
                  data: dbData,
                })
                updated++
                saved = true
              } else {
                throw createError // Если не нашли существующий, пробрасываем ошибку
              }
            } else {
              throw createError // Пробрасываем другие ошибки
            }
          }
        }
        
        if (!saved) {
          throw new Error('Failed to save order')
        }
      } catch (error: any) {
        // Улучшенная обработка ошибок БД
        let errorMessage = error.message || 'Unknown error'
        let errorCode = error.code
        
        // Специальная обработка ошибок подключения к БД
        if (error.message?.includes('Can\'t reach database') || 
            error.code === 'P1001' || 
            error.code === 'P1017') {
          errorMessage = `Database connection error: ${error.message}. Please check DATABASE_URL and ensure database is accessible.`
          errorCode = 'DATABASE_CONNECTION_ERROR'
        }
        
        console.error(`[Import Error] Order: ${orderData.orderNumber}`, {
          error: errorMessage,
          code: errorCode,
          meta: error.meta,
          orderData: {
            orderNumber: orderData.orderNumber,
            date: orderData.date,
            productsLength: orderData.products?.length || 0,
            addressLength: orderData.address?.length || 0,
          }
        })
        errors.push({
          orderNumber: orderData.orderNumber,
          error: errorMessage,
          code: errorCode,
          details: error.meta ? JSON.stringify(error.meta) : undefined,
        })
      }
    }

    // Логируем первые ошибки для диагностики
    if (errors.length > 0) {
      console.error(`[Import] Total errors: ${errors.length}`)
      console.error('[Import] First 5 errors:', errors.slice(0, 5))
    }

    // Prisma автоматически управляет соединениями, не нужно закрывать вручную

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: orders.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 50), // Увеличиваем до 50 для лучшей диагностики
      columnMapping: columnMapping,
    })
  } catch (error: any) {
    console.error('[Legacy Import] Error:', error)
    
    // Улучшенная обработка ошибок подключения к БД
    let errorMessage = error.message || 'Failed to import orders'
    if (error.message?.includes('Can\'t reach database') || 
        error.code === 'P1001' || 
        error.code === 'P1017') {
      errorMessage = `Database connection error: ${error.message}. Please check DATABASE_URL environment variable and ensure database server is running.`
    }
    
    return NextResponse.json(
      {
        error: 'Failed to import orders',
        details: errorMessage,
        hint: error.message?.includes('Can\'t reach database') 
          ? 'Check your DATABASE_URL in .env.local and ensure the database server is accessible'
          : undefined,
      },
      { status: 500 }
    )
  }
}

