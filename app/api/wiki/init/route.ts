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

// Получаем полную структуру из объединенного файла
const wikiStructure: WikiPageData[] = getAllWikiPages();

export async function POST(request: NextRequest) {
  try {
    const { overwrite = false } = await request.json().catch(() => ({}));

    const createdPages: string[] = [];
    const skippedPages: string[] = [];

    for (const pageData of wikiStructure) {
      // Проверяем, существует ли страница
      const existing = await prisma.wikiPage.findUnique({
        where: { slug: pageData.slug }
      });

      if (existing && !overwrite) {
        skippedPages.push(pageData.slug);
        continue;
      }

      // Находим родительскую страницу, если указана
      let parentId: string | null = null;
      if (pageData.parentSlug) {
        const parent = await prisma.wikiPage.findUnique({
          where: { slug: pageData.parentSlug }
        });
        if (parent) {
          parentId = parent.id;
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
            changeNote: 'Инициализация структуры вики',
            createdBy: null
          }
        });

        createdPages.push(pageData.slug);
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
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Структура вики инициализирована',
      created: createdPages.length,
      skipped: skippedPages.length,
      pages: {
        created: createdPages,
        skipped: skippedPages
      }
    });
  } catch (error: any) {
    console.error('Error initializing wiki structure:', error);
    return NextResponse.json(
      { error: 'Ошибка при инициализации структуры вики: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}

