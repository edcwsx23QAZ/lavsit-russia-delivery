import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/delivery-crm/orders/:id
 * Обновление конкретного заказа
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()

    const updateData: any = {}
    if (body.orderNumber !== undefined) updateData.orderNumber = body.orderNumber
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.products !== undefined) updateData.products = body.products
    if (body.address !== undefined) updateData.address = body.address
    if (body.contact !== undefined) updateData.contact = body.contact
    if (body.payment !== undefined) updateData.payment = body.payment
    if (body.paymentAmount !== undefined) updateData.paymentAmount = body.paymentAmount
    if (body.time !== undefined) updateData.time = body.time
    if (body.comment !== undefined) updateData.comment = body.comment
    if (body.fsm !== undefined) updateData.fsm = body.fsm
    if (body.wrote !== undefined) updateData.wrote = body.wrote
    if (body.confirmed !== undefined) updateData.confirmed = body.confirmed
    if (body.shipped !== undefined) updateData.shipped = body.shipped
    if (body.delivered !== undefined) updateData.delivered = body.delivered
    if (body.isEmpty !== undefined) updateData.isEmpty = body.isEmpty
    if (body.bitrixData !== undefined) updateData.bitrixData = body.bitrixData

    const order = await prisma.deliveryOrder.update({
      where: { id: orderId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('[Delivery CRM API] Error updating order:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update order',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/delivery-crm/orders/:id
 * Удаление заказа
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    await prisma.deliveryOrder.delete({
      where: { id: orderId },
    })

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    })
  } catch (error: any) {
    console.error('[Delivery CRM API] Error deleting order:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to delete order',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

