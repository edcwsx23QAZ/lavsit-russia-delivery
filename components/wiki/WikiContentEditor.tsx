'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Save, Eye, Edit as EditIcon, Loader2 } from 'lucide-react';
import { WikiSection, WikiStructuredContent, generateId } from './types';
import EditableSection from './EditableSection';

interface WikiContentEditorProps {
  pageId: string;
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
  isSaving?: boolean;
  onSaveComplete?: () => void; // Callback после успешного сохранения
}

export interface WikiContentEditorRef {
  save: () => Promise<void>;
}

const WikiContentEditor = forwardRef<WikiContentEditorRef, WikiContentEditorProps>(({
  pageId,
  initialContent,
  onSave,
  isSaving = false,
  onSaveComplete
}, ref) => {
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузить структурированный контент из markdown или JSON
  useEffect(() => {
    if (initialContent) {
      try {
        // Попробовать распарсить как JSON (структурированный контент)
        const parsed = JSON.parse(initialContent);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          setSections(parsed.sections);
        } else {
          // Если это не структурированный контент, создать дефолтный раздел
          setSections([
            {
              id: generateId(),
              title: 'Новый раздел',
              content: initialContent,
              order: 0
            }
          ]);
        }
      } catch {
        // Если не JSON, создать раздел из markdown контента
        setSections([
          {
            id: generateId(),
            title: 'Содержимое',
            content: initialContent,
            order: 0
          }
        ]);
      }
    } else {
      // Если контента нет, создать пустой раздел
      setSections([
        {
          id: generateId(),
          title: 'Новый раздел',
          content: '',
          order: 0
        }
      ]);
    }
  }, [initialContent]);

  const handleAddSection = () => {
    const newSection: WikiSection = {
      id: generateId(),
      title: 'Новый раздел',
      content: '',
      order: sections.length
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (section: WikiSection) => {
    setSections(
      sections.map((s) => (s.id === section.id ? section : s))
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sections.length === 1) {
      alert('Нельзя удалить последний раздел. Добавьте новый раздел перед удалением.');
      return;
    }
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const structuredContent: WikiStructuredContent = {
        sections: sections.map((s, index) => ({
          ...s,
          order: index
        }))
      };
      const contentString = JSON.stringify(structuredContent, null, 2);
      await onSave(contentString);
      setIsEditing(false);
      // Вызвать callback после успешного сохранения
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  // Автоматически включаем режим редактирования при монтировании
  useEffect(() => {
    setIsEditing(true);
  }, []);

  // Предоставляем метод save для внешнего вызова
  useImperativeHandle(ref, () => ({
    save: handleSave
  }));

  return (
    <div className="w-full" data-wiki-editor>
      {isEditing && (
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={handleAddSection}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить раздел
          </Button>
        </div>
      )}

      {sections.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <p>Нет разделов. Нажмите "Добавить раздел" для создания.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <EditableSection
              key={section.id}
              section={section}
              onUpdate={handleUpdateSection}
              onDelete={handleDeleteSection}
              isEditing={isEditing}
            />
          ))}
        </div>
      )}
    </div>
  );
});

WikiContentEditor.displayName = 'WikiContentEditor';

export default WikiContentEditor;

