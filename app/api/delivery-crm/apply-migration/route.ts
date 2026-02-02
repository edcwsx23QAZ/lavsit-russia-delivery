import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('🔧 Применение миграции для delivery_orders...')
    
    // Проверяем подключение
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Подключение к БД успешно!')
    
    // Читаем SQL миграцию
    const migrationPath = join(process.cwd(), 'prisma', 'migrations', '20250202000000_add_delivery_order', 'migration.sql')
    const sql = readFileSync(migrationPath, 'utf-8')
    
    console.log(`📄 Размер SQL: ${sql.length} символов`)
    
    // Разбиваем SQL на отдельные команды
    const statements: string[] = []
    let currentStatement = ''
    let inQuotes = false
    let quoteChar = ''
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]
      
      if ((char === '"' || char === "'") && sql[i - 1] !== '\\') {
        if (!inQuotes) {
          inQuotes = true
          quoteChar = char
        } else if (char === quoteChar) {
          inQuotes = false
          quoteChar = ''
        }
      }
      
      currentStatement += char
      
      if (!inQuotes && char === ';') {
        const trimmed = currentStatement.trim()
        if (trimmed && !trimmed.startsWith('--')) {
          statements.push(trimmed)
        }
        currentStatement = ''
      }
    }
    
    if (currentStatement.trim() && !currentStatement.trim().startsWith('--')) {
      statements.push(currentStatement.trim())
    }
    
    console.log(`📊 Найдено ${statements.length} SQL команд`)
    
    // Применяем каждую команду
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    const errors: any[] = []
    
    for (const statement of statements) {
      try {
        // Пропускаем пустые команды
        if (!statement.trim() || statement.trim().startsWith('--')) {
          skipCount++
          continue
        }
        
        await prisma.$executeRawUnsafe(statement)
        successCount++
        console.log(`✅ Применена команда: ${statement.substring(0, 50)}...`)
      } catch (error: any) {
        errorCount++
        const errorMsg = error.message || String(error)
        
        // Игнорируем ошибки "already exists" для IF NOT EXISTS
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          skipCount++
          console.log(`⏭️  Пропущено (уже существует): ${statement.substring(0, 50)}...`)
        } else {
          errors.push({
            statement: statement.substring(0, 100),
            error: errorMsg,
          })
          console.error(`❌ Ошибка: ${errorMsg}`)
        }
      }
    }
    
    // Проверяем, что таблица создана
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'delivery_orders'
    `
    
    const tableExists = tables.length > 0
    
    return NextResponse.json({
      success: tableExists && errorCount === 0,
      message: tableExists 
        ? 'Миграция применена успешно! Таблица delivery_orders создана.'
        : 'Миграция применена с ошибками. Проверьте детали.',
      statistics: {
        totalStatements: statements.length,
        successful: successCount,
        skipped: skipCount,
        errors: errorCount,
      },
      tableExists,
      errors: errors.slice(0, 10), // Первые 10 ошибок
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка при применении миграции:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      message: error.message?.includes('Can\'t reach database')
        ? 'База данных недоступна. Проверьте DATABASE_URL и настройки подключения.'
        : error.message,
    }, { status: 500 })
  }
}

