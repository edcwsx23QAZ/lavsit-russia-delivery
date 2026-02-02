import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * GET /api/delivery-crm/orders
 * Получение всех заказов с фильтрацией по дате
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeEmpty = searchParams.get('includeEmpty') !== 'false'

    const where: any = {}

    // Фильтрация по дате
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    // Исключаем пустые строки, если не указано иное
    if (!includeEmpty) {
      where.isEmpty = false
    }

    const orders = await prisma.deliveryOrder.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    })
  } catch (error: any) {
    console.error('[Delivery CRM API] Error fetching orders:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery-crm/orders
 * Создание или обновление заказа
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Валидация обязательных полей
    if (!body.date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Преобразуем данные
    const orderData: any = {
      orderNumber: body.orderNumber || '',
      date: new Date(body.date),
      products: body.products || '',
      address: body.address || '',
      contact: body.contact || '',
      payment: body.payment || '',
      paymentAmount: body.paymentAmount ? parseFloat(body.paymentAmount) : null,
      time: body.time || '',
      comment: body.comment || '',
      fsm: body.fsm || '',
      wrote: body.wrote || false,
      confirmed: body.confirmed || false,
      shipped: body.shipped || false,
      delivered: body.delivered || false,
      isEmpty: body.isEmpty || false,
    }

    // Если есть bitrixOrderId, проверяем существование
    if (body.bitrixOrderId) {
      orderData.bitrixOrderId = body.bitrixOrderId
    }

    if (body.bitrixData) {
      orderData.bitrixData = body.bitrixData
    }

    let order

    if (body.id) {
      // Обновление существующего заказа
      order = await prisma.deliveryOrder.update({
        where: { id: body.id },
        data: orderData,
      })
    } else if (body.bitrixOrderId) {
      // Проверяем, существует ли заказ с таким bitrixOrderId
      const existing = await prisma.deliveryOrder.findUnique({
        where: { bitrixOrderId: body.bitrixOrderId },
      })

      if (existing) {
        order = await prisma.deliveryOrder.update({
          where: { id: existing.id },
          data: orderData,
        })
      } else {
        order = await prisma.deliveryOrder.create({
          data: orderData,
        })
      }
    } else {
      // Создание нового заказа
      order = await prisma.deliveryOrder.create({
        data: orderData,
      })
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('[Delivery CRM API] Error creating/updating order:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Order with this bitrixOrderId already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create/update order',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/delivery-crm/orders
 * Массовое обновление заказов
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!Array.isArray(body.orders)) {
      return NextResponse.json(
        { error: 'orders must be an array' },
        { status: 400 }
      )
    }

    const results = await Promise.allSettled(
      body.orders.map(async (orderData: any) => {
        if (!orderData.id) {
          throw new Error('Order ID is required for update')
        }

        const updateData: any = {}
        if (orderData.orderNumber !== undefined) updateData.orderNumber = orderData.orderNumber
        if (orderData.date !== undefined) updateData.date = new Date(orderData.date)
        if (orderData.products !== undefined) updateData.products = orderData.products
        if (orderData.address !== undefined) updateData.address = orderData.address
        if (orderData.contact !== undefined) updateData.contact = orderData.contact
        if (orderData.payment !== undefined) updateData.payment = orderData.payment
        if (orderData.paymentAmount !== undefined) updateData.paymentAmount = orderData.paymentAmount
        if (orderData.time !== undefined) updateData.time = orderData.time
        if (orderData.comment !== undefined) updateData.comment = orderData.comment
        if (orderData.fsm !== undefined) updateData.fsm = orderData.fsm
        if (orderData.wrote !== undefined) updateData.wrote = orderData.wrote
        if (orderData.confirmed !== undefined) updateData.confirmed = orderData.confirmed
        if (orderData.shipped !== undefined) updateData.shipped = orderData.shipped
        if (orderData.delivered !== undefined) updateData.delivered = orderData.delivered
        if (orderData.isEmpty !== undefined) updateData.isEmpty = orderData.isEmpty

        return await prisma.deliveryOrder.update({
          where: { id: orderData.id },
          data: updateData,
        })
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      updated: successful,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled'
          ? { success: true, order: r.value }
          : { success: false, error: r.reason?.message }
      ),
    })
  } catch (error: any) {
    console.error('[Delivery CRM API] Error bulk updating orders:', error)
    return NextResponse.json(
      {
        error: 'Failed to update orders',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

