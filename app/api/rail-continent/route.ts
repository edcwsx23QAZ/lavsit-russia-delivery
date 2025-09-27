import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const params = await request.json();
    
    // Строим URL для API Rail Continent
    const apiUrl = new URL('https://www.railcontinent.ru/ajax/api.php');
    
    // Добавляем параметры в URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        apiUrl.searchParams.append(key, String(value));
      }
    });

    console.log('🚂 Rail Continent API запрос:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('🚂 Rail Continent API ошибка:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: `API ошибка: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('🚂 Rail Continent API ответ:', JSON.stringify(data, null, 2));

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('🚂 Rail Continent API критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}