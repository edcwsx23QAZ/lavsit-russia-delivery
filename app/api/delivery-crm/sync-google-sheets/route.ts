import { NextRequest, NextResponse } from 'next/server'

// Отключаем static generation для API route
export const dynamic = 'force-dynamic'

/**
 * API route для проксирования запросов к Google Apps Script
 * Решает проблему CORS - запросы идут с сервера, где нет CORS ограничений
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orders, change } = body

    // Получаем URL Google Apps Script из переменных окружения
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL

    if (!scriptUrl) {
      return NextResponse.json(
        { success: false, error: 'Google Apps Script URL not configured' },
        { status: 500 }
      )
    }

    // Подготавливаем данные для отправки
    const requestBody: any = { action }

    if (action === 'syncAll' && orders) {
      requestBody.orders = orders
    } else if (action === 'logChange' && change) {
      requestBody.change = change
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action or missing data' },
        { status: 400 }
      )
    }

    // Отправляем запрос к Google Apps Script с сервера (без CORS проблем)
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Apps Script error:', errorText)
      return NextResponse.json(
        { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` },
        { status: response.status }
      )
    }

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error proxying to Google Apps Script:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

