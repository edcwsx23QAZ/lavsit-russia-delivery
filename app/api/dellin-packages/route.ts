import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://api.dellin.ru/v1/references/packages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B'
      })
    })

    if (!response.ok) {
      console.error('❌ Ошибка от API Деловых Линий:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Ошибка получения справочника упаковок' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('❌ Ошибка запроса к API Деловых Линий:', error)
    return NextResponse.json(
      { error: 'Сетевая ошибка' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}