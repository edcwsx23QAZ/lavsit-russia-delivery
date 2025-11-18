// Тестовый скрипт для проверки NordWheel API - получение терминалов для Казани
const testNordWheelTerminals = async () => {
  // Попробуем разные коды для Казани
  const cityCodes = [
    '1600000000000', // KLADR
    'c813a892-2c29-4e4a-8e6c-7356364d2c00', // Возможный FIAS
    'Казань' // Название
  ];

  for (const cityCode of cityCodes) {
    console.log(`\n--- Пробуем код: ${cityCode} ---`);
    const apiUrl = `https://api.nordw.orog.ru/api/v1/terminals?city_id=${encodeURIComponent(cityCode)}`;

    try {
      console.log('Получение списка терминалов NordWheel для Казани...');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.NORDWHEEL_API_KEY || '5|WYpV9f788Y2ASobpv3xy6N5qxtIUaKhxFF4yWETOfc398950'}`
        }
      });

      console.log('Статус ответа:', response.status);

      if (!response.ok) {
        console.error('Ошибка API:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Тело ошибки:', errorText);
        continue;
      }

      const data = await response.json();
      console.log('Терминалы для Казани:', JSON.stringify(data, null, 2));
      break; // Если успешно, выходим из цикла

    } catch (error) {
      console.error('Ошибка соединения:', error);
    }
  }
};

testNordWheelTerminals();