/**
 * Скрипт для тестирования импорта данных из Google Sheets в Delivery CRM
 * Запуск: npx tsx scripts/test-import-delivery-crm.ts
 */

const SERVER_URL = 'http://localhost:9000'
const SPREADSHEET_ID = '1Cvl-0P0uBoYupGGbZ2AG70S0VDyrAII8L0vNjUykOsI'
const GID = '0'
const START_ROW = 1

async function testServerAvailability() {
  try {
    const response = await fetch(`${SERVER_URL}/delivery-crm`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
    })
    console.log(`[Test] Server availability: ${response.status} ${response.statusText}`)
    return response.ok
  } catch (error: any) {
    console.error(`[Test] Server not available: ${error.message}`)
    return false
  }
}

async function testImport() {
  console.log('[Test] Starting import test...')
  console.log(`[Test] Spreadsheet ID: ${SPREADSHEET_ID}`)
  console.log(`[Test] GID: ${GID}`)
  console.log(`[Test] Start row: ${START_ROW}`)
  
  try {
    const response = await fetch(`${SERVER_URL}/api/delivery-crm/import-google-sheets-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        gid: GID,
        startRow: START_ROW,
      }),
    })
    
    const data = await response.json()
    
    console.log(`[Test] Response status: ${response.status}`)
    console.log('[Test] Response data:', JSON.stringify(data, null, 2))
    
    if (response.ok && data.success) {
      console.log(`[Test] ✅ Import successful!`)
      console.log(`[Test]   - Imported: ${data.imported}`)
      console.log(`[Test]   - Updated: ${data.updated}`)
      console.log(`[Test]   - Total: ${data.total}`)
      console.log(`[Test]   - Errors: ${data.errors}`)
      
      if (data.errors > 0 && data.errorDetails) {
        console.log(`[Test]   - First errors:`)
        data.errorDetails.slice(0, 5).forEach((err: any, idx: number) => {
          console.log(`[Test]     ${idx + 1}. Row ${err.row}, Order: ${err.orderNumber}, Error: ${err.error}`)
        })
      }
      
      return true
    } else {
      console.error(`[Test] ❌ Import failed!`)
      console.error(`[Test]   Error: ${data.error || 'Unknown error'}`)
      if (data.details) {
        console.error(`[Test]   Details:`, data.details)
      }
      return false
    }
  } catch (error: any) {
    console.error(`[Test] ❌ Import error: ${error.message}`)
    return false
  }
}

async function testOrdersLoad() {
  try {
    const response = await fetch(`${SERVER_URL}/api/delivery-crm/orders?includeEmpty=true`)
    const data = await response.json()
    
    console.log(`[Test] Orders load status: ${response.status}`)
    if (data.success) {
      console.log(`[Test] ✅ Orders loaded: ${data.orders?.length || 0} orders`)
      if (data.orders && data.orders.length > 0) {
        console.log(`[Test]   - First order:`, {
          date: data.orders[0].date,
          orderNumber: data.orders[0].orderNumber,
          products: data.orders[0].products?.substring(0, 50) + '...',
        })
      }
      return true
    } else {
      console.error(`[Test] ❌ Failed to load orders`)
      return false
    }
  } catch (error: any) {
    console.error(`[Test] ❌ Orders load error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Delivery CRM Import Test')
  console.log('='.repeat(60))
  
  // Проверка доступности сервера
  console.log('\n[Step 1] Checking server availability...')
  const serverAvailable = await testServerAvailability()
  
  if (!serverAvailable) {
    console.error('\n❌ Server is not available. Please start the server first.')
    console.error('   Run: npm run dev (or your server start command)')
    process.exit(1)
  }
  
  // Тест импорта
  console.log('\n[Step 2] Testing import...')
  const importSuccess = await testImport()
  
  // Тест загрузки заказов
  console.log('\n[Step 3] Testing orders load...')
  await testOrdersLoad()
  
  console.log('\n' + '='.repeat(60))
  if (importSuccess) {
    console.log('✅ Test completed successfully!')
  } else {
    console.log('❌ Test completed with errors')
    process.exit(1)
  }
  console.log('='.repeat(60))
}

main().catch(console.error)


