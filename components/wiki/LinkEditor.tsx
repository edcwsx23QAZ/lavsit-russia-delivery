'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link as LinkIcon, ExternalLink, FileText } from 'lucide-react';

interface LinkEditorProps {
  onInsert: (text: string, url: string, isInternal: boolean) => void;
  pages?: Array<{ id: string; title: string; slug: string }>;
}

export default function LinkEditor({ onInsert, pages = [] }: LinkEditorProps) {
  const [open, setOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>('');

  const handleInsert = () => {
    if (!linkText.trim()) {
      return;
    }

    let url = linkUrl;
    if (isInternal && selectedPageId) {
      const selectedPage = pages.find(p => p.id === selectedPageId);
      if (selectedPage) {
        url = `/wiki?slug=${selectedPage.slug}`;
      }
    }

    if (!url.trim()) {
      return;
    }

    const markdownLink = isInternal 
      ? `[${linkText}](${url})`
      : `[${linkText}](${url})`;
    
    onInsert(linkText, url, isInternal);
    setOpen(false);
    setLinkText('');
    setLinkUrl('');
    setSelectedPageId('');
    setIsInternal(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <LinkIcon className="w-4 h-4 mr-2" />
          Ссылка
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить ссылку</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="link-text">Текст ссылки</Label>
            <Input
              id="link-text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Текст ссылки"
            />
          </div>
          <div>
            <Label>Тип ссылки</Label>
            <div className="flex gap-4 mt-2">
              <Button
                type="button"
                variant={isInternal ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsInternal(true);
                  setLinkUrl('');
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Внутренняя
              </Button>
              <Button
                type="button"
                variant={!isInternal ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsInternal(false);
                  setSelectedPageId('');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Внешняя
              </Button>
            </div>
          </div>
          {isInternal ? (
            <div>
              <Label htmlFor="internal-page">Выберите страницу</Label>
              <select
                id="internal-page"
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Выберите страницу...</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleInsert} disabled={!linkText.trim() || (isInternal ? !selectedPageId : !linkUrl.trim())}>
              Вставить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


