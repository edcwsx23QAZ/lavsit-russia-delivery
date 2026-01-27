'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, FileText, ChevronRight } from 'lucide-react';

interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  order: number;
  parentId: string | null;
  parent?: WikiPage | null;
  children?: WikiPage[];
  createdAt: string;
  updatedAt: string;
}

interface PageManagerProps {
  onPageSelect: (page: WikiPage) => void;
  onPageCreate: (page: WikiPage) => void;
  onPageDelete: (pageId: string) => void;
  selectedPageId?: string;
}

export default function PageManager({
  onPageSelect,
  onPageCreate,
  onPageDelete,
  selectedPageId
}: PageManagerProps) {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wiki/pages');
      if (!response.ok) throw new Error('Ошибка загрузки страниц');
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('Error loading pages:', error);
      alert('Ошибка при загрузке страниц');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) {
      alert('Заполните заголовок и slug');
      return;
    }

    // Проверка формата slug (только латиница, цифры, дефисы)
    if (!/^[a-z0-9-]+$/.test(newPageSlug)) {
      alert('Slug может содержать только латинские буквы, цифры и дефисы');
      return;
    }

    try {
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPageTitle.trim(),
          slug: newPageSlug.trim(),
          content: `# ${newPageTitle.trim()}\n\nНовая страница. Начните редактирование.`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания страницы');
      }

      const newPage = await response.json();
      setPages([...pages, newPage]);
      setNewPageTitle('');
      setNewPageSlug('');
      setShowCreateDialog(false);
      onPageCreate(newPage);
      onPageSelect(newPage);
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Ошибка при создании страницы: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleDeletePage = async (pageId: string, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить страницу "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/wiki/pages?id=${pageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления страницы');

      setPages(pages.filter(p => p.id !== pageId));
      onPageDelete(pageId);
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Ошибка при удалении страницы');
    }
  };

  const renderPageTree = (pageList: WikiPage[], parentId: string | null = null, level: number = 0): JSX.Element[] => {
    return pageList
      .filter(page => page.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map(page => (
        <div key={page.id}>
          <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
              selectedPageId === page.id ? 'bg-blue-100 border border-blue-300' : ''
            }`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
            onClick={() => onPageSelect(page)}
          >
            {page.children && page.children.length > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="flex-1 font-medium">{page.title}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePage(page.id, page.title);
              }}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          {page.children && page.children.length > 0 && (
            <div className="ml-4">
              {renderPageTree(pageList, page.id, level + 1)}
            </div>
          )}
        </div>
      ));
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка страниц...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Страницы Wiki</CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Новая страница
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать новую страницу</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Заголовок</label>
                  <Input
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="Введите заголовок страницы"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                  <Input
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                    placeholder="page-slug"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Только латинские буквы, цифры и дефисы
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreatePage}>
                    Создать
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Нет страниц. Создайте первую страницу.
          </div>
        ) : (
          <div className="space-y-1">
            {renderPageTree(pages)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

