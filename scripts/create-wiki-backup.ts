/**
 * Скрипт для создания бэкапа вики-инструкции в локальный репозитарий
 * Запуск: npx tsx scripts/create-wiki-backup.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function createBackup() {
  try {
    console.log('Создание бэкапа вики-инструкции...\n');

    // Получить все страницы с версиями
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

    console.log(`Найдено страниц: ${pages.length}`);

    // Создать структуру бэкапа
    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      totalPages: pages.length,
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
        parent: page.parent ? {
          id: page.parent.id,
          title: page.parent.title,
          slug: page.parent.slug
        } : null,
        children: page.children.map(child => ({
          id: child.id,
          title: child.title,
          slug: child.slug
        })),
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

    // Создать директорию для бэкапов, если её нет
    const backupDir = path.join(process.cwd(), 'backups', 'wiki');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Сохранить бэкап
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFileName = `wiki-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    fs.writeFileSync(
      backupPath,
      JSON.stringify(backup, null, 2),
      'utf-8'
    );

    console.log(`✓ Бэкап создан: ${backupPath}`);
    console.log(`  - Страниц: ${pages.length}`);
    console.log(`  - Всего версий: ${backup.pages.reduce((sum, p) => sum + p.versions.length, 0)}`);
    console.log(`  - Размер файла: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);

    // Создать также краткий отчет
    const reportPath = path.join(backupDir, `wiki-backup-report-${timestamp}.txt`);
    const report = [
      `Бэкап вики-инструкции`,
      `Дата создания: ${new Date().toLocaleString('ru-RU')}`,
      `Всего страниц: ${pages.length}`,
      ``,
      `Список страниц:`,
      ...pages.map((p, i) => `${i + 1}. ${p.title} (${p.slug})`),
      ``,
      `Файл бэкапа: ${backupFileName}`
    ].join('\n');

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`✓ Отчет создан: ${reportPath}`);

    // Сохранить также в корне проекта для удобства
    const rootBackupPath = path.join(process.cwd(), 'wiki-backup-latest.json');
    fs.writeFileSync(
      rootBackupPath,
      JSON.stringify(backup, null, 2),
      'utf-8'
    );
    console.log(`✓ Последний бэкап сохранен: ${rootBackupPath}`);

    console.log('\n✓ Бэкап успешно создан!');

  } catch (error) {
    console.error('Ошибка при создании бэкапа:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBackup();


