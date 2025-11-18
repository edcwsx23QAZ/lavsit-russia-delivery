// Тестовый скрипт для проверки NordWheel API
const testNordWheelAPI = async () => {
  const apiUrl = 'https://nordw.ru/tools/api/calc/calculate/';

  const params = new URLSearchParams({
    'dispatch[city]': 'Москва',
    'dispatch[terminal]': 'Москва',
    'destination[city]': 'Санкт-Петербург',
    'destination[terminal]': 'Санкт-Петербург',
    'cargo[weight]': '10',
    'cargo[volume]': '1.0',
    'cargo[quantity]': '1',
    'insurance': '1000',
    'services[package]': 'false',
    'services[documents_return]': 'false',
    'services[fragile]': 'false',
  });

  const fullUrl = `${apiUrl}?${params.toString()}`;

  try {
    console.log('Отправка запроса к NordWheel API...');
    console.log('URL:', fullUrl);
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    }

  } catch (error) {
    console.error('Ошибка соединения:', error);
  }
};

testNordWheelAPI();