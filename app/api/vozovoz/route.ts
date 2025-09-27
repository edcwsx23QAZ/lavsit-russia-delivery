import { NextRequest, NextResponse } from 'next/server';

// Токен Возовоз API
const VOZOVOZ_TOKEN = 'efijwYxNUE8ahEqlnRT8oZ00R3rDDBjcLgGsTLLp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Строим URL для API Vozovoz с токеном
    const apiUrl = `https://vozovoz.org/api/?token=${VOZOVOZ_TOKEN}`;

    console.log('🚚 Vozovoz API запрос:', JSON.stringify(body, null, 2));
    console.log('🚚 Vozovoz API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify(body)
    });

    console.log(`🚚 Vozovoz API статус: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error('🚚 Vozovoz API ошибка:', response.status, response.statusText);
      
      const errorText = await response.text();
      console.error('🚚 Vozovoz API ошибка тело:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `API ошибка: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('🚚 Vozovoz API ответ:', JSON.stringify(data, null, 2));

    // Проверяем на наличие ошибок в ответе Vozovoz
    if (data.error) {
      console.error('🚚 Vozovoz API вернул ошибку:', data.error);
      return NextResponse.json({
        success: false,
        error: data.error.message || 'Vozovoz API error',
        details: data.error
      }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('🚚 Vozovoz API критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера',
      details: error.stack
    }, { status: 500 });
  }
}