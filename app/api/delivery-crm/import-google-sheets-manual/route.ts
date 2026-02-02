import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface GoogleSheetsRow {
  date: string
  orderNumber: string
  wrote: string | boolean
  confirmed: string | boolean
  products: string
  fsm: string
  address: string
  contact: string
  payment: string
  time: string
  comment: string
  shipped: string | boolean
  delivered: string | boolean
}

function parseDate(dateStr: string): Date {
  if (!dateStr || !dateStr.trim()) {
    return new Date()
  }

  // Формат DD.MM или DD.MM.YYYY
  const parts = dateStr.trim().split('.')
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day)
    }
  }

  // Попытка парсинга как ISO строки
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  return new Date()
}

function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value
  if (!value) return false
  const lower = String(value).toLowerCase().trim()
  return lower === 'да' || lower === 'yes' || lower === 'true' || lower === '1' || 
         lower === '✓' || lower === 'v' || lower === '+' || lower === 'x' ||
         lower === 'checked' || lower === 'отмечено'
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

/**
 * POST /api/delivery-crm/import-google-sheets-manual
 * Ручной импорт данных из Google Sheets (начиная со строки 1622)
 */
export async function POST(request: NextRequest) {
  try {
    const spreadsheetId = '1Cvl-0P0uBoYupGGbZ2AG70S0VDyrAII8L0vNjUykOsI'
    const gid = '0'
    const startRow = 1622
    
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
    if (dataLines.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found after start row' },
        { status: 400 }
      )
    }

    const orders: any[] = []
    
    // Парсим данные (прямой маппинг по индексам: A=0, B=1, C=2, и т.д.)
    for (let i = 1; i < dataLines.length; i++) {
      const values = parseCSVLine(dataLines[i])
      if (values.length === 0) continue
      
      // A (0): Дата - обязательное поле
      if (!values[0] || !values[0].trim()) {
        continue // Пропускаем строки без даты
      }

      const order: any = {
        date: parseDate(values[0]),
        orderNumber: values[1] || '',
        products: '',
        fsm: '',
        address: values[6] || '',
        contact: values[7] || '',
        payment: values[8] || '',
        time: values[9] || '',
        comment: '',
        wrote: false,
        confirmed: false,
        shipped: parseBoolean(values[10]),
        delivered: parseBoolean(values[11]),
        isEmpty: false,
      }

      // C (2): Написали - описание товаров
      const wroteText = values[2] || ''
      
      // D (3): Подтвердил
      const confirmedText = values[3] || ''
      
      // E (4): Товар
      const productText = values[4] || ''
      
      // Объединяем C (Написали) и E (Товар) в products
      order.products = [wroteText, productText].filter(t => t.trim()).join('\n')
      
      // F (5): ФСМ
      const fsmText = values[5] || ''
      order.fsm = fsmText || confirmedText || ''
      
      // Написали - если есть текст в столбце C
      order.wrote = !!wroteText.trim()
      
      // Подтвердили - если есть текст в столбце D или F (ФСМ)
      order.confirmed = !!confirmedText.trim() || !!fsmText.trim()
      
      // Пропускаем пустые строки
      if (!order.orderNumber && !order.products && !order.address) {
        continue
      }

      orders.push(order)
    }

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'No valid orders found to import' },
        { status: 400 }
      )
    }

    // Импортируем в БД
    let imported = 0
    let updated = 0
    const errors: any[] = []

    for (const orderData of orders) {
      try {
        // Проверяем, существует ли заказ с таким номером и датой
        const existing = await prisma.deliveryOrder.findFirst({
          where: {
            orderNumber: orderData.orderNumber,
            date: orderData.date,
          },
        })

        if (existing) {
          // Обновляем существующий заказ
          await prisma.deliveryOrder.update({
            where: { id: existing.id },
            data: orderData,
          })
          updated++
        } else {
          // Создаем новый заказ
          await prisma.deliveryOrder.create({
            data: orderData,
          })
          imported++
        }
      } catch (error: any) {
        errors.push({
          orderNumber: orderData.orderNumber,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: orders.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // Показываем только первые 10 ошибок
    })
  } catch (error: any) {
    console.error('[Manual Import] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to import orders',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

