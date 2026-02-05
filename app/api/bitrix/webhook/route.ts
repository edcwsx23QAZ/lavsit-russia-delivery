import { NextRequest, NextResponse } from 'next/server'
import { getBitrixClient } from '@/lib/bitrix/client'
import { mapBitrixOrderToDeliveryOrder } from '@/lib/bitrix/mapper'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bitrix/webhook
 * Прием webhook от Битрикса при изменении стадии сделки на "Доставка согласована"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Проверяем, что это событие изменения стадии сделки
    const event = body.event || body.EVENT
    const data = body.data || body.DATA || body

    // Если это событие изменения стадии
    if (event === 'ONCRMDEALUPDATE' || event === 'ONCRMDEALSTAGEUPDATE' || data.STAGE_ID) {
      const dealId = data.ID || data.id || data.DEAL_ID

      if (!dealId) {
        return NextResponse.json(
          { error: 'Deal ID is missing' },
          { status: 400 }
        )
      }

      // Проверяем, что стадия = "Доставка согласована"
      // В Битриксе стадия может быть передана как STAGE_ID или в данных сделки
      const stageId = data.STAGE_ID || data.stage_id || data.STAGE?.ID
      
      // Если стадия не указана, получаем данные сделки из Битрикса
      let bitrixOrder
      const bitrixClient = getBitrixClient()
      
      try {
        bitrixOrder = await bitrixClient.getFullOrderData(String(dealId))
      } catch (error: any) {
        console.error('[Bitrix Webhook] Error fetching order:', error)
        return NextResponse.json(
          { error: 'Failed to fetch order from Bitrix', details: error.message },
          { status: 500 }
        )
      }

      // Проверяем стадию сделки
      // В зависимости от конфигурации Битрикса, стадия может быть в разных полях
      const currentStageId = bitrixOrder.STAGE_ID || bitrixOrder.STAGE?.ID || stageId
      
      // Здесь нужно указать ID стадии "Доставка согласована" из вашего Битрикса
      // Это значение должно быть настроено в переменных окружения
      const deliveryAgreedStageId = process.env.BITRIX_DELIVERY_AGREED_STAGE_ID

      // Если стадия не указана в env, принимаем все заказы
      // В реальном сценарии лучше проверять стадию
      const shouldProcess = !deliveryAgreedStageId || currentStageId === deliveryAgreedStageId

      if (!shouldProcess) {
        return NextResponse.json({
          success: true,
          message: 'Stage does not match delivery agreed stage, skipping',
        })
      }

      // Извлекаем дату и время доставки из webhook данных
      // Они могут быть в свойствах сделки или в данных webhook
      const deliveryDate = 
        data.DELIVERY_DATE || 
        data.delivery_date || 
        data.DATE || 
        data.date ||
        data.PROPERTY_VALUES?.DELIVERY_DATE ||
        data.PROPERTY_VALUES?.UF_CRM_DELIVERY_DATE ||
        format(new Date(), 'yyyy-MM-dd')

      const deliveryTime = 
        data.DELIVERY_TIME || 
        data.delivery_time || 
        data.TIME || 
        data.time ||
        data.PROPERTY_VALUES?.DELIVERY_TIME ||
        data.PROPERTY_VALUES?.UF_CRM_DELIVERY_TIME ||
        ''

      // Маппинг данных из Битрикса
      const deliveryOrderData = mapBitrixOrderToDeliveryOrder(
        bitrixOrder,
        deliveryDate,
        deliveryTime
      )

      // Проверяем, существует ли заказ с таким bitrixOrderId
      const existingOrder = await prisma.deliveryOrder.findUnique({
        where: { bitrixOrderId: String(dealId) },
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
        message: 'Order processed successfully',
        order: {
          id: deliveryOrder.id,
          bitrixOrderId: deliveryOrder.bitrixOrderId,
          orderNumber: deliveryOrder.orderNumber,
          date: deliveryOrder.date,
        },
      })
    }

    // Если это другое событие, просто подтверждаем получение
    return NextResponse.json({
      success: true,
      message: 'Webhook received but event type not processed',
      event,
    })
  } catch (error: any) {
    console.error('[Bitrix Webhook] Error processing webhook:', error)

    // Всегда возвращаем 200, чтобы Битрикс не повторял запрос
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        details: error.message,
      },
      { status: 200 } // Возвращаем 200, чтобы Битрикс не повторял запрос
    )
  }
}

/**
 * GET /api/bitrix/webhook
 * Проверка доступности webhook (для тестирования)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Bitrix webhook endpoint is available',
    timestamp: new Date().toISOString(),
  })
}

