import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format, parse } from 'date-fns'

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

/**
 * POST /api/delivery-crm/import-google-sheets
 * Импорт данных из Google Sheets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orders: googleSheetsOrders } = body

    if (!Array.isArray(googleSheetsOrders)) {
      return NextResponse.json(
        { error: 'orders must be an array' },
        { status: 400 }
      )
    }

    const importedOrders = []
    const errors = []

    for (const row of googleSheetsOrders) {
      try {
        // Пропускаем пустые строки
        if (!row.orderNumber && !row.products && !row.address) {
          continue
        }

        const orderData: any = {
          date: parseDate(row.date || ''),
          orderNumber: String(row.orderNumber || ''),
          products: String(row.products || ''),
          fsm: String(row.fsm || ''),
          address: String(row.address || ''),
          contact: String(row.contact || ''),
          payment: String(row.payment || ''),
          time: String(row.time || ''),
          comment: String(row.comment || ''),
          wrote: parseBoolean(row.wrote),
          confirmed: parseBoolean(row.confirmed),
          shipped: parseBoolean(row.shipped),
          delivered: parseBoolean(row.delivered),
          isEmpty: false,
        }

        // Проверяем, существует ли заказ с таким номером
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
        } else {
          // Создаем новый заказ
          await prisma.deliveryOrder.create({
            data: orderData,
          })
        }

        importedOrders.push(orderData.orderNumber)
      } catch (error: any) {
        errors.push({
          row: row.orderNumber || 'unknown',
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedOrders.length,
      errors: errors.length,
      errorDetails: errors,
    })
  } catch (error: any) {
    console.error('[Import] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to import orders',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

