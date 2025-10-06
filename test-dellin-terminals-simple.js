// Упрощенный тест API поиска терминалов Деловых Линий
const getDellinSessionId = async () => {
  try {
    console.log('🔑 Получаем sessionID...');
    const authResponse = await fetch('https://api.dellin.ru/v3/auth/login.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
        login: 'service@lavsit.ru',
        password: 'edcwsx123QAZ'
      })
    });

    const authData = await authResponse.json();
    console.log('🔑 SessionID получен:', authData.data?.sessionID);
    return authData.data?.sessionID || null;
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error);
    return null;
  }
};

const testSimpleRequest = async () => {
  try {
    const sessionID = await getDellinSessionId();
    if (!sessionID) return;
    
    // Минимальный запрос
    const simpleRequest = {
      appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
      sessionID: sessionID,
      search: 'Москва',
      direction: 'derival'
    };

    console.log('\n📤 Минимальный запрос:', JSON.stringify(simpleRequest, null, 2));

    const response = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simpleRequest)
    });

    const data = await response.json();
    console.log('📥 Результат:', response.status, JSON.stringify(data, null, 2));

    // Тест с arrival
    const arrivalRequest = { ...simpleRequest, direction: 'arrival' };
    console.log('\n📤 Запрос arrival:', JSON.stringify(arrivalRequest, null, 2));

    const response2 = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arrivalRequest)
    });

    const data2 = await response2.json();
    console.log('📥 Результат arrival:', response2.status, JSON.stringify(data2, null, 2));

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testSimpleRequest();