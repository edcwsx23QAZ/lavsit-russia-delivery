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
<<<<<<< HEAD
      // Получить конкретную страницу
=======
      // Получить конкретную страницу по slug
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
      const page = await prisma.wikiPage.findUnique({
        where: { slug, isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
<<<<<<< HEAD
            orderBy: { order: 'asc' }
          },
          ...(includeVersions && {
            versions: {
              orderBy: { version: 'desc' },
              take: 10 // Последние 10 версий
            }
          })
=======
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          },
          versions: includeVersions ? {
            orderBy: { version: 'desc' },
            take: 10
          } : false
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
        }
      });

      if (!page) {
        return NextResponse.json({ error: 'Страница не найдена' }, { status: 404 });
      }

      return NextResponse.json(page);
<<<<<<< HEAD
    } else {
      // Получить все страницы
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
      const pages = await prisma.wikiPage.findMany({
        where: { isActive: true },
        include: {
          parent: true,
          children: {
            where: { isActive: true }
          }
        },
<<<<<<< HEAD
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ]
=======
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
      });

      return NextResponse.json(pages);
    }
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
<<<<<<< HEAD
    return NextResponse.json(
      { error: 'Ошибка при получении страниц' },
      { status: 500 }
    );
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
  }
}

// POST - Создать новую страницу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
<<<<<<< HEAD
    const { title, content, slug, parentId, order, createdBy } = body;

    if (!title || !content || !slug) {
      return NextResponse.json(
        { error: 'Необходимы title, content и slug' },
=======
    const { title, slug, content, parentId, order, createdBy } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Необходимы title и slug' },
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
        { status: 400 }
      );
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
      },
      include: {
        parent: true,
        children: true
      }
    });

<<<<<<< HEAD
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Error creating wiki page:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании страницы' },
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
      { status: 500 }
    );
  }
}

// PUT - Обновить страницу
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
<<<<<<< HEAD
    const { id, title, content, slug, parentId, order, updatedBy, changeNote } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Необходим ID страницы' },
=======
    const { id, title, slug, content, parentId, order, updatedBy, changeNote } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Необходим id страницы' },
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
        { status: 400 }
      );
    }

<<<<<<< HEAD
    // Получить текущую страницу для определения следующей версии
=======
    // Получить текущую страницу для создания версии
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
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

<<<<<<< HEAD
    const nextVersion = (currentPage.versions[0]?.version || 0) + 1;

    // Обновить страницу и создать новую версию
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
    const updateData: any = {
      updatedBy: updatedBy || null
    };

    if (title !== undefined) updateData.title = title;
<<<<<<< HEAD
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
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
        }
      }
    });

<<<<<<< HEAD
    return NextResponse.json(page);
  } catch (error) {
    console.error('Error updating wiki page:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении страницы' },
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
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
<<<<<<< HEAD
        { error: 'Необходим ID страницы' },
=======
        { error: 'Необходим id страницы' },
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
        { status: 400 }
      );
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> 9f775808 (feat: СЂРµР°Р»РёР·Р°С†РёСЏ РїРѕР»РЅРѕР№ РІРёРєРё-РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Р»РѕРіРёСЃС‚РѕРІ)
      { status: 500 }
    );
  }
}

