// Тест API поиска терминалов Деловых Линий
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
    console.log('🔑 Авторизация status:', authResponse.status);
    console.log('🔑 Авторизация data:', authData);
    
    // Проверяем разные возможные пути к sessionID
    let sessionID = null;
    
    if (authData.data?.sessionID) {
      sessionID = authData.data.sessionID;
    } else if (authData.sessionID) {
      sessionID = authData.sessionID;
    } else if (authData.data?.session) {
      sessionID = authData.data.session;
    }
    
    if (authResponse.ok && sessionID) {
      console.log('✅ SessionID получен:', sessionID);
      return sessionID;
    } else {
      console.error('❌ Ошибка авторизации');
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка соединения с авторизацией:', error);
    return null;
  }
};

const testDellinTerminals = async () => {
  try {
    console.log('🧪 Тестируем поиск терминалов Деловых Линий...');
    
    // Сначала получаем sessionID
    const sessionID = await getDellinSessionId();
    if (!sessionID) {
      console.error('❌ Не удалось получить sessionID');
      return;
    }
    
    // Тест 1: для Москвы с cityid (отправление)
    console.log('\n=== ТЕСТ 1: Москва с cityid ===');
    const moscowByCityIdRequest = {
      appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
      sessionID: sessionID,
      cityid: '2423', // ID Москвы
      direction: 'derival',
      maxCargoDimensions: {
        length: 3.0,
        width: 3.0,
        height: 3.0,
        weight: 3.0,
        maxVolume: 3.0,
        totalVolume: 3.0,
        totalWeight: 3.0
      },
      express: true,
      freeStorageDays: '2'
    };

    console.log('📤 Запрос для Москвы (cityid):', JSON.stringify(moscowByCityIdRequest, null, 2));

    let response = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(moscowByCityIdRequest)
    });

    let data = await response.json();
    console.log('📥 Ответ API (cityid):', response.status, response.statusText);
    console.log('📥 Данные (cityid):', JSON.stringify(data, null, 2));

    if (data.terminals && data.terminals.length > 0) {
      console.log('✅ Найдены терминалы (cityid):');
      data.terminals.forEach((terminal, index) => {
        console.log(`  ${index + 1}. ID: ${terminal.id}, Город: ${terminal.city}, Название: ${terminal.name}`);
        console.log(`     Адрес: ${terminal.address}`);
        console.log(`     По умолчанию: ${terminal.default ? 'Да' : 'Нет'}`);
        console.log('');
      });
    } else {
      console.log('❌ Терминалы не найдены (cityid)');
    }

    // Тест 2: для Москвы только с search
    console.log('\n=== ТЕСТ 2: Москва только с search ===');
    const moscowBySearchRequest = {
      appkey: 'E6C50E91-8E93-440F-9CC6-DEF9F0D68F1B',
      sessionID: sessionID,
      search: 'Москва',
      direction: 'derival',
      maxCargoDimensions: {
        length: 3.0,
        width: 3.0,
        height: 3.0,
        weight: 3.0,
        maxVolume: 3.0,
        totalVolume: 3.0,
        totalWeight: 3.0
      },
      express: true,
      freeStorageDays: '2'
    };

    console.log('📤 Запрос для Москвы (search):', JSON.stringify(moscowBySearchRequest, null, 2));

    response = await fetch('https://api.dellin.ru/v1/public/request_terminals.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(moscowBySearchRequest)
    });

    data = await response.json();
    console.log('📥 Ответ API (search):', response.status, response.statusText);
    console.log('📥 Данные (search):', JSON.stringify(data, null, 2));

    if (data.terminals && data.terminals.length > 0) {
      console.log('✅ Найдены терминалы (search):');
      data.terminals.forEach((terminal, index) => {
        console.log(`  ${index + 1}. ID: ${terminal.id}, Город: ${terminal.city}, Название: ${terminal.name}`);
        console.log(`     Адрес: ${terminal.address}`);
        console.log(`     По умолчанию: ${terminal.default ? 'Да' : 'Нет'}`);
        console.log('');
      });
    } else {
      console.log('❌ Терминалы не найдены (search)');
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
};

testDellinTerminals();