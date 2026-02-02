/**
 * Скрипт для импорта данных из Google Sheets в Delivery CRM
 * 
 * Использование:
 * 1. Экспортируйте данные из Google Sheets в CSV (начиная со строки 1622)
 * 2. Сохраните файл как delivery-data.csv в корне проекта
 * 3. Запустите: npx tsx scripts/import-google-sheets.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

interface GoogleSheetsRow {
  [key: string]: string
}

// Маппинг столбцов из Google Sheets в поля DeliveryOrder
// Нужно будет настроить в зависимости от реальных названий столбцов
const columnMapping: Record<string, keyof {
  date: string
  orderNumber: string
  wrote: boolean
  confirmed: boolean
  products: string
  fsm: string
  address: string
  contact: string
  payment: string
  time: string
  comment: string
  shipped: boolean
  delivered: boolean
}> = {
  'Дата': 'date',
  '№ заказа': 'orderNumber',
  'Написали': 'wrote',
  'Подтвердили': 'confirmed',
  'Товары': 'products',
  'ФСМ': 'fsm',
  'Адрес': 'address',
  'Контакт': 'contact',
  'Оплата': 'payment',
  'Время': 'time',
  'Комментарий': 'comment',
  'Отгрузили': 'shipped',
  'Доставлен': 'delivered',
}

function parseBoolean(value: string): boolean {
  if (!value) return false
  const lower = value.toLowerCase().trim()
  return lower === 'да' || lower === 'yes' || lower === 'true' || lower === '1' || lower === '✓' || lower === 'v' || lower === '+'
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  
  // Попытка парсинга различных форматов даты
  // DD.MM.YYYY или DD.MM
  const parts = dateStr.split('.')
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // месяцы в JS начинаются с 0
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()
    return new Date(year, month, day)
  }
  
  // Попытка парсинга как ISO строки
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  
  return new Date()
}

async function importFromCSV() {
  const csvPath = path.join(process.cwd(), 'delivery-data.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error('Файл delivery-data.csv не найден в корне проекта')
    console.log('Пожалуйста, экспортируйте данные из Google Sheets (начиная со строки 1622) в CSV и сохраните как delivery-data.csv')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  
  // Парсим CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as GoogleSheetsRow[]

  console.log(`Найдено ${records.length} строк для импорта`)

  const orders = []
  
  for (const row of records) {
    // Определяем дату
    let date: Date
    if (columnMapping['Дата'] && row['Дата']) {
      date = parseDate(row['Дата'])
    } else {
      // Пытаемся найти дату в других столбцах
      const dateColumn = Object.keys(row).find(key => 
        key.toLowerCase().includes('дата') || key.toLowerCase().includes('date')
      )
      date = dateColumn ? parseDate(row[dateColumn]) : new Date()
    }

    // Создаем заказ
    const order: any = {
      date,
      orderNumber: row[columnMapping['№ заказа']] || row['№ заказа'] || '',
      products: row[columnMapping['Товары']] || row['Товары'] || '',
      fsm: row[columnMapping['ФСМ']] || row['ФСМ'] || '',
      address: row[columnMapping['Адрес']] || row['Адрес'] || '',
      contact: row[columnMapping['Контакт']] || row['Контакт'] || '',
      payment: row[columnMapping['Оплата']] || row['Оплата'] || '',
      time: row[columnMapping['Время']] || row['Время'] || '',
      comment: row[columnMapping['Комментарий']] || row['Комментарий'] || '',
      wrote: parseBoolean(row[columnMapping['Написали']] || row['Написали'] || ''),
      confirmed: parseBoolean(row[columnMapping['Подтвердили']] || row['Подтвердили'] || ''),
      shipped: parseBoolean(row[columnMapping['Отгрузили']] || row['Отгрузили'] || ''),
      delivered: parseBoolean(row[columnMapping['Доставлен']] || row['Доставлен'] || ''),
      isEmpty: false,
    }

    // Пропускаем пустые строки
    if (!order.orderNumber && !order.products && !order.address) {
      continue
    }

    orders.push(order)
  }

  console.log(`Подготовлено ${orders.length} заказов для импорта`)

  // Импортируем в БД
  let imported = 0
  let errors = 0

  for (const order of orders) {
    try {
      await prisma.deliveryOrder.create({
        data: order,
      })
      imported++
    } catch (error: any) {
      console.error(`Ошибка при импорте заказа ${order.orderNumber}:`, error.message)
      errors++
    }
  }

  console.log(`\nИмпорт завершен:`)
  console.log(`  Успешно импортировано: ${imported}`)
  console.log(`  Ошибок: ${errors}`)
}

importFromCSV()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

