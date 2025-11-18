// Тестовый скрипт для проверки NordWheel API - получение списка городов
const testNordWheelCities = async () => {
  const apiUrl = 'https://api.nordw.orog.ru/api/v1/city-list';

  try {
    console.log('Получение списка городов NordWheel...');
    const response = await fetch(apiUrl);

    console.log('Статус ответа:', response.status);

    if (!response.ok) {
      console.error('Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Тело ошибки:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Количество городов:', data.data?.length || 0);
    console.log('Первые 5 городов:');
    if (data.data && Array.isArray(data.data)) {
      data.data.slice(0, 5).forEach(city => {
        console.log(`- ${city.name} (${city.guid})`);
      });
    }

  } catch (error) {
    console.error('Ошибка соединения:', error);
  }
};

testNordWheelCities();