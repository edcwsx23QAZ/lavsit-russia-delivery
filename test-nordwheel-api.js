// Тестовый скрипт для проверки NordWheel API
const testNordWheelAPI = async () => {
  const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';

  const requestData = {
    dispatch: {
      location: {
        type: 'terminal',
        city_fias: '0c5b2444-70a0-4932-980c-b4dc0d3f02b5' // Москва
      }
    },
    destination: {
      location: {
        type: 'terminal',
        city_fias: 'c2deb16a-0330-4f05-821f-1d09c93331e6' // СПб
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
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

  } catch (error) {
    console.error('Ошибка соединения:', error);
  }
};

testNordWheelAPI();