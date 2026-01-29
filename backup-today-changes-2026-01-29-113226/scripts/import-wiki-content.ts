/**
 * Скрипт для импорта начального контента вики
 * Запуск: npx tsx scripts/import-wiki-content.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WikiPageData {
  slug: string;
  title: string;
  content: string;
  order: number;
  parentId?: string | null;
}

const initialPages: WikiPageData[] = [
  {
    slug: 'introduction',
    title: 'Инструкция для менеджера по логистике',
    content: JSON.stringify({
      sections: [
        {
          id: 'intro-1',
          title: 'Введение',
          content: 'Эта инструкция предназначена для менеджеров по логистике компании Лавсит. Здесь собраны основные принципы, процессы, инструменты и контакты, необходимые для эффективной работы в премиум-сегменте.',
          order: 0
        },
        {
          id: 'intro-2',
          title: 'Культура и структура компании',
          content: 'Мы работаем в премиум-сегменте мебельного производства. Наша цель - обеспечить клиентам идеальный опыт доставки (AJTBD - Always Just The Best Delivery). Клиент находится в центре всех наших решений (Клиентократия), и мы стремимся создавать "героев продукта" через отличный сервис (Product Heroes).',
          order: 1
        },
        {
          id: 'intro-3',
          title: 'Цели и задачи отдела логистики',
          content: 'Отдел логистики состоит из двух логистов, кладовщика и команды экспедиторов-сборщиков. Наша основная задача - обеспечить своевременную, качественную доставку мебели премиум-класса с максимальным уровнем сервиса.',
          order: 2
        },
        {
          id: 'intro-4',
          title: 'Роль логиста',
          content: 'Логист - это ключевое звено между клиентом, производством, складом и доставкой. От качества работы логиста зависит удовлетворенность клиента и репутация компании. Каждое взаимодействие должно быть на уровне премиум-сервиса.',
          order: 3
        }
      ]
    }),
    order: 0,
    parentId: null
  }
];

async function importPages() {
  try {
    console.log('Начало импорта страниц вики...');

    for (const pageData of initialPages) {
      // Проверить существование страницы
      const existing = await prisma.wikiPage.findUnique({
        where: { slug: pageData.slug }
      });

      if (existing) {
        console.log(`Страница "${pageData.title}" уже существует, пропускаем...`);
        continue;
      }

      // Создать страницу
      const page = await prisma.wikiPage.create({
        data: {
          slug: pageData.slug,
          title: pageData.title,
          content: pageData.content,
          order: pageData.order,
          parentId: pageData.parentId || null,
          isActive: true
        }
      });

      // Создать первую версию
      await prisma.wikiVersion.create({
        data: {
          pageId: page.id,
          title: page.title,
          content: page.content,
          version: 1,
          changeNote: 'Создание начальной страницы',
          createdBy: null
        }
      });

      console.log(`✓ Создана страница: ${pageData.title}`);
    }

    console.log('Импорт завершен успешно!');
  } catch (error) {
    console.error('Ошибка при импорте:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importPages();

