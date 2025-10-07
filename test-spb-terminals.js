// Тест поиска терминалов в Санкт-Петербурге
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

const testSpbTerminals = async () => {
  try {
    const sessionID = await getDellinSessionId();
    if (!sessionID) return;
    
    // Тест поиска Санкт-Петербурга для arrival
    const spbRequest = {
      appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
      sessionID: sessionID,
      search: 'Санкт-Петербург',
      direction: 'arrival'
    };

    console.log('\n📤 Запрос Санкт-Петербург:', JSON.stringify(spbRequest, null, 2));

    const response = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spbRequest)
    });

    const data = await response.json();
    console.log('📥 Результат СПб:', response.status, JSON.stringify(data, null, 2));

    // Также тестируем другие варианты написания
    const variations = ['г Санкт-Петербург', 'Питер', 'СПб', 'Ленинград'];
    for (const variation of variations) {
      const varRequest = { ...spbRequest, search: variation };
      console.log(`\n📤 Тестируем вариант: "${variation}"`);
      
      const varResponse = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(varRequest)
      });
      
      const varData = await varResponse.json();
      console.log(`📥 Результат "${variation}":`, varResponse.status, varData.terminals?.length || 0, 'терминалов');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testSpbTerminals();