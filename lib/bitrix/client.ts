import axios, { AxiosInstance, AxiosError } from 'axios'

export interface BitrixOrder {
  ID: string
  ACCOUNT_NUMBER: string
  DATE_INSERT: string
  STATUS_ID: string
  STAGE_ID: string
  PRICE: string
  CURRENCY_ID: string
  SUM_PAID: string
  PROPERTY_VALUES?: {
    [key: string]: string | number
  }
  PRODUCTS?: Array<{
    ID: string
    NAME: string
    QUANTITY: number
    PRICE: number
    DISCOUNT_TYPE_ID?: string
    DISCOUNT_RATE?: number
  }>
  [key: string]: any
}

export interface BitrixOrderFields {
  [key: string]: {
    ID: string
    NAME: string
    TYPE: string
    IS_REQUIRED: string
    MULTIPLE: string
    SETTINGS?: any
  }
}

export interface BitrixResponse<T = any> {
  result?: T
  error?: string
  error_description?: string
  error_exception?: any
}

export class BitrixClient {
  private client: AxiosInstance
  private domain: string
  private apiKey: string
  private baseUrl: string

  constructor(domain?: string, apiKey?: string) {
    this.domain = domain || process.env.BITRIX_DOMAIN || ''
    this.apiKey = apiKey || process.env.BITRIX_REST_API_KEY || ''

    if (!this.domain || !this.apiKey) {
      throw new Error('BITRIX_DOMAIN and BITRIX_REST_API_KEY must be set')
    }

    // Формируем базовый URL для REST API
    this.baseUrl = `https://${this.domain}/rest`

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Выполняет запрос к REST API Битрикса
   */
  private async request<T = any>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    try {
      const response = await this.client.post(`/${method}`, {
        ...params,
        auth: this.apiKey,
      })

      const data: BitrixResponse<T> = response.data

      if (data.error) {
        throw new Error(
          `Bitrix API error: ${data.error} - ${data.error_description || ''}`
        )
      }

      return data.result as T
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BitrixResponse>
        if (axiosError.response?.data?.error) {
          throw new Error(
            `Bitrix API error: ${axiosError.response.data.error} - ${
              axiosError.response.data.error_description || ''
            }`
          )
        }
        throw new Error(
          `Network error: ${error.message}`
        )
      }
      throw error
    }
  }

  /**
   * Получает заказ по ID
   */
  async getOrderById(orderId: string): Promise<BitrixOrder> {
    const order = await this.request<BitrixOrder>('crm.deal.get', {
      id: orderId,
    })

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`)
    }

    return order
  }

  /**
   * Получает список полей заказа (сделки)
   */
  async getOrderFields(): Promise<BitrixOrderFields> {
    return this.request<BitrixOrderFields>('crm.deal.fields')
  }

  /**
   * Получает товары заказа
   */
  async getOrderProducts(orderId: string): Promise<BitrixOrder['PRODUCTS']> {
    const products = await this.request<BitrixOrder['PRODUCTS']>(
      'crm.deal.productrows.get',
      {
        id: orderId,
      }
    )

    return products || []
  }

  /**
   * Получает свойства заказа
   */
  async getOrderProperties(orderId: string): Promise<Record<string, any>> {
    const order = await this.getOrderById(orderId)
    return order.PROPERTY_VALUES || {}
  }

  /**
   * Получает полные данные заказа включая товары
   */
  async getFullOrderData(orderId: string): Promise<BitrixOrder> {
    const order = await this.getOrderById(orderId)
    const products = await this.getOrderProducts(orderId)

    return {
      ...order,
      PRODUCTS: products,
    }
  }

  /**
   * Обновляет заказ в Битриксе
   */
  async updateOrder(
    orderId: string,
    fields: Record<string, any>
  ): Promise<boolean> {
    const result = await this.request<number>('crm.deal.update', {
      id: orderId,
      fields,
    })

    return result > 0
  }
}

// Singleton instance
let bitrixClientInstance: BitrixClient | null = null

export function getBitrixClient(): BitrixClient {
  if (!bitrixClientInstance) {
    bitrixClientInstance = new BitrixClient()
  }
  return bitrixClientInstance
}


