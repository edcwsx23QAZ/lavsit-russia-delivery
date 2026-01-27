'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface WikiVersion {
  id: string;
  version: number;
  content: string;
  title: string;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface VersionHistoryProps {
  pageId: string;
  onRestore?: (version: number) => Promise<void>;
}

export default function VersionHistory({ pageId, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<WikiVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    loadVersions();
  }, [pageId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wiki/versions?pageId=${pageId}`);
      if (!response.ok) throw new Error('Ошибка загрузки версий');
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
      alert('Ошибка при загрузке истории версий');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (!confirm(`Вы уверены, что хотите откатить страницу к версии ${version}?`)) {
      return;
    }

    try {
      setRestoring(version);
      const response = await fetch('/api/wiki/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          version,
          changeNote: `Откат к версии ${version}`
        })
      });

      if (!response.ok) throw new Error('Ошибка отката');
      
      await loadVersions();
      if (onRestore) {
        await onRestore(version);
      }
      alert('Страница успешно откачена к выбранной версии');
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Ошибка при откате версии');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка истории версий...</div>;
  }

  if (versions.length === 0) {
    return <div className="text-center py-8 text-gray-500">История версий пуста</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          История версий ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-600">Версия {version.version}</span>
                  {version.version === versions[0].version && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Текущая
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestore(version.version)}
                  disabled={restoring === version.version || version.version === versions[0].version}
                >
                  {restoring === version.version ? (
                    'Откат...'
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Откатить
                    </>
                  )}
                </Button>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(version.createdAt), 'dd MMMM yyyy, HH:mm')}
                  </span>
                </div>
                
                {version.createdBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Пользователь: {version.createdBy}</span>
                  </div>
                )}
                
                {version.changeNote && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-gray-700">
                    <strong>Примечание:</strong> {version.changeNote}
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  Заголовок: {version.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

