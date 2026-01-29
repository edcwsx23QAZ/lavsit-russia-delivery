import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить версии страницы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const version = searchParams.get('version');

    if (!pageId) {
      return NextResponse.json(
        { error: 'Необходим pageId' },
        { status: 400 }
      );
    }

    if (version) {
      // Получить конкретную версию
      const versionData = await prisma.wikiVersion.findUnique({
        where: {
          pageId_version: {
            pageId,
            version: parseInt(version)
          }
        },
        include: {
          page: true
        }
      });

      if (!versionData) {
        return NextResponse.json(
          { error: 'Версия не найдена' },
          { status: 404 }
        );
      }

      return NextResponse.json(versionData);
    } else {
      // Получить все версии страницы
      const versions = await prisma.wikiVersion.findMany({
        where: { pageId },
        orderBy: { version: 'desc' },
        include: {
          page: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      return NextResponse.json(versions);
    }
  } catch (error) {
    console.error('Error fetching wiki versions:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении версий' },
      { status: 500 }
    );
  }
}

// POST - Откатить страницу к определенной версии
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, version, restoredBy, changeNote } = body;

    if (!pageId || !version) {
      return NextResponse.json(
        { error: 'Необходимы pageId и version' },
        { status: 400 }
      );
    }

    // Получить версию для отката
    const versionToRestore = await prisma.wikiVersion.findUnique({
      where: {
        pageId_version: {
          pageId,
          version: parseInt(version)
        }
      }
    });

    if (!versionToRestore) {
      return NextResponse.json(
        { error: 'Версия не найдена' },
        { status: 404 }
      );
    }

    // Получить текущую страницу для определения следующей версии
    const currentPage = await prisma.wikiPage.findUnique({
      where: { id: pageId },
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

    // Обновить страницу и создать новую версию с восстановленным контентом
    const restoredPage = await prisma.wikiPage.update({
      where: { id: pageId },
      data: {
        title: versionToRestore.title,
        content: versionToRestore.content,
        updatedBy: restoredBy || null,
        versions: {
          create: {
            content: versionToRestore.content,
            title: versionToRestore.title,
            version: nextVersion,
            changeNote: changeNote || `Откат к версии ${version}`,
            createdBy: restoredBy || null
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

    return NextResponse.json(restoredPage);
  } catch (error) {
    console.error('Error restoring wiki version:', error);
    return NextResponse.json(
      { error: 'Ошибка при откате версии' },
      { status: 500 }
    );
  }
}

