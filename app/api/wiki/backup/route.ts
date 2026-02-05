import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Экспорт всех страниц и версий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Получить все активные страницы
    const pages = await prisma.wikiPage.findMany({
      where: { isActive: true },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 10 // Последние 10 версий каждой страницы
        }
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      pages: pages.map(page => ({
        id: page.id,
        slug: page.slug,
        title: page.title,
        content: page.content,
        order: page.order,
        parentId: page.parentId,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
        createdBy: page.createdBy,
        updatedBy: page.updatedBy,
        versions: page.versions.map(v => ({
          id: v.id,
          content: v.content,
          title: v.title,
          version: v.version,
          changeNote: v.changeNote,
          createdBy: v.createdBy,
          createdAt: v.createdAt.toISOString()
        }))
      }))
    };

    if (format === 'json') {
      return NextResponse.json(backup, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="wiki-backup-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    // Для других форматов можно добавить конвертацию
    return NextResponse.json(backup);
  } catch (error: any) {
    console.error('Error exporting backup:', error);
    return NextResponse.json(
      { error: 'Ошибка при экспорте бэкапа: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}

// POST - Импорт страниц и версий
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pages, overwrite = false } = body;

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Неверный формат данных. Ожидается массив pages.' },
        { status: 400 }
      );
    }

    const importedPages: Array<{ slug: string; title: string; action: string }> = [];
    const errors: string[] = [];

    for (const pageData of pages) {
      try {
        // Проверить существование страницы
        const existingPage = await prisma.wikiPage.findUnique({
          where: { slug: pageData.slug }
        });

        if (existingPage && !overwrite) {
          errors.push(`Страница "${pageData.title}" (${pageData.slug}) уже существует. Используйте overwrite=true для перезаписи.`);
          continue;
        }

        if (existingPage && overwrite) {
          // Обновить существующую страницу
          const updatedPage = await prisma.wikiPage.update({
            where: { slug: pageData.slug },
            data: {
              title: pageData.title,
              content: pageData.content,
              order: pageData.order,
              parentId: pageData.parentId || null,
              updatedBy: pageData.updatedBy || null
            }
          });

          // Импортировать версии
          if (pageData.versions && Array.isArray(pageData.versions)) {
            for (const versionData of pageData.versions) {
              try {
                await prisma.wikiVersion.upsert({
                  where: {
                    pageId_version: {
                      pageId: updatedPage.id,
                      version: versionData.version
                    }
                  },
                  create: {
                    pageId: updatedPage.id,
                    content: versionData.content,
                    title: versionData.title,
                    version: versionData.version,
                    changeNote: versionData.changeNote || `Импортировано из бэкапа`,
                    createdBy: versionData.createdBy || null
                  },
                  update: {
                    content: versionData.content,
                    title: versionData.title,
                    changeNote: versionData.changeNote || `Импортировано из бэкапа`
                  }
                });
              } catch (versionError) {
                console.error(`Error importing version ${versionData.version} for page ${pageData.slug}:`, versionError);
              }
            }
          }

          importedPages.push({ slug: updatedPage.slug, title: updatedPage.title, action: 'updated' });
        } else {
          // Создать новую страницу
          const newPage = await prisma.wikiPage.create({
            data: {
              slug: pageData.slug,
              title: pageData.title,
              content: pageData.content,
              order: pageData.order,
              parentId: pageData.parentId || null,
              createdBy: pageData.createdBy || null,
              isActive: true
            }
          });

          // Импортировать версии
          if (pageData.versions && Array.isArray(pageData.versions)) {
            for (const versionData of pageData.versions) {
              try {
                await prisma.wikiVersion.create({
                  data: {
                    pageId: newPage.id,
                    content: versionData.content,
                    title: versionData.title,
                    version: versionData.version,
                    changeNote: versionData.changeNote || `Импортировано из бэкапа`,
                    createdBy: versionData.createdBy || null
                  }
                });
              } catch (versionError) {
                console.error(`Error importing version ${versionData.version} for page ${pageData.slug}:`, versionError);
              }
            }
          }

          importedPages.push({ slug: newPage.slug, title: newPage.title, action: 'created' });
        }
      } catch (pageError: any) {
        console.error(`Error importing page ${pageData.slug}:`, pageError);
        errors.push(`Ошибка при импорте страницы "${pageData.title}" (${pageData.slug}): ${pageError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedPages.length,
      pages: importedPages,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error importing backup:', error);
    return NextResponse.json(
      { error: 'Ошибка при импорте бэкапа: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}

