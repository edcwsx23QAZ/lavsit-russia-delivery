'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableBlockProps {
  content: string;
  onSave: (content: string) => void;
  className?: string;
  placeholder?: string;
  renderContent?: (content: string) => React.ReactNode;
}

export default function EditableBlock({
  content,
  onSave,
  className,
  placeholder = 'Нажмите для редактирования...',
  renderContent
}: EditableBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = () => {
    onSave(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn('relative group border-2 border-blue-300 rounded-lg p-4', className)}>
        <div className="flex justify-end gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </div>
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px]"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className={cn('relative group', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={() => setIsEditing(true)}
        title="Редактировать блок"
      >
        <Edit className="w-4 h-4" />
      </Button>
      <div className="prose max-w-none">
        {renderContent ? renderContent(content) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
      </div>
    </div>
  );
}

