// Тестовый скрипт для проверки NordWheel API
const testNordWheelAPI = async () => {
  const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';

  const requestData = {
    dispatch: {
      location: {
        type: 'terminal',
        terminal_id: '0c7a2795-1220-486d-a7ce-8bcf130a1224' // GUID терминала Москвы
      }
    },
    destination: {
      location: {
        type: 'terminal',
        terminal_id: '3ca02b62-3632-4da0-8fde-de9d9c77c553' // GUID терминала СПб
      }
    },
    cargo: {
      total_weight: 1, // Меньший вес
      total_volume: 0.1, // Меньший объем
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

// Обертка для top-level await
(async () => {
  await testNordWheelAPI();
})();