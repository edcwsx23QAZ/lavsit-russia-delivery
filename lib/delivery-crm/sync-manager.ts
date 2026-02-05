/**
 * Менеджер синхронизации данных Delivery CRM с Google Sheets
 * Отслеживает все изменения и синхронизирует их с таблицей
 */

import { DeliveryOrder } from '@/app/delivery-crm/page'

export interface ChangeLog {
  type: 'create' | 'update' | 'delete' | 'move' | 'group' | 'ungroup'
  orderId: string
  field?: string
  oldValue?: any
  newValue?: any
  timestamp: string
}

class SyncManager {
  private changeLog: ChangeLog[] = []
  private syncUrl: string | null = null
  private autoSyncTimer: NodeJS.Timeout | null = null
  private isSyncing: boolean = false
  private lastSyncTime: number = 0
  private pendingOrders: DeliveryOrder[] | null = null
  private lastChangeTime: number = 0
  private readonly AUTO_SYNC_DELAY_MS = 30000 // 30 секунд после последнего изменения
  private readonly MIN_SYNC_INTERVAL_MS = 5000 // Минимум 5 секунд между синхронизациями

  constructor() {
    // Получаем URL из переменных окружения (доступно на клиенте через NEXT_PUBLIC_)
    if (typeof window !== 'undefined') {
      // В Next.js переменные с префиксом NEXT_PUBLIC_ доступны на клиенте
      this.syncUrl = (process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL as string) || null
    }
  }

  /**
   * Установка URL для синхронизации
   */
  setSyncUrl(url: string) {
    this.syncUrl = url
  }

  /**
   * Логирование изменения и планирование автоматической синхронизации
   */
  logChange(change: Omit<ChangeLog, 'timestamp'>) {
    const changeLog: ChangeLog = {
      ...change,
      timestamp: new Date().toISOString()
    }
    
    this.changeLog.push(changeLog)
    this.lastChangeTime = Date.now()
    
    // Отправляем изменение в историю Google Sheets (если URL настроен)
    if (this.syncUrl) {
      this.sendChangeToSheets(changeLog).catch(error => {
        console.error('Failed to log change to Google Sheets:', error)
      })
    }
    
    // Планируем автоматическую полную синхронизацию через 30 секунд после последнего изменения
    this.scheduleAutoSync()
  }

  /**
   * Установка заказов для автоматической синхронизации
   */
  setOrdersForSync(orders: DeliveryOrder[]) {
    this.pendingOrders = orders
    this.lastChangeTime = Date.now()
    // Планируем автоматическую синхронизацию
    this.scheduleAutoSync()
  }

  /**
   * Отправка отдельного изменения в историю
   * Использует API route для обхода CORS ограничений
   */
  private async sendChangeToSheets(change: ChangeLog) {
    try {
      // Используем API route вместо прямого обращения к Google Apps Script
      const apiUrl = '/api/delivery-crm/sync-google-sheets'
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logChange',
          change: change
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to log change to Google Sheets:', error)
      // Не пробрасываем ошибку, чтобы не блокировать работу приложения
    }
  }

  /**
   * Полная синхронизация всех данных
   * Использует API route для обхода CORS ограничений
   */
  async syncAll(orders: DeliveryOrder[]): Promise<{ success: boolean; error?: string }> {
    // Проверяем, не слишком ли часто синхронизируем
    const now = Date.now()
    if (now - this.lastSyncTime < this.MIN_SYNC_INTERVAL_MS) {
      console.log('Sync skipped: too frequent')
      return { success: true }
    }

    if (this.isSyncing) {
      console.log('Sync skipped: already syncing')
      return { success: true }
    }

    this.isSyncing = true
    this.lastSyncTime = now

    try {
      // Фильтруем пустые заказы
      const validOrders = orders.filter(o => !o.isEmpty)
      
      console.log(`🔄 Syncing ${validOrders.length} orders to Google Sheets...`)

      // Используем API route вместо прямого обращения к Google Apps Script
      // Это обходит CORS ограничения
      const apiUrl = '/api/delivery-crm/sync-google-sheets'
      
      console.log('📤 Using API route:', apiUrl)
      console.log('📋 Orders to sync:', validOrders.length)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'syncAll',
          orders: validOrders
        })
      })

      console.log('📥 Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { error: errorText }
        }
        console.error('❌ Response error:', errorData)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('📥 Response result:', result)
      
      if (result.success) {
        console.log(`✅ Synced ${result.rowsWritten || validOrders.length} orders to Google Sheets`)
        return { success: true }
      } else {
        throw new Error(result.error || 'Unknown error from Google Apps Script')
      }
    } catch (error: any) {
      console.error('❌ Failed to sync to Google Sheets:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
      return { 
        success: false, 
        error: error.message || 'Sync failed' 
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Планирование автоматической синхронизации через 30 секунд после последнего изменения
   */
  private scheduleAutoSync() {
    // Очищаем предыдущий таймер
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer)
    }

    // Устанавливаем новый таймер на 30 секунд
    this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null
      // Автоматически запускаем синхронизацию, если есть pending заказы
      if (this.pendingOrders) {
        console.log('🔄 Auto-syncing after 30 seconds of inactivity...')
        this.syncAll(this.pendingOrders).catch(error => {
          console.error('Auto-sync failed:', error)
        })
      }
    }, this.AUTO_SYNC_DELAY_MS)
  }

  /**
   * Получение истории изменений
   */
  getChangeLog(): ChangeLog[] {
    return [...this.changeLog]
  }

  /**
   * Очистка истории изменений
   */
  clearChangeLog() {
    this.changeLog = []
  }
}

// Экспортируем singleton
export const syncManager = new SyncManager()

