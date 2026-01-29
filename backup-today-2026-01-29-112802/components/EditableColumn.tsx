'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Save, X, Plus, Columns } from 'lucide-react';
import { WikiColumn, WikiContact, generateId } from './types';
import EditableContact from './EditableContact';

interface EditableColumnProps {
  column: WikiColumn;
  onUpdate: (column: WikiColumn) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
}

export default function EditableColumn({
  column,
  onUpdate,
  onDelete,
  isEditing: initialEditing = false
}: EditableColumnProps) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editedColumn, setEditedColumn] = useState<WikiColumn>(column);

  const handleSave = () => {
    onUpdate(editedColumn);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedColumn(column);
    setIsEditing(false);
  };

  const handleAddContact = () => {
    const newContact: WikiContact = {
      id: generateId(),
      name: 'Новый контакт',
      phone: '',
      email: '',
      position: '',
      notes: ''
    };
    setEditedColumn({
      ...editedColumn,
      contacts: [...(editedColumn.contacts || []), newContact]
    });
  };

  const handleUpdateContact = (contact: WikiContact) => {
    setEditedColumn({
      ...editedColumn,
      contacts: (editedColumn.contacts || []).map((c) =>
        c.id === contact.id ? contact : c
      )
    });
  };

  const handleDeleteContact = (contactId: string) => {
    setEditedColumn({
      ...editedColumn,
      contacts: (editedColumn.contacts || []).filter((c) => c.id !== contactId)
    });
  };

  if (isEditing) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Columns className="w-5 h-5" />
              Редактирование столбца
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={`column-title-${column.id}`}>Заголовок столбца</Label>
            <Input
              id={`column-title-${column.id}`}
              value={editedColumn.title || ''}
              onChange={(e) =>
                setEditedColumn({ ...editedColumn, title: e.target.value })
              }
              placeholder="Заголовок столбца (необязательно)"
            />
          </div>
          <div>
            <Label htmlFor={`column-content-${column.id}`}>Содержимое</Label>
            <Textarea
              id={`column-content-${column.id}`}
              value={editedColumn.content}
              onChange={(e) =>
                setEditedColumn({ ...editedColumn, content: e.target.value })
              }
              placeholder="Содержимое столбца"
              rows={6}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Контакты</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddContact}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить контакт
              </Button>
            </div>
            {editedColumn.contacts && editedColumn.contacts.length > 0 ? (
              <div className="space-y-2">
                {editedColumn.contacts.map((contact) => (
                  <EditableContact
                    key={contact.id}
                    contact={contact}
                    onUpdate={handleUpdateContact}
                    onDelete={handleDeleteContact}
                    isEditing={true}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Контакты отсутствуют. Нажмите "Добавить контакт" для добавления.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Обработчики для режима просмотра - обновляют через родителя
  const handleViewModeUpdateContact = (contact: WikiContact) => {
    const updatedColumn = {
      ...column,
      contacts: (column.contacts || []).map((c) =>
        c.id === contact.id ? contact : c
      )
    };
    onUpdate(updatedColumn);
  };

  const handleViewModeDeleteContact = (contactId: string) => {
    const updatedColumn = {
      ...column,
      contacts: (column.contacts || []).filter((c) => c.id !== contactId)
    };
    onUpdate(updatedColumn);
  };

  return (
    <Card className="mb-4 hover:bg-gray-50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Columns className="w-5 h-5" />
            {column.title || 'Столбец без заголовка'}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(column.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none mb-4">
          <p className="whitespace-pre-wrap">{column.content}</p>
        </div>
        {column.contacts && column.contacts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h5 className="font-semibold mb-3">Контакты:</h5>
            <div className="space-y-2">
              {column.contacts.map((contact) => (
                <EditableContact
                  key={contact.id}
                  contact={contact}
                  onUpdate={handleViewModeUpdateContact}
                  onDelete={handleViewModeDeleteContact}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

