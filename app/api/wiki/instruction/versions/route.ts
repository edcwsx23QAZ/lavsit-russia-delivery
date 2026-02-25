import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INSTRUCTION_SLUG = 'instruction-html';

// GET - Get version history for the instruction
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('versionId');

  try {
    const page = await prisma.wikiPage.findUnique({
      where: { slug: INSTRUCTION_SLUG },
    });

    if (!page) {
      return NextResponse.json({ versions: [] });
    }

    if (versionId) {
      // Get specific version content
      const version = await prisma.wikiVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) {
        return NextResponse.json(
          { error: 'Версия не найдена' },
          { status: 404 }
        );
      }

      return NextResponse.json(version);
    }

    // Get all versions (without full content for listing)
    const versions = await prisma.wikiVersion.findMany({
      where: { pageId: page.id },
      select: {
        id: true,
        version: true,
        changeNote: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { version: 'desc' },
      take: 30,
    });

    return NextResponse.json({ versions, pageId: page.id });
  } catch (error: any) {
    console.error('Error fetching instruction versions:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки версий' },
      { status: 500 }
    );
  }
}

// POST - Restore a specific version
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId is required' },
        { status: 400 }
      );
    }

    // Get the version to restore
    const version = await prisma.wikiVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Версия не найдена' },
        { status: 404 }
      );
    }

    // Get current page
    const page = await prisma.wikiPage.findUnique({
      where: { slug: INSTRUCTION_SLUG },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: 'Страница не найдена' },
        { status: 404 }
      );
    }

    const nextVersion = (page.versions[0]?.version || 0) + 1;

    // Update page content
    await prisma.wikiPage.update({
      where: { slug: INSTRUCTION_SLUG },
      data: { content: version.content },
    });

    // Create new version (restore point)
    await prisma.wikiVersion.create({
      data: {
        pageId: page.id,
        title: page.title,
        content: version.content,
        version: nextVersion,
        changeNote: `Восстановлено из версии ${version.version}`,
      },
    });

    return NextResponse.json({
      success: true,
      version: nextVersion,
    });
  } catch (error: any) {
    console.error('Error restoring instruction version:', error);
    return NextResponse.json(
      { error: 'Ошибка восстановления версии' },
      { status: 500 }
    );
  }
}

