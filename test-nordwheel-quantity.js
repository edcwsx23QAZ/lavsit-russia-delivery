// Test NordWheel API behavior with quantity parameter
async function testQuantityBehavior() {
  console.log('🧪 Testing NordWheel API quantity behavior...\n');

  const baseRequest = {
    dispatch: {
      location: {
        type: 'terminal',
        city_fias: '0c5b2444-70a0-4932-980c-b4dc0d3f02b5' // Москва
      }
    },
    destination: {
      location: {
        type: 'terminal',
        city_fias: 'c2deb16a-0330-4f05-821f-1d09c93331e6' // Санкт-Петербург
      }
    },
    cargo: {
      total_weight: 100,
      total_volume: 0.5,
      total_quantity: 1 // Базовое значение
    },
    insurance: null,
    insurance_refuse: true,
    services: {
      is_package: false,
      is_documents_return: false,
      is_fragile: false
    },
    promocode: null
  };

  const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';
  const apiKey = '5|WYpV9f788Y2ASobpv3xy6N5qxtIUaKhxFF4yWETOfc398950';

  // Тест 1: quantity = 1
  console.log('📋 Test 1: quantity = 1');
  const test1 = { ...baseRequest, cargo: { ...baseRequest.cargo, total_quantity: 1 } };
  await testRequest(test1, 'quantity=1');

  // Тест 2: quantity = 3 
  console.log('\n📋 Test 2: quantity = 3');
  const test2 = { ...baseRequest, cargo: { ...baseRequest.cargo, total_quantity: 3 } };
  await testRequest(test2, 'quantity=3');

  // Тест 3: quantity = 5
  console.log('\n📋 Test 3: quantity = 5');
  const test3 = { ...baseRequest, cargo: { ...baseRequest.cargo, total_quantity: 5 } };
  await testRequest(test3, 'quantity=5');

  console.log('\n🏁 Analysis complete!');
}

async function testRequest(requestData, testName) {
  try {
    console.log(`📦 Sending ${testName} request...`);
    console.log(`   Weight: ${requestData.cargo.total_weight}kg`);
    console.log(`   Volume: ${requestData.cargo.total_volume}m³`);
    console.log(`   Quantity: ${requestData.cargo.total_quantity}`);
    
    const response = await fetch('https://api.nordw.orog.ru/api/v1/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 5|WYpV9f788Y2ASobpv3xy6N5qxtIUaKhxFF4yWETOfc398950',
        'User-Agent': 'DeliveryCalculator/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      if (data.auto || data.avia) {
        const autoPrice = data.auto ? data.auto.total_amount : 0;
        const aviaPrice = data.avia ? data.avia.total_amount : 0;
        
        console.log(`✅ ${testName}: SUCCESS`);
        console.log(`   💰 Auto: ${autoPrice}₽`);
        console.log(`   ✈️  Avia: ${aviaPrice}₽`);
        
        // Анализируем услуги для понимания ценообразования
        if (data.auto && data.auto.services) {
          console.log(`   🔍 Auto services:`);
          data.auto.services.forEach((service, index) => {
            console.log(`     ${index + 1}. ${service.name}: ${service.price}₽ × ${service.quantity}${service.measure} = ${service.amount}₽`);
          });
        }
      } else {
        console.log(`❌ ${testName}: No delivery options`);
      }
    } else {
      console.log(`❌ ${testName}: ERROR ${response.status}`);
      try {
        const errorData = JSON.parse(responseText);
        console.log(`   Details:`, errorData.meta?.errors || errorData);
      } catch (e) {
        console.log(`   Raw:`, responseText.substring(0, 200));
      }
    }
    
  } catch (error) {
    console.log(`❌ ${testName}: FAILED - ${error.message}`);
  }
}

// Run tests
testQuantityBehavior();