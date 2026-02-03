import { NextRequest, NextResponse } from 'next/server'
import { getBitrixClient } from '@/lib/bitrix/client'
import { mapBitrixOrderToDeliveryOrder } from '@/lib/bitrix/mapper'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bitrix/order/:id
 * Получение заказа из Битрикса по ID и сохранение в БД
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Получаем данные из Битрикса
    const bitrixClient = getBitrixClient()
    const bitrixOrder = await bitrixClient.getFullOrderData(orderId)

    // Маппинг данных
    const deliveryOrderData = mapBitrixOrderToDeliveryOrder(bitrixOrder)

    // Проверяем, существует ли заказ с таким bitrixOrderId
    const existingOrder = await prisma.deliveryOrder.findUnique({
      where: { bitrixOrderId: orderId },
    })

    let deliveryOrder

    if (existingOrder) {
      // Обновляем существующий заказ
      deliveryOrder = await prisma.deliveryOrder.update({
        where: { id: existingOrder.id },
        data: {
          ...deliveryOrderData,
          updatedAt: new Date(),
        } as any,
      })
    } else {
      // Создаем новый заказ
      deliveryOrder = await prisma.deliveryOrder.create({
        data: deliveryOrderData as any,
      })
    }

    return NextResponse.json({
      success: true,
      order: deliveryOrder,
    })
  } catch (error: any) {
    console.error('[Bitrix API] Error fetching order:', error)

    // Обработка специфичных ошибок
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Order not found in Bitrix' },
        { status: 404 }
      )
    }

    if (error.message?.includes('BITRIX_DOMAIN') || error.message?.includes('BITRIX_REST_API_KEY')) {
      return NextResponse.json(
        { error: 'Bitrix configuration is missing. Please set BITRIX_DOMAIN and BITRIX_REST_API_KEY environment variables.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch order from Bitrix',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

