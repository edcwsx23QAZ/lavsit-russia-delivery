'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Save, X, Plus, FolderOpen, GripVertical } from 'lucide-react';
import { WikiSection, WikiColumn, WikiContact, generateId } from './types';
import EditableColumn from './EditableColumn';
import EditableContact from './EditableContact';

interface EditableSectionProps {
  section: WikiSection;
  onUpdate: (section: WikiSection) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
}

export default function EditableSection({
  section,
  onUpdate,
  onDelete,
  isEditing: initialEditing = false
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editedSection, setEditedSection] = useState<WikiSection>(section);

  const handleSave = () => {
    onUpdate(editedSection);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSection(section);
    setIsEditing(false);
  };

  const handleAddColumn = () => {
    const newColumn: WikiColumn = {
      id: generateId(),
      title: '',
      content: 'Новый столбец',
      contacts: []
    };
    setEditedSection({
      ...editedSection,
      columns: [...(editedSection.columns || []), newColumn]
    });
  };

  const handleUpdateColumn = (column: WikiColumn) => {
    setEditedSection({
      ...editedSection,
      columns: (editedSection.columns || []).map((c) =>
        c.id === column.id ? column : c
      )
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    setEditedSection({
      ...editedSection,
      columns: (editedSection.columns || []).filter((c) => c.id !== columnId)
    });
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
    setEditedSection({
      ...editedSection,
      contacts: [...(editedSection.contacts || []), newContact]
    });
  };

  const handleUpdateContact = (contact: WikiContact) => {
    setEditedSection({
      ...editedSection,
      contacts: (editedSection.contacts || []).map((c) =>
        c.id === contact.id ? contact : c
      )
    });
  };

  const handleDeleteContact = (contactId: string) => {
    setEditedSection({
      ...editedSection,
      contacts: (editedSection.contacts || []).filter((c) => c.id !== contactId)
    });
  };

  if (isEditing) {
    return (
      <Card className="mb-6 border-2 border-blue-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Редактирование раздела
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
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor={`section-title-${section.id}`}>Заголовок раздела</Label>
            <Input
              id={`section-title-${section.id}`}
              value={editedSection.title}
              onChange={(e) =>
                setEditedSection({ ...editedSection, title: e.target.value })
              }
              placeholder="Заголовок раздела"
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <Label htmlFor={`section-content-${section.id}`}>Содержимое раздела</Label>
            <Textarea
              id={`section-content-${section.id}`}
              value={editedSection.content || ''}
              onChange={(e) =>
                setEditedSection({ ...editedSection, content: e.target.value })
              }
              placeholder="Содержимое раздела (необязательно)"
              rows={4}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Столбцы</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить столбец
              </Button>
            </div>
            {editedSection.columns && editedSection.columns.length > 0 ? (
              <div className="space-y-4">
                {editedSection.columns.map((column) => (
                  <EditableColumn
                    key={column.id}
                    column={column}
                    onUpdate={handleUpdateColumn}
                    onDelete={handleDeleteColumn}
                    isEditing={true}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Столбцы отсутствуют. Нажмите "Добавить столбец" для добавления.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Контакты раздела</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddContact}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить контакт
              </Button>
            </div>
            {editedSection.contacts && editedSection.contacts.length > 0 ? (
              <div className="space-y-2">
                {editedSection.contacts.map((contact) => (
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
  const handleViewModeUpdateColumn = (column: WikiColumn) => {
    const updatedSection = {
      ...section,
      columns: (section.columns || []).map((c) =>
        c.id === column.id ? column : c
      )
    };
    onUpdate(updatedSection);
  };

  const handleViewModeDeleteColumn = (columnId: string) => {
    const updatedSection = {
      ...section,
      columns: (section.columns || []).filter((c) => c.id !== columnId)
    };
    onUpdate(updatedSection);
  };

  const handleViewModeUpdateContact = (contact: WikiContact) => {
    const updatedSection = {
      ...section,
      contacts: (section.contacts || []).map((c) =>
        c.id === contact.id ? contact : c
      )
    };
    onUpdate(updatedSection);
  };

  const handleViewModeDeleteContact = (contactId: string) => {
    const updatedSection = {
      ...section,
      contacts: (section.contacts || []).filter((c) => c.id !== contactId)
    };
    onUpdate(updatedSection);
  };

  return (
    <Card className="mb-6 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <GripVertical className="w-5 h-5 text-gray-400" />
            <FolderOpen className="w-5 h-5" />
            {section.title}
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
              onClick={() => onDelete(section.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {section.content && (
          <div className="prose max-w-none mb-6">
            <p className="whitespace-pre-wrap text-gray-700">{section.content}</p>
          </div>
        )}

        {section.columns && section.columns.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.columns.map((column) => (
                <EditableColumn
                  key={column.id}
                  column={column}
                  onUpdate={handleViewModeUpdateColumn}
                  onDelete={handleViewModeDeleteColumn}
                />
              ))}
            </div>
          </div>
        )}

        {section.contacts && section.contacts.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h5 className="font-semibold text-lg mb-4">Контакты:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.contacts.map((contact) => (
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

