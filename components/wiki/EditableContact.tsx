'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2, Save, X, User } from 'lucide-react';
import { WikiContact } from './types';

interface EditableContactProps {
  contact: WikiContact;
  onUpdate: (contact: WikiContact) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
}

export default function EditableContact({
  contact,
  onUpdate,
  onDelete,
  isEditing: initialEditing = false
}: EditableContactProps) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editedContact, setEditedContact] = useState<WikiContact>(contact);

  const handleSave = () => {
    onUpdate(editedContact);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContact(contact);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor={`name-${contact.id}`}>Имя</Label>
              <Input
                id={`name-${contact.id}`}
                value={editedContact.name}
                onChange={(e) =>
                  setEditedContact({ ...editedContact, name: e.target.value })
                }
                placeholder="Имя контакта"
              />
            </div>
            <div>
              <Label htmlFor={`phone-${contact.id}`}>Телефон</Label>
              <Input
                id={`phone-${contact.id}`}
                value={editedContact.phone || ''}
                onChange={(e) =>
                  setEditedContact({ ...editedContact, phone: e.target.value })
                }
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <Label htmlFor={`email-${contact.id}`}>Email</Label>
              <Input
                id={`email-${contact.id}`}
                type="email"
                value={editedContact.email || ''}
                onChange={(e) =>
                  setEditedContact({ ...editedContact, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor={`position-${contact.id}`}>Должность</Label>
              <Input
                id={`position-${contact.id}`}
                value={editedContact.position || ''}
                onChange={(e) =>
                  setEditedContact({ ...editedContact, position: e.target.value })
                }
                placeholder="Должность"
              />
            </div>
            <div>
              <Label htmlFor={`notes-${contact.id}`}>Примечания</Label>
              <Textarea
                id={`notes-${contact.id}`}
                value={editedContact.notes || ''}
                onChange={(e) =>
                  setEditedContact({ ...editedContact, notes: e.target.value })
                }
                placeholder="Дополнительная информация"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 hover:bg-gray-50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-gray-500" />
              <h4 className="font-semibold text-lg">{contact.name}</h4>
            </div>
            {contact.position && (
              <p className="text-sm text-gray-600 mb-2">{contact.position}</p>
            )}
            <div className="space-y-1 text-sm">
              {contact.phone && (
                <p className="text-gray-700">
                  <span className="font-medium">Телефон:</span> {contact.phone}
                </p>
              )}
              {contact.email && (
                <p className="text-gray-700">
                  <span className="font-medium">Email:</span>{' '}
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.notes && (
                <p className="text-gray-600 mt-2 italic">{contact.notes}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
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
              onClick={() => onDelete(contact.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

