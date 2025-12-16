import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Получение категорий груза Vozovoz
 * 
 * Использует directQuery.getCargoTypes для получения списка категорий
 * Документация: vozovoz-docs/ru/docs/object/directQuery/getCargoTypes.md
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 100, offset = 0 } = body;

    console.log('📦 Vozovoz: Запрос категорий груза...');
    console.log('   - limit:', limit);
    console.log('   - offset:', offset);

    const requestData = {
      object: "directQuery",
      action: "get",
      params: {
        method: "getCargoTypes",
        data: {
          limit,
          offset
        }
      }
    };

    const response = await fetch('https://vozovoz.ru/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vozovoz API ошибка:', response.status, errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: `API вернул ошибку: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Vozovoz: Получено категорий:', data.response?.meta?.total || 0);

    return NextResponse.json({
      success: true,
      data: data.response?.data || [],
      meta: data.response?.meta || {}
    });

  } catch (error: unknown) {
    console.error('❌ Vozovoz Categories API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      },
      { status: 500 }
    );
  }
}
