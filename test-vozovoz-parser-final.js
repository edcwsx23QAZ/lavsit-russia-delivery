#!/usr/bin/env node

const testCases = [
  {
    name: "Стандартный тест (как на сайте)",
    params: {
      fromCity: "Москва",
      toCity: "Санкт-Петербург",
      fromAddressDelivery: false,
      toAddressDelivery: true,
      toAddress: "Невский проспект д.132",
      length: 200,
      width: 100,
      height: 100,
      weight: 100,
      needInsurance: false,
      declaredValue: 0,
      needPackaging: false,
      needLoading: false,
      hasFreightElevator: false,
      floor: 1
    },
    expected: "Около 12,680 ₽ (с сайта)"
  },
  {
    name: "Большой объем",
    params: {
      fromCity: "Москва",
      toCity: "Санкт-Петербург",
      fromAddressDelivery: false,
      toAddressDelivery: true,
      toAddress: "Невский проспект д.132",
      length: 300,
      width: 200,
      height: 200,
      weight: 200,
      needInsurance: false,
      declaredValue: 0,
      needPackaging: false,
      needLoading: false,
      hasFreightElevator: false,
      floor: 1
    },
    expected: "Выше стандартного"
  },
  {
    name: "Маленький объем",
    params: {
      fromCity: "Москва",
      toCity: "Санкт-Петербург",
      fromAddressDelivery: false,
      toAddressDelivery: true,
      toAddress: "Невский проспект д.132",
      length: 50,
      width: 50,
      height: 50,
      weight: 10,
      needInsurance: false,
      declaredValue: 0,
      needPackaging: false,
      needLoading: false,
      hasFreightElevator: false,
      floor: 1
    },
    expected: "Ниже стандартного"
  },
  {
    name: "Без адресной доставки",
    params: {
      fromCity: "Москва",
      toCity: "Санкт-Петербург",
      fromAddressDelivery: false,
      toAddressDelivery: false,
      length: 200,
      width: 100,
      height: 100,
      weight: 100,
      needInsurance: false,
      declaredValue: 0,
      needPackaging: false,
      needLoading: false,
      hasFreightElevator: false,
      floor: 1
    },
    expected: "Меньше (без отвоза груза)"
  }
];

async function runTests() {
  console.log("🧪 Запуск тестов Vozovoz парсера...\n");
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Тест ${i + 1}: ${testCase.name}`);
    console.log(`🎯 Ожидаемый результат: ${testCase.expected}`);
    console.log(`📦 Параметры: ${testCase.params.length}x${testCase.params.width}x${testCase.params.height}см, ${testCase.params.weight}кг`);
    
    try {
      const response = await fetch('http://localhost:3000/api/vozovoz-parser-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.params)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`✅ Результат: ${result.totalCost.toLocaleString()} ₽`);
      console.log(`⏱️  Время выполнения: ${result.parseTime}с`);
      console.log(`🚚 Количество услуг: ${result.services.length}`);
      
      // Показываем детализацию услуг
      console.log("📋 Детализация услуг:");
      result.services.forEach((service, index) => {
        const discount = service.discount ? ` (скидка ${service.discount} ₽)` : '';
        console.log(`   ${index + 1}. ${service.name}: ${service.price.toLocaleString()} ₽${discount}`);
      });
      
      if (result.warnings && result.warnings.length > 0) {
        console.log(`⚠️  Предупреждения: ${result.warnings.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
    }
  }
  
  console.log("\n🎉 Тестирование завершено!");
}

runTests().catch(console.error);