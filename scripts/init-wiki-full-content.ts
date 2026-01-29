/**
 * Скрипт для инициализации полного контента вики в базе данных
 * Запуск: npx tsx scripts/init-wiki-full-content.ts
 */

import { PrismaClient } from '@prisma/client';
import { getAllWikiPages } from '../data/wiki-all-sections';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('🚀 Начинаем инициализацию полного контента вики...\n');

  const wikiPages = getAllWikiPages();
  const pageMap = new Map<string, string>(); // slug -> id
  const createdPages: string[] = [];
  const updatedPages: string[] = [];
  const skippedPages: string[] = [];
  const errors: string[] = [];

  console.log(`📋 Найдено разделов: ${wikiPages.length}\n`);

  // Сначала создаем все страницы без родительских связей
  for (const pageData of wikiPages) {
    try {
      console.log(`📄 Обрабатываем: ${pageData.title} (${pageData.slug})...`);

      // Проверяем, существует ли страница
      const existing = await prisma.wikiPage.findUnique({
        where: { slug: pageData.slug }
      });

      // Находим родительскую страницу, если указана
      let parentId: string | null = null;
      if (pageData.parentSlug) {
        const parentIdFromMap = pageMap.get(pageData.parentSlug);
        if (parentIdFromMap) {
          parentId = parentIdFromMap;
        } else {
          // Попробуем найти в базе
          const parent = await prisma.wikiPage.findUnique({
            where: { slug: pageData.parentSlug }
          });
          if (parent) {
            parentId = parent.id;
            pageMap.set(pageData.parentSlug, parent.id);
          }
        }
      }

      if (existing) {
        // Обновляем существующую страницу
        console.log(`  ↻ Обновляем существующую страницу...`);
        const page = await prisma.wikiPage.update({
          where: { slug: pageData.slug },
          data: {
            title: pageData.title,
            content: pageData.content,
            order: pageData.order,
            parentId: parentId
          }
        });

        // Создаем новую версию
        const currentVersions = await prisma.wikiVersion.findMany({
          where: { pageId: page.id },
          orderBy: { version: 'desc' },
          take: 1
        });
        const nextVersion = (currentVersions[0]?.version || 0) + 1;

        await prisma.wikiVersion.create({
          data: {
            pageId: page.id,
            title: page.title,
            content: page.content,
            version: nextVersion,
            changeNote: 'Инициализация полной структуры вики',
            createdBy: null
          }
        });

        updatedPages.push(pageData.slug);
        pageMap.set(pageData.slug, page.id);
        console.log(`  ✅ Страница обновлена (версия ${nextVersion})`);
      } else {
        // Создаем новую страницу
        console.log(`  ➕ Создаем новую страницу...`);
        const page = await prisma.wikiPage.create({
          data: {
            slug: pageData.slug,
            title: pageData.title,
            content: pageData.content,
            order: pageData.order,
            parentId: parentId,
            isActive: true
          }
        });

        // Создаем первую версию
        await prisma.wikiVersion.create({
          data: {
            pageId: page.id,
            title: page.title,
            content: page.content,
            version: 1,
            changeNote: 'Создание страницы при инициализации',
            createdBy: null
          }
        });

        createdPages.push(pageData.slug);
        pageMap.set(pageData.slug, page.id);
        console.log(`  ✅ Страница создана`);
      }
    } catch (pageError: any) {
      console.error(`  ❌ Ошибка: ${pageError.message}`);
      errors.push(`Ошибка при обработке страницы "${pageData.title}" (${pageData.slug}): ${pageError.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Итоги инициализации:');
  console.log('='.repeat(60));
  console.log(`✅ Создано страниц: ${createdPages.length}`);
  console.log(`↻ Обновлено страниц: ${updatedPages.length}`);
  console.log(`⏭️  Пропущено страниц: ${skippedPages.length}`);
  console.log(`❌ Ошибок: ${errors.length}`);
  console.log(`📋 Всего обработано: ${wikiPages.length}`);

  if (createdPages.length > 0) {
    console.log('\n📄 Созданные страницы:');
    createdPages.forEach(slug => console.log(`   - ${slug}`));
  }

  if (updatedPages.length > 0) {
    console.log('\n↻ Обновленные страницы:');
    updatedPages.forEach(slug => console.log(`   - ${slug}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ Ошибки:');
    errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Инициализация завершена!');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Критическая ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

