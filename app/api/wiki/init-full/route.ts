import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllWikiPages } from '@/data/wiki-all-sections';

interface WikiPageData {
  slug: string;
  title: string;
  content: string;
  order: number;
  parentSlug?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { overwrite = false } = await request.json().catch(() => ({}));

    const wikiPages = getAllWikiPages();
    const createdPages: string[] = [];
    const updatedPages: string[] = [];
    const skippedPages: string[] = [];
    const errors: string[] = [];

    // Сначала создаем все страницы без родительских связей
    const pageMap = new Map<string, string>(); // slug -> id

    for (const pageData of wikiPages) {
      try {
        // Проверяем, существует ли страница
        const existing = await prisma.wikiPage.findUnique({
          where: { slug: pageData.slug }
        });

        if (existing && !overwrite) {
          skippedPages.push(pageData.slug);
          pageMap.set(pageData.slug, existing.id);
          continue;
        }

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

        if (existing && overwrite) {
          // Обновляем существующую страницу
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
        } else {
          // Создаем новую страницу
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
        }
      } catch (pageError: any) {
        console.error(`Error processing page ${pageData.slug}:`, pageError);
        errors.push(`Ошибка при обработке страницы "${pageData.title}" (${pageData.slug}): ${pageError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Полная структура вики инициализирована',
      stats: {
        total: wikiPages.length,
        created: createdPages.length,
        updated: updatedPages.length,
        skipped: skippedPages.length,
        errors: errors.length
      },
      pages: {
        created: createdPages,
        updated: updatedPages,
        skipped: skippedPages
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error initializing full wiki structure:', error);
    return NextResponse.json(
      { error: 'Ошибка при инициализации структуры вики: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}


