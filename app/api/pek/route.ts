import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { method, address, coordinates } = requestData;
    
    const PEK_TOKEN = '624FC93CA677B23673BB476D4982294DC27E246F';
    const BASE_URL = 'https://api.pecom.ru/v1';
    
    let url = '';
    let body = {};
    
    switch (method) {
      case 'findzonebyaddress':
        url = `${BASE_URL}/branches/findzonebyaddress/`;
        body = {
          address: address
        };
        break;
        
      case 'findzonebycoordinates':
        url = `${BASE_URL}/branches/findzonebycoordinates/`;
        body = {
          longitude: coordinates.longitude,
          latitude: coordinates.latitude
        };
        break;
        
      case 'calculateprice':
        url = `${BASE_URL}/calculator/calculateprice/`;
        const { method: methodName, ...calculationData } = requestData;
        body = calculationData;
        break;
        
      case 'nearestdepartments':
        url = `${BASE_URL}/branches/nearestdepartments/`;
        const { method: nearestMethod, ...departmentData } = requestData;
        body = departmentData;
        break;
        
      default:
        return NextResponse.json({ error: 'Неизвестный метод' }, { status: 400 });
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PEK_TOKEN}`,
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ПЭК API ошибка:', response.status, errorText);
      return NextResponse.json({ 
        error: `ПЭК API ошибка: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Ошибка прокси ПЭК API:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера при обращении к ПЭК API',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}