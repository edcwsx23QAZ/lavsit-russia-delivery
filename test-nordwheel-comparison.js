// Comparison test: Before vs After quantity fix
async function compareResults() {
  console.log('🧪 Comparison: Before vs After quantity fix\n');

  const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';
  const apiKey = '5|WYpV9f788Y2ASobpv3xy6N5qxtIUaKhxFF4yWETOfc398950';

  const baseParams = {
    dispatch: {
      location: {
        type: 'terminal',
        city_fias: '0c5b2444-70a0-4932-980c-b4dc0d3f02b5'
      }
    },
    destination: {
      location: {
        type: 'terminal',
        city_fias: 'c2deb16a-0330-4f05-821f-1d09c93331e6'
      }
    },
    cargo: {
      total_weight: 150,
      total_volume: 0.6
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

  // Тест 1: СТАРЫЙ подход (quantity = 3)
  console.log('📋 BEFORE FIX: quantity = 3 (умножает цену)');
  const beforeRequest = {
    ...baseParams,
    cargo: {
      ...baseParams.cargo,
      total_quantity: 3
    }
  };

  const beforeResponse = await makeRequest(beforeRequest);
  console.log(`   💰 Auto: ${beforeResponse.auto}₽`);
  console.log(`   🔍 Weight used: ${beforeResponse.weight}kg`);

  // Тест 2: НОВЫЙ подход (quantity = 1)
  console.log('\n📋 AFTER FIX: quantity = 1 (корректный расчет)');
  const afterRequest = {
    ...baseParams,
    cargo: {
      ...baseParams.cargo,
      total_quantity: 1
    }
  };

  const afterResponse = await makeRequest(afterRequest);
  console.log(`   💰 Auto: ${afterResponse.auto}₽`);
  console.log(`   🔍 Weight used: ${afterResponse.weight}kg`);

  // Сравнение
  console.log('\n📊 COMPARISON RESULTS:');
  const savings = beforeResponse.auto - afterResponse.auto;
  const percentage = ((savings / beforeResponse.auto) * 100).toFixed(1);
  
  console.log(`   💰 Price difference: ${savings}₽ (${percentage}% cheaper)`);
  console.log(`   ⚖️  Weight difference: ${beforeResponse.weight - afterResponse.weight}kg`);
  
  if (savings > 0) {
    console.log(`   ✅ FIX SUCCESSFUL: Correct pricing saves ${percentage}%`);
  } else {
    console.log(`   ❌ Fix may need adjustment`);
  }

  async function makeRequest(requestData) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'DeliveryCalculator/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    if (data.auto && data.auto.services && data.auto.services[0]) {
      const service = data.auto.services[0];
      return {
        auto: data.auto.total_amount,
        weight: service.quantity,
        rate: service.price
      };
    }
    
    return { auto: 0, weight: 0, rate: 0 };
  }
}

// Run comparison
compareResults();