import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

const INSTRUCTION_SLUG = 'instruction-html';

/**
 * Ensures wiki_pages and wiki_versions tables exist.
 * Runs raw SQL with IF NOT EXISTS — safe to call every time.
 */
async function ensureTablesExist() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "wiki_pages" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdBy" TEXT,
        "updatedBy" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "wiki_pages_slug_key" ON "wiki_pages"("slug");

      CREATE TABLE IF NOT EXISTS "wiki_versions" (
        "id" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "version" INTEGER NOT NULL,
        "changeNote" TEXT,
        "createdBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "wiki_versions_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "wiki_versions_pageId_idx" ON "wiki_versions"("pageId");
      CREATE UNIQUE INDEX IF NOT EXISTS "wiki_versions_pageId_version_key" ON "wiki_versions"("pageId", "version");

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wiki_versions_pageId_fkey') THEN
          ALTER TABLE "wiki_versions" ADD CONSTRAINT "wiki_versions_pageId_fkey"
            FOREIGN KEY ("pageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  } catch (e) {
    // Table might already exist or DB doesn't support some syntax — that's fine
    console.warn('ensureTablesExist notice:', (e as Error).message?.substring(0, 200));
  }
}

// Track if we've already ensured tables in this runtime
let tablesEnsured = false;

async function ensureOnce() {
  if (!tablesEnsured) {
    await ensureTablesExist();
    tablesEnsured = true;
  }
}

// GET - Serve the instruction HTML content
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  try {
    await ensureOnce();

    const page = await prisma.wikiPage.findFirst({
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
      return new NextResponse(page.content, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
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
    await ensureOnce();

    const body = await request.json();
    const { content, changeNote } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Try to find existing page
    let page = await prisma.wikiPage.findFirst({
      where: { slug: INSTRUCTION_SLUG },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (page) {
      const nextVersion = (page.versions[0]?.version || 0) + 1;

      const updatedPage = await prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          content,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      await prisma.wikiVersion.create({
        data: {
          pageId: updatedPage.id,
          title: 'Инструкция для логистов — Лавсит',
          content,
          version: nextVersion,
          changeNote: changeNote || 'Обновление инструкции',
        },
      });

      // Keep last 30 versions
      const oldestToKeep = nextVersion - 30 + 1;
      if (oldestToKeep > 1) {
        await prisma.wikiVersion.deleteMany({
          where: {
            pageId: updatedPage.id,
            version: { lt: oldestToKeep },
          },
        });
      }

      return NextResponse.json({
        id: updatedPage.id,
        updatedAt: updatedPage.updatedAt,
        version: nextVersion,
      });
    } else {
      // Create new page with cuid
      const id = generateCuid();
      const newPage = await prisma.wikiPage.create({
        data: {
          id,
          title: 'Инструкция для логистов — Лавсит',
          slug: INSTRUCTION_SLUG,
          content,
          order: 0,
          isActive: true,
        },
      });

      await prisma.wikiVersion.create({
        data: {
          pageId: newPage.id,
          title: 'Инструкция для логистов — Лавсит',
          content,
          version: 1,
          changeNote: 'Первоначальное сохранение',
        },
      });

      return NextResponse.json(
        {
          id: newPage.id,
          updatedAt: newPage.updatedAt,
          version: 1,
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error('Error saving instruction:', error);
    return NextResponse.json(
      {
        error: 'Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'),
      },
      { status: 500 }
    );
  }
}

/** Simple cuid-like id generator */
function generateCuid(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return 'c' + ts + rand;
}
