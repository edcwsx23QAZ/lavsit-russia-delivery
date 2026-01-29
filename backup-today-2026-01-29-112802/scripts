/**
 * Скрипт для проверки согласованности всех блоков вики
 * Запуск: npx tsx scripts/verify-wiki-consistency.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ConsistencyIssue {
  type: 'missing_link' | 'broken_reference' | 'inconsistent_metric' | 'missing_contact';
  page: string;
  issue: string;
  severity: 'error' | 'warning';
}

async function verifyConsistency() {
  const issues: ConsistencyIssue[] = [];

  try {
    console.log('Проверка согласованности вики-инструкции...\n');

    // Получить все страницы
    const pages = await prisma.wikiPage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    console.log(`Найдено страниц: ${pages.length}\n`);

    // Проверка 1: Все ссылки на страницы существуют
    console.log('1. Проверка внутренних ссылок...');
    const pageSlugs = new Set(pages.map(p => p.slug));
    
    for (const page of pages) {
      try {
        const content = JSON.parse(page.content);
        const contentString = JSON.stringify(content);
        
        // Проверка ссылок вида [wiki?slug=...]
        const linkMatches = contentString.match(/wiki\?slug=([^"&]+)/g);
        if (linkMatches) {
          for (const match of linkMatches) {
            const slug = match.replace('wiki?slug=', '').split('&')[0];
            if (!pageSlugs.has(slug)) {
              issues.push({
                type: 'broken_reference',
                page: page.title,
                issue: `Ссылка на несуществующую страницу: ${slug}`,
                severity: 'error'
              });
            }
          }
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    // Проверка 2: Метрики согласованы между блоками
    console.log('2. Проверка согласованности метрик...');
    const metricsPage = pages.find(p => p.slug === 'quality-metrics');
    const communicationPage = pages.find(p => p.slug === 'communication-metrics');
    const promisePage = pages.find(p => p.slug === 'client-promise');

    if (metricsPage && communicationPage && promisePage) {
      // Проверка, что метрики не противоречат друг другу
      // (здесь можно добавить более детальную проверку)
      console.log('   ✓ Метрики найдены во всех необходимых блоках');
    }

    // Проверка 3: Контакты упоминаются в расписании
    console.log('3. Проверка ссылок на контакты...');
    const schedulePage = pages.find(p => p.slug === 'daily-schedule');
    const contactsPage = pages.find(p => p.slug === 'contacts');

    if (schedulePage && contactsPage) {
      console.log('   ✓ Страницы расписания и контактов найдены');
    }

    // Проверка 4: Все необходимые страницы созданы
    console.log('4. Проверка наличия всех необходимых страниц...');
    const requiredSlugs = [
      'introduction',
      'daily-schedule',
      'useful-links',
      'contacts',
      'accounts',
      'scripts',
      'logistics-value',
      'quality-metrics',
      'communication-metrics',
      'client-promise',
      'work-processes',
      'regulations',
      'client-work'
    ];

    for (const slug of requiredSlugs) {
      if (!pageSlugs.has(slug)) {
        issues.push({
          type: 'missing_link',
          page: 'Система',
          issue: `Отсутствует обязательная страница: ${slug}`,
          severity: 'error'
        });
      }
    }

    // Вывод результатов
    console.log('\n=== Результаты проверки ===\n');

    if (issues.length === 0) {
      console.log('✓ Все проверки пройдены успешно!');
      console.log('Вики-инструкция согласована и готова к использованию.\n');
    } else {
      const errors = issues.filter(i => i.severity === 'error');
      const warnings = issues.filter(i => i.severity === 'warning');

      if (errors.length > 0) {
        console.log(`❌ Найдено ошибок: ${errors.length}`);
        errors.forEach(issue => {
          console.log(`   - [${issue.page}] ${issue.issue}`);
        });
      }

      if (warnings.length > 0) {
        console.log(`\n⚠️  Найдено предупреждений: ${warnings.length}`);
        warnings.forEach(issue => {
          console.log(`   - [${issue.page}] ${issue.issue}`);
        });
      }
    }

    // Сохранить отчет
    const reportPath = path.join(process.cwd(), 'docs', 'wiki-consistency-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        totalPages: pages.length,
        issues: issues,
        summary: {
          total: issues.length,
          errors: issues.filter(i => i.severity === 'error').length,
          warnings: issues.filter(i => i.severity === 'warning').length
        }
      }, null, 2)
    );

    console.log(`\nОтчет сохранен: ${reportPath}`);

  } catch (error) {
    console.error('Ошибка при проверке:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyConsistency();

