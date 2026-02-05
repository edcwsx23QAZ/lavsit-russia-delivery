/**
 * Объединенный файл со всеми разделами вики
 * Используется для инициализации полной структуры вики
 */

import { introductionContent } from './wiki-section-1-introduction';
import { cultureContent } from './wiki-section-2-culture';
import { logisticsValueContent } from './wiki-section-3-value';
import { dailyScheduleContent } from './wiki-section-4-schedule';
import { processesContent } from './wiki-section-5-processes';
import { metricsContent } from './wiki-section-6-metrics';
import { toolsContent } from './wiki-section-7-tools';
import { contactsContent } from './wiki-section-8-contacts';
import { accountsContent } from './wiki-section-9-accounts';
import { scriptsContent } from './wiki-section-10-scripts';
import { linksContent } from './wiki-section-11-links';

export interface WikiPageData {
  slug: string;
  title: string;
  content: string;
  order: number;
  parentSlug?: string;
}

export const allWikiPages: WikiPageData[] = [
  introductionContent,
  cultureContent,
  logisticsValueContent,
  dailyScheduleContent,
  processesContent,
  metricsContent,
  toolsContent,
  contactsContent,
  accountsContent,
  scriptsContent,
  linksContent
];

export function getAllWikiPages(): WikiPageData[] {
  return allWikiPages;
}


