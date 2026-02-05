'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Save, Eye, Edit, Link as LinkIcon, Image as ImageIcon, Type } from 'lucide-react';
import { toast } from 'sonner';
import LinkEditor from './LinkEditor';
// Простой markdown рендерер без внешних зависимостей
const MarkdownPreview = ({ content }: { content: string }) => {
  // Простая функция для рендеринга markdown
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-gray-400 italic">Содержимое отсутствует</p>;
    
    // Разбить на строки
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let inList = false;

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
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Заголовки
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h1 key={`h1-${idx}`} className="text-3xl font-bold mb-4 mt-6">
            {renderInline(trimmed.substring(2))}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h2 key={`h2-${idx}`} className="text-2xl font-bold mb-3 mt-5">
            {renderInline(trimmed.substring(3))}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h3 key={`h3-${idx}`} className="text-xl font-bold mb-2 mt-4">
            {renderInline(trimmed.substring(4))}
          </h3>
        );
      } else if (trimmed.startsWith('#### ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h4 key={`h4-${idx}`} className="text-lg font-bold mb-2 mt-3">
            {renderInline(trimmed.substring(5))}
          </h4>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph();
        if (!inList) inList = true;
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

  const renderInline = (text: string) => {
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
      const url = match[2];
      const isInternal = url.startsWith('/wiki') || url.startsWith('wiki');
      parts.push(
        <a
          key={`link-${key++}`}
          href={url}
          target={isInternal ? undefined : '_blank'}
          rel={isInternal ? undefined : 'noopener noreferrer'}
          className="text-blue-600 hover:underline"
          onClick={isInternal ? (e) => {
            e.preventDefault();
            const slug = url.includes('slug=') ? url.split('slug=')[1] : url.replace('/wiki?', '').replace('wiki/', '');
            window.location.href = `/wiki?slug=${slug}`;
          } : undefined}
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

    // Обработка курсива *текст*
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
    lastIndex = 0;
    const italicParts: (string | JSX.Element)[] = [];
    finalParts.forEach((part) => {
      if (typeof part === 'string') {
        let italicLastIndex = 0;
        let italicMatch;
        while ((italicMatch = italicRegex.exec(part)) !== null) {
          if (italicMatch.index > italicLastIndex) {
            italicParts.push(part.substring(italicLastIndex, italicMatch.index));
          }
          italicParts.push(
            <em key={`italic-${key++}`}>{italicMatch[1]}</em>
          );
          italicLastIndex = italicMatch.index + italicMatch[0].length;
        }
        if (italicLastIndex < part.length) {
          italicParts.push(part.substring(italicLastIndex));
        }
      } else {
        italicParts.push(part);
      }
    });

    return <>{italicParts.length > 0 ? italicParts : text}</>;
  };

  return (
    <div className="prose prose-sm max-w-none">
      {renderMarkdown(content)}
    </div>
  );
};

interface WikiEditorProps {
  pageId?: string;
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string, changeNote?: string) => Promise<void>;
  onCancel?: () => void;
  isNewPage?: boolean;
  pages?: Array<{ id: string; title: string; slug: string }>;
}

export default function WikiEditor({
  pageId,
  initialTitle = '',
  initialContent = '',
  onSave,
  onCancel,
  isNewPage = false,
  pages = []
}: WikiEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [changeNote, setChangeNote] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Восстановить состояние при изменении пропсов
  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent]);

  // Обработка вставки текста в позицию курсора
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Восстановить фокус и позицию курсора
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Обработка загрузки изображения
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/wiki/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка загрузки');
      }

      const data = await response.json();
      const imageMarkdown = `![${file.name}](${data.url})`;
      insertText(imageMarkdown);
      toast.success('Изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  // Обработка drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      imageFiles.forEach(file => handleImageUpload(file));
    }
  };

  // Обработка выбора файла
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
    // Сбросить input для возможности повторной загрузки того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Обработка сохранения
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Пожалуйста, введите заголовок');
      return;
    }

    if (!content.trim()) {
      toast.error('Пожалуйста, введите содержимое');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(title.trim(), content.trim(), changeNote.trim() || undefined);
      setChangeNote('');
      toast.success('Страница успешно сохранена');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isNewPage ? 'Создание новой страницы' : 'Редактирование страницы'}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
            >
              {viewMode === 'edit' ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              {viewMode === 'edit' ? 'Предпросмотр' : 'Редактировать'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Заголовок */}
          <div>
            <Label htmlFor="title">Заголовок страницы</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок..."
              className="mt-1"
            />
          </div>

          {/* Редактор/Предпросмотр */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'edit' | 'preview')}>
            <TabsList>
              <TabsTrigger value="edit">Редактирование</TabsTrigger>
              <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Панель инструментов */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertText('# ', '')}
                    title="Заголовок 1"
                  >
                    <Type className="w-4 h-4 mr-1" />H1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertText('## ', '')}
                    title="Заголовок 2"
                  >
                    <Type className="w-4 h-4 mr-1" />H2
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertText('### ', '')}
                    title="Заголовок 3"
                  >
                    <Type className="w-4 h-4 mr-1" />H3
                  </Button>
                  <LinkEditor
                    onInsert={(text, url, isInternal) => {
                      const markdownLink = `[${text}](${url})`;
                      insertText(markdownLink);
                    }}
                    pages={pages}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Вставить изображение"
                  >
                    <ImageIcon className="w-4 h-4 mr-1" />Изображение
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertText('**', '**')}
                    title="Жирный текст"
                  >
                    <strong>B</strong>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertText('*', '*')}
                    title="Курсив"
                  >
                    <em>I</em>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertText('`', '`')}
                    title="Код"
                  >
                    {'</>'}
                  </Button>
                </div>

                {/* Текстовая область */}
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Введите содержимое страницы в формате Markdown...&#10;&#10;Вы можете перетащить изображения сюда для загрузки."
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Перетащите изображения в эту область или используйте кнопку "Изображение" для загрузки
                </p>
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg p-6 min-h-[400px]">
                <MarkdownPreview content={content} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Примечание об изменении */}
          <div>
            <Label htmlFor="changeNote">Примечание об изменении (необязательно)</Label>
            <Input
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Опишите, что было изменено..."
              className="mt-1"
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Отмена
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Сохранение...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

