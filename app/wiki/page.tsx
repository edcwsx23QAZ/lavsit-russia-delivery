'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WikiEditor from '@/components/wiki/WikiEditor';
import WikiContentEditor, { WikiContentEditorRef } from '@/components/wiki/WikiContentEditor';
import PageManager from '@/components/wiki/PageManager';
import VersionHistory from '@/components/wiki/VersionHistory';
import { FileText, Edit, History, ArrowLeft, Layout, Save, Loader2, Lock, Unlock } from 'lucide-react';

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

export default function WikiPage() {
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isStructuredEditing, setIsStructuredEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const wikiEditorRef = useRef<WikiContentEditorRef>(null);

  // Загрузить страницу по slug из URL или первую доступную
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (slug) {
      loadPageBySlug(slug);
    } else {
      // Загрузить первую страницу или создать дефолтную
      loadDefaultPage();
    }
  }, []);

  const loadPageBySlug = async (slug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wiki/pages?slug=${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Если страница не найдена, попробуем загрузить первую доступную
          await loadDefaultPage();
          return;
        }
        throw new Error('Страница не найдена');
      }
      const page = await response.json();
      if (page) {
        setSelectedPage(page);
      }
    } catch (error) {
      console.error('Error loading page:', error);
      // Попробуем загрузить первую доступную страницу
      await loadDefaultPage();
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPage = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wiki/pages');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const pages = await response.json();
      
      if (pages.length > 0) {
        setSelectedPage(pages[0]);
        // Обновить URL с slug первой страницы
        window.history.pushState({}, '', `/wiki?slug=${pages[0].slug}`);
      } else {
        // Создать дефолтную страницу при первом запуске
        createDefaultPage();
      }
    } catch (error) {
      console.error('Error loading default page:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPage = async () => {
    try {
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Инструкция для менеджера по логистике',
          slug: 'introduction',
          content: `# Инструкция для менеджера по логистике

Добро пожаловать в систему управления инструкциями логиста!

## Начало работы

Это вики-система, где вы можете:
- Создавать и редактировать страницы
- Добавлять изображения перетаскиванием
- Просматривать историю изменений
- Откатываться к предыдущим версиям

## Как редактировать

1. Нажмите кнопку "Редактировать" для текущей страницы
2. Используйте панель инструментов для форматирования
3. Перетащите изображения в область редактирования
4. Сохраните изменения

## Структура страниц

Вы можете создавать вложенные страницы для организации информации.

Начните редактирование, чтобы создать вашу первую страницу!
`
        })
      });

      if (response.ok) {
        const page = await response.json();
        setSelectedPage(page);
      }
    } catch (error) {
      console.error('Error creating default page:', error);
    }
  };

  const handleSave = async (title: string, content: string, changeNote?: string) => {
    if (!selectedPage) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/wiki/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPage.id,
          title,
          content,
          changeNote
        })
      });

      if (!response.ok) throw new Error('Ошибка сохранения');
      
      const updatedPage = await response.json();
      setSelectedPage(updatedPage);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving page:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleStructuredSave = async (content: string) => {
    if (!selectedPage) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/wiki/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPage.id,
          title: selectedPage.title,
          content,
          changeNote: 'Обновление структурированного контента'
        })
      });

      if (!response.ok) throw new Error('Ошибка сохранения');
      
      const updatedPage = await response.json();
      setSelectedPage(updatedPage);
    } catch (error) {
      console.error('Error saving structured content:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageSelect = (page: WikiPage) => {
    setSelectedPage(page);
    setIsEditing(false);
    setShowHistory(false);
    // Обновить URL
    window.history.pushState({}, '', `/wiki?slug=${page.slug}`);
  };

  const handlePageCreate = (page: WikiPage) => {
    setSelectedPage(page);
    setIsEditing(true);
  };

  const handlePageDelete = (pageId: string) => {
    if (selectedPage?.id === pageId) {
      setSelectedPage(null);
      setIsEditing(false);
    }
  };

  const handleRestore = async (version: number) => {
    await loadPageBySlug(selectedPage?.slug || '');
    setIsEditing(false);
  };

  // Простой markdown рендерер
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-gray-400 italic">Содержимое отсутствует</p>;
    
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join(' ');
        elements.push(
          <p key={`p-${elements.length}`} className="mb-4">
            {renderInline(paraText)}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h1 key={`h1-${idx}`} className="text-3xl font-bold mb-4 mt-6">
            {trimmed.substring(2)}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h2 key={`h2-${idx}`} className="text-2xl font-bold mb-3 mt-5">
            {trimmed.substring(3)}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h3 key={`h3-${idx}`} className="text-xl font-bold mb-2 mt-4">
            {trimmed.substring(4)}
          </h3>
        );
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h4 key={`h4-${idx}`} className="text-lg font-bold mb-2 mt-3">
            {trimmed.substring(5)}
          </h4>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph();
        listItems.push(trimmed.substring(2));
      } else if (trimmed === '') {
        flushParagraph();
        flushList();
      } else {
        flushList();
        currentParagraph.push(trimmed);
      }
    });

    flushParagraph();
    flushList();

    return <div>{elements}</div>;
  };

  const renderInline = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let key = 0;

    // Обработка ссылок [текст](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={`link-${key++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // Обработка изображений ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    lastIndex = 0;
    const newParts: (string | JSX.Element)[] = [];
    parts.forEach((part) => {
      if (typeof part === 'string') {
        let imgLastIndex = 0;
        let imgMatch;
        while ((imgMatch = imageRegex.exec(part)) !== null) {
          if (imgMatch.index > imgLastIndex) {
            newParts.push(part.substring(imgLastIndex, imgMatch.index));
          }
          newParts.push(
            <img
              key={`img-${key++}`}
              src={imgMatch[2]}
              alt={imgMatch[1]}
              className="max-w-full h-auto my-4 rounded"
            />
          );
          imgLastIndex = imgMatch.index + imgMatch[0].length;
        }
        if (imgLastIndex < part.length) {
          newParts.push(part.substring(imgLastIndex));
        }
      } else {
        newParts.push(part);
      }
    });

    // Обработка жирного текста **текст**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    lastIndex = 0;
    const finalParts: (string | JSX.Element)[] = [];
    newParts.forEach((part) => {
      if (typeof part === 'string') {
        let boldLastIndex = 0;
        let boldMatch;
        while ((boldMatch = boldRegex.exec(part)) !== null) {
          if (boldMatch.index > boldLastIndex) {
            finalParts.push(part.substring(boldLastIndex, boldMatch.index));
          }
          finalParts.push(
            <strong key={`bold-${key++}`}>{boldMatch[1]}</strong>
          );
          boldLastIndex = boldMatch.index + boldMatch[0].length;
        }
        if (boldLastIndex < part.length) {
          finalParts.push(part.substring(boldLastIndex));
        }
      } else {
        finalParts.push(part);
      }
    });

    return finalParts.length > 0 ? finalParts : [text];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  На главную
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Инструкция логиста
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={editModeEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setEditModeEnabled(!editModeEnabled);
                  if (!editModeEnabled) {
                    // При выключении режима редактирования выходим из всех режимов редактирования
                    setIsEditing(false);
                    setIsStructuredEditing(false);
                  }
                }}
                title={editModeEnabled ? "Выключить режим редактирования" : "Включить режим редактирования"}
              >
                {editModeEnabled ? (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Редактирование включено
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Редактирование выключено
                  </>
                )}
              </Button>
              {selectedPage && editModeEnabled && (
                <div className="flex gap-2">
                {!isStructuredEditing ? (
                  <>
                    <Button
                      variant="default"
                      onClick={() => {
                        setIsStructuredEditing(true);
                        setIsEditing(false);
                        setShowHistory(false);
                      }}
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Войти в структурный режим
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(!isEditing);
                        setIsStructuredEditing(false);
                        setShowHistory(false);
                      }}
                    >
                      {isEditing ? (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Просмотр
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Markdown
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    onClick={async () => {
                      // Вызываем сохранение через ref
                      if (wikiEditorRef.current) {
                        await wikiEditorRef.current.save();
                      }
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHistory(!showHistory);
                    setIsEditing(false);
                    setIsStructuredEditing(false);
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  История
                </Button>
                </div>
              )}
              {selectedPage && !editModeEnabled && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHistory(!showHistory);
                    setIsEditing(false);
                    setIsStructuredEditing(false);
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  История
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Page Manager */}
          <div className="lg:col-span-1">
            <PageManager
              onPageSelect={handlePageSelect}
              onPageCreate={handlePageCreate}
              onPageDelete={handlePageDelete}
              selectedPageId={selectedPage?.id}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isEditing && selectedPage ? (
              <WikiEditor
                pageId={selectedPage.id}
                initialTitle={selectedPage.title}
                initialContent={selectedPage.content}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : isStructuredEditing && selectedPage ? (
              <WikiContentEditor
                ref={wikiEditorRef}
                pageId={selectedPage.id}
                initialContent={selectedPage.content}
                onSave={handleStructuredSave}
                isSaving={isSaving}
                onSaveComplete={() => setIsStructuredEditing(false)}
              />
            ) : showHistory && selectedPage ? (
              <VersionHistory
                pageId={selectedPage.id}
                onRestore={handleRestore}
              />
            ) : selectedPage ? (
              <div className="bg-white rounded-lg shadow p-8">
                <h1 className="text-3xl font-bold mb-6">{selectedPage.title}</h1>
                <div className="prose prose-lg max-w-none">
                  {(() => {
                    // Попробовать отобразить как структурированный контент
                    try {
                      const parsed = JSON.parse(selectedPage.content);
                      if (parsed.sections && Array.isArray(parsed.sections)) {
                        // Это структурированный контент - отобразить его
                        return (
                          <div className="space-y-6">
                            {parsed.sections.map((section: any, index: number) => (
                              <div key={section.id || index} className="border-b pb-6 last:border-b-0">
                                <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                                {section.content && (
                                  <div className="mb-4 whitespace-pre-wrap text-gray-700">
                                    {section.content}
                                  </div>
                                )}
                                {section.columns && section.columns.length > 0 && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                    {section.columns.map((column: any) => (
                                      <div key={column.id} className="border rounded p-4">
                                        {column.title && (
                                          <h3 className="font-semibold mb-2">{column.title}</h3>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{column.content}</p>
                                        {column.contacts && column.contacts.length > 0 && (
                                          <div className="mt-4 pt-4 border-t">
                                            <h4 className="font-semibold text-sm mb-2">Контакты:</h4>
                                            {column.contacts.map((contact: any) => (
                                              <div key={contact.id} className="text-sm mb-2">
                                                <p className="font-medium">{contact.name}</p>
                                                {contact.position && <p className="text-gray-600">{contact.position}</p>}
                                                {contact.phone && <p>📞 {contact.phone}</p>}
                                                {contact.email && <p>✉️ {contact.email}</p>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {section.contacts && section.contacts.length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h3 className="font-semibold mb-3">Контакты:</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {section.contacts.map((contact: any) => (
                                        <div key={contact.id} className="border rounded p-4">
                                          <p className="font-semibold">{contact.name}</p>
                                          {contact.position && <p className="text-sm text-gray-600">{contact.position}</p>}
                                          {contact.phone && <p className="text-sm">📞 {contact.phone}</p>}
                                          {contact.email && <p className="text-sm">✉️ {contact.email}</p>}
                                          {contact.notes && <p className="text-sm text-gray-500 italic mt-2">{contact.notes}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }
                    } catch {
                      // Не структурированный контент - отобразить как markdown
                    }
                    return renderMarkdown(selectedPage.content);
                  })()}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Выберите страницу для просмотра или создайте новую
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
