import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить все страницы или конкретную страницу
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const includeVersions = searchParams.get('includeVersions') === 'true';

    if (slug) {
      // Получить конкретную страницу по slug
      const page = await prisma.wikiPage.findUnique({
        where: { slug, isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          },
          versions: includeVersions ? {
            orderBy: { version: 'desc' },
            take: 10
          } : false
        }
      });

      if (!page) {
        return NextResponse.json({ error: 'Страница не найдена' }, { status: 404 });
      }

      return NextResponse.json(page);
    } else if (id) {
      // Получить конкретную страницу по id
      const page = await prisma.wikiPage.findUnique({
        where: { id, isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          },
          versions: includeVersions ? {
            orderBy: { version: 'desc' },
            take: 10
          } : false
        }
      });

      if (!page) {
        return NextResponse.json({ error: 'Страница не найдена' }, { status: 404 });
      }

      return NextResponse.json(page);
    } else {
      // Получить все активные страницы
      const pages = await prisma.wikiPage.findMany({
        where: { isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true }
          }
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });

      return NextResponse.json(pages);
    }
  } catch (error: any) {
    console.error('Error fetching wiki pages:', error);
    // Возвращаем пустой массив при ошибке подключения к БД
    try {
      const { searchParams } = new URL(request.url);
      const slug = searchParams.get('slug');
      const id = searchParams.get('id');
      
      if (slug || id) {
        return NextResponse.json({ error: 'Страница не найдена' }, { status: 404 });
      }
      return NextResponse.json([], { status: 200 });
    } catch (urlError) {
      return NextResponse.json([], { status: 200 });
    }
  }
}

// POST - Создать новую страницу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, content, parentId, order, createdBy } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Необходимы title и slug' },
        { status: 400 }
      );
    }

    // Проверка уникальности slug
    const existingPage = await prisma.wikiPage.findUnique({
      where: { slug }
    });

    if (existingPage) {
      return NextResponse.json(
        { error: 'Страница с таким slug уже существует' },
        { status: 409 }
      );
    }

    // Создать страницу
    const newPage = await prisma.wikiPage.create({
      data: {
        title,
        slug,
        content: content || `# ${title}\n\nНовая страница. Начните редактирование.`,
        parentId: parentId || null,
        order: order ?? 0,
        createdBy: createdBy || null,
        isActive: true
      },
      include: {
        parent: true,
        children: true
      }
    });

    // Создать первую версию
    await prisma.wikiVersion.create({
      data: {
        pageId: newPage.id,
        title: newPage.title,
        content: newPage.content,
        version: 1,
        changeNote: 'Создание страницы',
        createdBy: createdBy || null
      }
    });

    return NextResponse.json(newPage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating wiki page:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Страница с таким slug уже существует' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка при создании страницы: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}

// PUT - Обновить страницу
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, slug, content, parentId, order, updatedBy, changeNote } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Необходим id страницы' },
        { status: 400 }
      );
    }

    // Получить текущую страницу для создания версии
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

    // Если slug изменяется, проверить уникальность
    if (slug && slug !== currentPage.slug) {
      const existingPage = await prisma.wikiPage.findUnique({
        where: { slug }
      });

      if (existingPage) {
        return NextResponse.json(
          { error: 'Страница с таким slug уже существует' },
          { status: 409 }
        );
      }
    }

    // Подготовить данные для обновления
    const updateData: any = {
      updatedBy: updatedBy || null
    };

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (order !== undefined) updateData.order = order;

    // Обновить страницу
    const updatedPage = await prisma.wikiPage.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: {
          where: { isActive: true }
        }
      }
    });

    // Создать новую версию, если изменился контент или заголовок
    const contentChanged = content !== undefined && content !== currentPage.content;
    const titleChanged = title !== undefined && title !== currentPage.title;

    if (contentChanged || titleChanged) {
      const nextVersion = (currentPage.versions[0]?.version || 0) + 1;

      await prisma.wikiVersion.create({
        data: {
          pageId: updatedPage.id,
          title: updatedPage.title,
          content: updatedPage.content,
          version: nextVersion,
          changeNote: changeNote || 'Обновление страницы',
          createdBy: updatedBy || null
        }
      });

      // Очистить старые версии (оставить только последние 10)
      await prisma.wikiVersion.deleteMany({
        where: {
          pageId: id,
          version: {
            lt: nextVersion - 9 // Удалить версии старше 10 последних
          }
        }
      });
    }

    return NextResponse.json(updatedPage);
  } catch (error: any) {
    console.error('Error updating wiki page:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Страница не найдена' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Страница с таким slug уже существует' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка при обновлении страницы: ' + (error.message || 'Неизвестная ошибка') },
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
        { error: 'Необходим id страницы' },
        { status: 400 }
      );
    }

    // Мягкое удаление - помечаем как неактивную
    const deletedPage = await prisma.wikiPage.update({
      where: { id },
      data: { isActive: false },
      include: {
        parent: true,
        children: true
      }
    });

    return NextResponse.json(deletedPage);
  } catch (error: any) {
    console.error('Error deleting wiki page:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Страница не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка при удалении страницы: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}
