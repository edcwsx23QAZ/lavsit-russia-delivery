'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, FileText, ChevronRight, ChevronDown, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';

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
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; pageId: string | null; title: string }>({
    open: false,
    pageId: null,
    title: '',
  });

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
      toast.error('Заполните заголовок и slug');
      return;
    }

    // Проверка формата slug (только латиница, цифры, дефисы)
    if (!/^[a-z0-9-]+$/.test(newPageSlug)) {
      toast.error('Slug может содержать только латинские буквы, цифры и дефисы');
      return;
    }

    try {
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPageTitle.trim(),
          slug: newPageSlug.trim(),
          content: `# ${newPageTitle.trim()}\n\nНовая страница. Начните редактирование.`,
          parentId: newPageParentId || null,
          order: 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания страницы');
      }

      const newPage = await response.json();
      await loadPages(); // Перезагрузить страницы для обновления дерева
      setNewPageTitle('');
      setNewPageSlug('');
      setNewPageParentId(null);
      setShowCreateDialog(false);
      onPageCreate(newPage);
      onPageSelect(newPage);
      toast.success('Страница успешно создана');
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error('Ошибка при создании страницы: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleDeletePageClick = (pageId: string, title: string) => {
    setDeleteDialog({ open: true, pageId, title });
  };

  const handleDeletePage = async () => {
    const { pageId, title } = deleteDialog;
    if (!pageId) return;

    try {
      const response = await fetch(`/api/wiki/pages?id=${pageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления страницы');

      setPages(pages.filter(p => p.id !== pageId));
      onPageDelete(pageId);
      toast.success(`Страница "${title}" успешно удалена`);
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Ошибка при удалении страницы');
    } finally {
      setDeleteDialog({ open: false, pageId: null, title: '' });
    }
  };

  const toggleExpand = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const handleCreateChildPage = (parentId: string, parentTitle: string) => {
    setNewPageParentId(parentId);
    setNewPageTitle(`${parentTitle} - `);
    setShowCreateDialog(true);
  };

  const renderPageTree = (pageList: WikiPage[], parentId: string | null = null, level: number = 0): JSX.Element[] => {
    const children = pageList
      .filter(page => page.parentId === parentId)
      .sort((a, b) => a.order - b.order);

    return children.map(page => {
      const hasChildren = page.children && page.children.length > 0;
      const isExpanded = expandedPages.has(page.id);
      const childrenToRender = hasChildren && isExpanded;

      return (
        <div key={page.id}>
          <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
              selectedPageId === page.id ? 'bg-blue-100 border border-blue-300' : ''
            }`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(page.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-5" /> // Placeholder для выравнивания
            )}
            <FileText 
              className="w-4 h-4 text-gray-500 flex-shrink-0" 
              onClick={() => onPageSelect(page)}
            />
            <span 
              className="flex-1 font-medium"
              onClick={() => onPageSelect(page)}
            >
              {page.title}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateChildPage(page.id, page.title);
                }}
                title="Создать дочернюю страницу"
              >
                <FolderPlus className="w-4 h-4 text-blue-500" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePageClick(page.id, page.title);
                }}
                title="Удалить страницу"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
          {childrenToRender && (
            <div className="ml-4">
              {renderPageTree(pageList, page.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
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
                {newPageParentId && (
                  <div className="p-2 bg-blue-50 rounded text-sm text-blue-700">
                    Создается как дочерняя страница
                  </div>
                )}
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
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Удаление страницы"
        description={`Вы уверены, что хотите удалить страницу "${deleteDialog.title}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeletePage}
        variant="destructive"
      />
    </Card>
  );
}

