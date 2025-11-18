// Тестовый скрипт для проверки NordWheel API
const testNordWheelAPI = async () => {
  const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';

  const requestData = {
    dispatch: {
      location: {
        type: 'terminal',
        terminal_id: 91 // Москва terminal ID from old API
      }
    },
    destination: {
      location: {
        type: 'terminal',
        terminal_id: 92 // СПб terminal ID from old API
      }
    },
    cargo: {
      total_weight: 10,
      total_volume: 1.0,
      total_quantity: 1
    },
    insurance: 1000,
    insurance_refuse: false,
    services: {
      is_package: false,
      is_documents_return: false,
      is_fragile: false
    },
    promocode: null
  };

  try {
    console.log('Отправка запроса к NordWheel API...');
    console.log('URL:', apiUrl);
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NORDWHEEL_API_KEY || '5|WYpV9f788Y2ASobpv3xy6N5qxtIUaKhxFF4yWETOfc398950'}`
      },
      body: JSON.stringify(requestData)
    });

    console.log('Статус ответа:', response.status);

    if (!response.ok) {
      console.error('Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Тело ошибки:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Ответ от API:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('Цена:', data.price);
      console.log('Дни:', data.days);
    } else {
      console.log('API вернул success: false');
      if (data.message) {
        console.log('Сообщение:', data.message);
      }
    }

  } catch (error) {
    console.error('Ошибка соединения:', error);
  }
};

testNordWheelAPI();