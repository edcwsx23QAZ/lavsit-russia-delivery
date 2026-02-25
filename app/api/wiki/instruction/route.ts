import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

const INSTRUCTION_SLUG = 'instruction-html';

// GET - Serve the instruction HTML content
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format'); // 'html' for raw HTML, 'json' for JSON wrapper

  try {
    // Try to get from database first
    const page = await prisma.wikiPage.findUnique({
      where: { slug: INSTRUCTION_SLUG, isActive: true },
    });

    if (page) {
      if (format === 'json') {
        return NextResponse.json({
          id: page.id,
          content: page.content,
          updatedAt: page.updatedAt,
          title: page.title,
        });
      }
      // Return raw HTML
      return new NextResponse(page.content, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('DB error, falling back to static file:', error);
  }

  // Fallback to static file
  try {
    const filePath = join(process.cwd(), 'public', 'instruction.html');
    const html = await readFile(filePath, 'utf-8');

    if (format === 'json') {
      return NextResponse.json({
        id: null,
        content: html,
        updatedAt: null,
        title: 'Инструкция для логистов — Лавсит',
      });
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (fileError) {
    console.error('Error reading static instruction file:', fileError);
    return new NextResponse('<h1>Инструкция не найдена</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// PUT - Save edited instruction HTML
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, changeNote } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Try to find existing page
    let page = await prisma.wikiPage.findUnique({
      where: { slug: INSTRUCTION_SLUG },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (page) {
      // Update existing page
      const nextVersion = (page.versions[0]?.version || 0) + 1;

      const updatedPage = await prisma.wikiPage.update({
        where: { slug: INSTRUCTION_SLUG },
        data: {
          content,
          isActive: true,
        },
      });

      // Create version
      await prisma.wikiVersion.create({
        data: {
          pageId: updatedPage.id,
          title: 'Инструкция для логистов — Лавсит',
          content,
          version: nextVersion,
          changeNote: changeNote || 'Обновление инструкции',
        },
      });

      // Clean up old versions (keep last 30 for 30-day rollback)
      const versionsToKeep = 30;
      const oldestVersionToKeep = nextVersion - versionsToKeep + 1;
      if (oldestVersionToKeep > 1) {
        await prisma.wikiVersion.deleteMany({
          where: {
            pageId: updatedPage.id,
            version: { lt: oldestVersionToKeep },
          },
        });
      }

      return NextResponse.json({
        id: updatedPage.id,
        updatedAt: updatedPage.updatedAt,
        version: nextVersion,
      });
    } else {
      // Create new page
      const newPage = await prisma.wikiPage.create({
        data: {
          title: 'Инструкция для логистов — Лавсит',
          slug: INSTRUCTION_SLUG,
          content,
          order: 0,
          isActive: true,
        },
      });

      // Create first version
      await prisma.wikiVersion.create({
        data: {
          pageId: newPage.id,
          title: 'Инструкция для логистов — Лавсит',
          content,
          version: 1,
          changeNote: 'Первоначальное сохранение инструкции',
        },
      });

      return NextResponse.json({
        id: newPage.id,
        updatedAt: newPage.updatedAt,
        version: 1,
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error saving instruction:', error);
    return NextResponse.json(
      { error: 'Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}

