// Тестовый скрипт для проверки NordWheel API - получение списка терминалов для Москвы
const testNordWheelTerminals = async () => {
  const apiUrl = `https://api.nordw.orog.ru/api/v1/terminals?city_id=0c5b2444-70a0-4932-980c-b4dc0d3f02b5`; // Москва fias

  try {
    console.log('Получение списка терминалов NordWheel для Москвы...');
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
      return;
    }

    const data = await response.json();
    console.log('Количество терминалов:', data.data?.length || 0);
    console.log('Терминалы:');
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(terminal => {
        console.log(`- ${terminal.name} (id: ${terminal.id})`);
      });
    }

  } catch (error) {
    console.error('Ошибка соединения:', error);
  }
};

testNordWheelTerminals();