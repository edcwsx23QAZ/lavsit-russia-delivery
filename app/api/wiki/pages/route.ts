import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить все страницы или конкретную страницу
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const includeVersions = searchParams.get('includeVersions') === 'true';

    if (slug) {
      // Получить конкретную страницу
      const page = await prisma.wikiPage.findUnique({
        where: { slug, isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          },
          ...(includeVersions && {
            versions: {
              orderBy: { version: 'desc' },
              take: 10 // Последние 10 версий
            }
          })
        }
      });

      if (!page) {
        return NextResponse.json({ error: 'Страница не найдена' }, { status: 404 });
      }

      return NextResponse.json(page);
    } else {
      // Получить все страницы
      const pages = await prisma.wikiPage.findMany({
        where: { isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true }
          }
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return NextResponse.json(pages);
    }
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении страниц' },
      { status: 500 }
    );
  }
}

// POST - Создать новую страницу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, slug, parentId, order, createdBy } = body;

    if (!title || !content || !slug) {
      return NextResponse.json(
        { error: 'Необходимы title, content и slug' },
        { status: 400 }
      );
    }

    // Проверить, существует ли уже страница с таким slug
    const existing = await prisma.wikiPage.findUnique({
      where: { slug }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Страница с таким slug уже существует' },
        { status: 400 }
      );
    }

    // Создать страницу и первую версию
    const page = await prisma.wikiPage.create({
      data: {
        title,
        content,
        slug,
        parentId: parentId || null,
        order: order || 0,
        createdBy: createdBy || null,
        versions: {
          create: {
            content,
            title,
            version: 1,
            changeNote: 'Создание страницы',
            createdBy: createdBy || null
          }
        }
      },
      include: {
        parent: true,
        children: true
      }
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Error creating wiki page:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании страницы' },
      { status: 500 }
    );
  }
}

// PUT - Обновить страницу
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, slug, parentId, order, updatedBy, changeNote } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Необходим ID страницы' },
        { status: 400 }
      );
    }

    // Получить текущую страницу для определения следующей версии
    const currentPage = await prisma.wikiPage.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!currentPage) {
      return NextResponse.json(
        { error: 'Страница не найдена' },
        { status: 404 }
      );
    }

    const nextVersion = (currentPage.versions[0]?.version || 0) + 1;

    // Обновить страницу и создать новую версию
    const updateData: any = {
      updatedBy: updatedBy || null
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (slug !== undefined) {
      // Проверить уникальность slug, если он изменяется
      if (slug !== currentPage.slug) {
        const existing = await prisma.wikiPage.findUnique({
          where: { slug }
        });
        if (existing) {
          return NextResponse.json(
            { error: 'Страница с таким slug уже существует' },
            { status: 400 }
          );
        }
        updateData.slug = slug;
      }
    }
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (order !== undefined) updateData.order = order;

    const page = await prisma.wikiPage.update({
      where: { id },
      data: {
        ...updateData,
        versions: {
          create: {
            content: content || currentPage.content,
            title: title || currentPage.title,
            version: nextVersion,
            changeNote: changeNote || `Обновление версии ${nextVersion}`,
            createdBy: updatedBy || null
          }
        }
      },
      include: {
        parent: true,
        children: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 10
        }
      }
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error updating wiki page:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении страницы' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить страницу (мягкое удаление)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Необходим ID страницы' },
        { status: 400 }
      );
    }

    // Мягкое удаление - просто помечаем как неактивную
    const page = await prisma.wikiPage.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error('Error deleting wiki page:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении страницы' },
      { status: 500 }
    );
  }
}

