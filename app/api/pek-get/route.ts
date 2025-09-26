import { NextRequest, NextResponse } from 'next/server';

// Дополнительный endpoint для тестирования GET запросов к ПЭК API
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ПЭК GET Тест: Получен запрос');
    
    const requestData = await request.json();
    const { method, address } = requestData;
    
    const PEK_TOKEN = '624FC93CA677B23673BB476D4982294DC27E246F';
    
    // Попробуем GET запросы с параметрами в URL
    const API_VARIANTS = [
      'https://kabinet.pecom.ru/api/v1',
      'https://lk.pecom.ru/api/v1',
      'https://api.pecom.ru/v1',
      'https://pecom.ru/api/v1'
    ];
    
    for (let i = 0; i < API_VARIANTS.length; i++) {
      const baseUrl = API_VARIANTS[i];
      
      try {
        // Пробуем простой GET запрос к корню API
        const testUrl = baseUrl + '/';
        console.log(`🌐 GET тест ${i + 1}: ${testUrl}`);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${PEK_TOKEN}`,
            'Accept': 'application/json'
          }
        });
        
        console.log(`📡 GET ответ ${i + 1}:`, response.status, response.statusText);
        
        if (response.ok) {
          const responseText = await response.text();
          console.log(`✅ GET успех ${i + 1}:`, responseText.substring(0, 500));
          
          return NextResponse.json({
            success: true,
            workingUrl: testUrl,
            status: response.status,
            response: responseText.substring(0, 1000)
          });
        } else {
          const errorText = await response.text();
          console.log(`❌ GET ошибка ${i + 1}:`, response.status, errorText.substring(0, 200));
        }
        
      } catch (error) {
        console.error(`❌ GET сетевая ошибка ${i + 1}:`, error);
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Все GET варианты не работают',
      testedUrls: API_VARIANTS
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка GET теста:', error);
    return NextResponse.json({ 
      error: 'Критическая ошибка',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}