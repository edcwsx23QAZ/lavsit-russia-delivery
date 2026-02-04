import { BitrixOrder } from './client'
import { DeliveryOrder } from '@prisma/client'

/**
 * Маппинг данных заказа из Битрикса в формат DeliveryOrder
 */
export function mapBitrixOrderToDeliveryOrder(
  bitrixOrder: BitrixOrder,
  deliveryDate?: string,
  deliveryTime?: string
): Partial<DeliveryOrder> {
  const properties = bitrixOrder.PROPERTY_VALUES || {}
  
  // Форматирование товаров
  const products = bitrixOrder.PRODUCTS
    ? bitrixOrder.PRODUCTS.map(
        (p) => `${p.NAME}${p.QUANTITY > 1 ? ` (${p.QUANTITY} шт.)` : ''}`
      ).join(', ')
    : ''

  // Определение статуса оплаты
  const price = parseFloat(bitrixOrder.PRICE || '0')
  const sumPaid = parseFloat(bitrixOrder.SUM_PAID || '0')
  let paymentStatus = ''
  if (sumPaid >= price) {
    paymentStatus = 'Оплачено'
  } else if (sumPaid > 0) {
    paymentStatus = 'Частично оплачено'
  } else {
    paymentStatus = 'Не оплачено'
  }

  // Извлечение адреса из свойств
  // Обычно в Битриксе адрес хранится в свойствах типа PROPERTY_ADDRESS или подобных
  const address = 
    properties['ADDRESS'] ||
    properties['UF_CRM_ADDRESS'] ||
    properties['DELIVERY_ADDRESS'] ||
    ''

  // Извлечение контактов
  // Контакты могут быть в разных полях
  const contact = 
    properties['CONTACT_PHONE'] ||
    properties['UF_CRM_PHONE'] ||
    properties['PHONE'] ||
    ''

  // Извлечение ФСМ
  const fsm = 
    properties['FSM'] ||
    properties['UF_CRM_FSM'] ||
    ''

  // Дата доставки - используем переданную или текущую дату
  const date = deliveryDate 
    ? new Date(deliveryDate)
    : new Date()

  return {
    bitrixOrderId: bitrixOrder.ID,
    orderNumber: bitrixOrder.ACCOUNT_NUMBER || bitrixOrder.ID,
    date,
    products,
    address: String(address),
    contact: String(contact),
    payment: paymentStatus,
    paymentAmount: sumPaid > 0 ? sumPaid : price,
    time: deliveryTime || '',
    comment: '',
    fsm: String(fsm),
    wrote: false,
    confirmed: false,
    shipped: false,
    delivered: false,
    isEmpty: false,
    bitrixData: bitrixOrder as any,
  }
}


