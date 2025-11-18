// Тестовый скрипт для проверки NordWheel API - получение списка терминалов для Москвы и СПб
const testNordWheelTerminals = async (cityFias, cityName) => {
  const apiUrl = `https://api.nordw.orog.ru/api/v1/terminals?city_id=${cityFias}`;

  try {
    console.log(`Получение списка терминалов NordWheel для ${cityName}...`);
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
      return null;
    }

    const data = await response.json();
    console.log(`Количество терминалов для ${cityName}:`, data.data?.length || 0);
    console.log(`Терминалы для ${cityName}:`);
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((terminal, index) => {
        console.log(`Терминал ${index + 1}:`, terminal);
      });
    }
    return data.data || [];
  } catch (error) {
    console.error('Ошибка соединения:', error);
    return null;
  }
};

const testBothCities = async () => {
  const moscowFias = '0c5b2444-70a0-4932-980c-b4dc0d3f02b5';
  const spbFias = 'c2deb16a-0330-4f05-821f-1d09c93331e6';

  const moscowTerminals = await testNordWheelTerminals(moscowFias, 'Москвы');
  console.log('\n--- СПб ---\n');
  const spbTerminals = await testNordWheelTerminals(spbFias, 'СПб');

  console.log('\n--- Резюме ---');
  console.log('Москва терминалы:', moscowTerminals?.length || 0);
  console.log('СПб терминалы:', spbTerminals?.length || 0);
};

testBothCities();