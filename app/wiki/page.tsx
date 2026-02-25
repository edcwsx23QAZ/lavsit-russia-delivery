'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  History,
  Lock,
  Unlock,
  Loader2,
  RotateCcw,
  Eye,
  Code,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';

interface Version {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
  createdBy: string | null;
}

export default function WikiPage() {
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  // Inject <base> tag so relative URLs (e.g., /vozvrat.png) resolve in srcdoc iframe
  const injectBaseTag = (html: string): string => {
    if (typeof window === 'undefined') return html;
    const baseUrl = window.location.origin;
    const baseTag = `<base href="${baseUrl}/" />`;
    // Insert base tag after <head> or at the start
    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>\n    ${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      return html.replace('<HEAD>', `<HEAD>\n    ${baseTag}`);
    }
    return baseTag + '\n' + html;
  };

  // Load the instruction HTML
  useEffect(() => {
    loadInstruction();
  }, []);

  const loadInstruction = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wiki/instruction?format=json');
      if (response.ok) {
        const data = await response.json();
        setHtmlContent(injectBaseTag(data.content));
        if (data.updatedAt) {
          setLastSaved(new Date(data.updatedAt).toLocaleString('ru-RU'));
        }
      } else {
        // Fallback: load from static file
        const htmlResponse = await fetch('/instruction.html');
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          setHtmlContent(injectBaseTag(html));
        }
      }
    } catch (error) {
      console.error('Error loading instruction:', error);
      // Try static fallback
      try {
        const htmlResponse = await fetch('/instruction.html');
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          setHtmlContent(injectBaseTag(html));
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const response = await fetch('/api/wiki/instruction/versions');
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Remove injected base tag before saving
  const stripBaseTag = (html: string): string => {
    return html.replace(/<base href="[^"]*"\s*\/?>\s*\n?\s*/gi, '');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const rawContent = showCodeEditor ? editedHtml : getIframeHtml();

      if (!rawContent) {
        alert('Нет содержимого для сохранения');
        return;
      }

      const contentToSave = stripBaseTag(rawContent);

      const response = await fetch('/api/wiki/instruction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToSave,
          changeNote: changeNote || 'Обновление инструкции',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка сохранения');
      }

      const result = await response.json();
      const htmlWithBase = injectBaseTag(contentToSave);
      setHtmlContent(htmlWithBase);
      setLastSaved(new Date().toLocaleString('ru-RU'));
      setChangeNote('');
      setEditMode(false);
      setShowCodeEditor(false);

      // Reload iframe
      if (iframeRef.current) {
        iframeRef.current.srcdoc = htmlWithBase;
      }

      alert(`✅ Сохранено! Версия ${result.version}`);
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('❌ Ошибка сохранения: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getIframeHtml = (): string => {
    try {
      if (iframeRef.current?.contentDocument) {
        return '<!DOCTYPE html>\n' + iframeRef.current.contentDocument.documentElement.outerHTML;
      }
    } catch {
      // CORS issue
    }
    return htmlContent;
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Восстановить эту версию? Текущие несохранённые изменения будут потеряны.')) {
      return;
    }

    try {
      setRestoringVersion(versionId);

      // Get version content
      const versionResponse = await fetch(`/api/wiki/instruction/versions?versionId=${versionId}`);
      if (!versionResponse.ok) throw new Error('Не удалось загрузить версию');

      const versionData = await versionResponse.json();

      // Restore
      const restoreResponse = await fetch('/api/wiki/instruction/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });

      if (!restoreResponse.ok) throw new Error('Не удалось восстановить версию');

      const restoredHtml = injectBaseTag(versionData.content);
      setHtmlContent(restoredHtml);
      setLastSaved(new Date().toLocaleString('ru-RU'));
      setShowHistory(false);

      // Reload iframe
      if (iframeRef.current) {
        iframeRef.current.srcdoc = restoredHtml;
      }

      alert('✅ Версия восстановлена!');
      loadVersions();
    } catch (error: any) {
      console.error('Error restoring:', error);
      alert('❌ Ошибка: ' + error.message);
    } finally {
      setRestoringVersion(null);
    }
  };

  const enableEditModeInIframe = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    const doc = iframeRef.current.contentDocument;

    // Add edit overlay styles
    const style = doc.createElement('style');
    style.id = 'edit-overlay-style';
    style.textContent = `
      .section { position: relative; }
      .section::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border: 2px dashed transparent;
        pointer-events: none;
        transition: border-color 0.2s;
        border-radius: 8px;
      }
      .section:hover::after {
        border-color: #e94560;
      }
      .edit-section-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #e94560;
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(233,69,96,0.4);
        transition: transform 0.2s;
      }
      .edit-section-btn:hover {
        transform: scale(1.1);
      }
      .section:hover .edit-section-btn {
        display: flex;
      }
      .section.editing {
        outline: 3px solid #e94560;
        outline-offset: 4px;
        border-radius: 8px;
      }
      .section.editing [contenteditable="true"] {
        background: rgba(233,69,96,0.05);
        min-height: 20px;
        padding: 4px;
        border-radius: 4px;
        outline: none;
      }
      .section.editing [contenteditable="true"]:focus {
        background: rgba(233,69,96,0.1);
        box-shadow: 0 0 0 2px rgba(233,69,96,0.3);
      }
      .edit-toolbar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        background: #1a1a2e;
        color: white;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: 'Segoe UI', sans-serif;
      }
      .edit-toolbar button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.2s;
      }
      .edit-toolbar .save-btn {
        background: #00b894;
        color: white;
      }
      .edit-toolbar .save-btn:hover {
        background: #00a880;
      }
      .edit-toolbar .cancel-btn {
        background: rgba(255,255,255,0.2);
        color: white;
      }
      .edit-toolbar .cancel-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      .edit-toolbar span {
        flex: 1;
        font-size: 14px;
        opacity: 0.9;
      }
      .add-section-btn {
        display: block;
        width: calc(100% - 40px);
        margin: 16px 20px;
        padding: 16px;
        background: rgba(233,69,96,0.1);
        border: 2px dashed #e94560;
        border-radius: 8px;
        color: #e94560;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .add-section-btn:hover {
        background: rgba(233,69,96,0.2);
      }
      .delete-section-btn {
        position: absolute;
        top: 8px;
        right: 52px;
        background: #d63031;
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(214,48,49,0.4);
      }
      .section:hover .delete-section-btn {
        display: flex;
      }
    `;
    doc.head.appendChild(style);

    // Add edit buttons to each section
    const sections = doc.querySelectorAll('.section');
    sections.forEach((section: any) => {
      section.style.position = 'relative';

      // Edit button
      const editBtn = doc.createElement('button');
      editBtn.className = 'edit-section-btn';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Редактировать секцию';
      editBtn.addEventListener('click', () => {
        toggleSectionEdit(section, doc);
      });
      section.appendChild(editBtn);

      // Delete button
      const deleteBtn = doc.createElement('button');
      deleteBtn.className = 'delete-section-btn';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Удалить секцию';
      deleteBtn.addEventListener('click', () => {
        if (confirm('Удалить этот раздел?')) {
          section.remove();
        }
      });
      section.appendChild(deleteBtn);
    });

    // Add toolbar at the top
    const toolbar = doc.createElement('div');
    toolbar.className = 'edit-toolbar';
    toolbar.innerHTML = `
      <span>✏️ Режим редактирования — нажмите ✏️ на секции для редактирования</span>
      <input type="text" placeholder="Описание изменений..." 
        style="flex: 0 0 250px; padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: white; font-size: 13px;"
        id="changeNoteInput" />
      <button class="save-btn" id="saveBtn">💾 Сохранить</button>
      <button class="cancel-btn" id="cancelBtn">✕ Отмена</button>
    `;
    doc.body.insertBefore(toolbar, doc.body.firstChild);

    // Add "add section" button at the bottom
    const addBtn = doc.createElement('button');
    addBtn.className = 'add-section-btn';
    addBtn.textContent = '➕ Добавить новый раздел';
    addBtn.addEventListener('click', () => addNewSection(doc));
    const mainContent = doc.querySelector('.main-content') || doc.body;
    mainContent.appendChild(addBtn);

    // Event handlers for toolbar buttons
    doc.getElementById('saveBtn')?.addEventListener('click', () => {
      const noteInput = doc.getElementById('changeNoteInput') as HTMLInputElement;
      setChangeNote(noteInput?.value || '');
      // Remove editing artifacts before saving
      cleanupEditMode(doc);
      // Trigger save via parent
      window.postMessage({ type: 'SAVE_INSTRUCTION' }, '*');
    });

    doc.getElementById('cancelBtn')?.addEventListener('click', () => {
      window.postMessage({ type: 'CANCEL_EDIT' }, '*');
    });
  }, []);

  const toggleSectionEdit = (section: Element, doc: Document) => {
    const isEditing = section.classList.contains('editing');

    if (isEditing) {
      // Disable editing
      section.classList.remove('editing');
      section.querySelectorAll('[contenteditable]').forEach((el: any) => {
        el.removeAttribute('contenteditable');
      });
    } else {
      // Enable editing
      section.classList.add('editing');
      // Make text elements editable
      const editableElements = section.querySelectorAll('h2, h3, h4, p, li, td, th, span:not(.icon):not(.copy-btn)');
      editableElements.forEach((el: any) => {
        if (!el.closest('.edit-section-btn') && !el.closest('.delete-section-btn') && !el.closest('.edit-toolbar')) {
          el.setAttribute('contenteditable', 'true');
        }
      });
    }
  };

  const addNewSection = (doc: Document) => {
    const newSection = doc.createElement('div');
    const sectionId = 'sec-new-' + Date.now();
    newSection.className = 'section active';
    newSection.id = sectionId;
    newSection.style.position = 'relative';
    newSection.innerHTML = `
      <h2 contenteditable="true">Новый раздел</h2>
      <div class="card" contenteditable="true">
        <p>Нажмите здесь, чтобы добавить содержимое...</p>
      </div>
    `;

    // Add edit/delete buttons
    const editBtn = doc.createElement('button');
    editBtn.className = 'edit-section-btn';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => toggleSectionEdit(newSection, doc));
    newSection.appendChild(editBtn);

    const deleteBtn = doc.createElement('button');
    deleteBtn.className = 'delete-section-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.addEventListener('click', () => {
      if (confirm('Удалить этот раздел?')) newSection.remove();
    });
    newSection.appendChild(deleteBtn);

    // Insert before the "add" button
    const addBtn = doc.querySelector('.add-section-btn');
    if (addBtn) {
      addBtn.parentNode?.insertBefore(newSection, addBtn);
    } else {
      const mainContent = doc.querySelector('.main-content') || doc.body;
      mainContent.appendChild(newSection);
    }

    // Auto-enable editing
    newSection.classList.add('editing');
  };

  const cleanupEditMode = (doc: Document) => {
    // Remove edit buttons, toolbar, add button
    doc.querySelectorAll('.edit-section-btn, .delete-section-btn, .add-section-btn, .edit-toolbar').forEach(el => el.remove());
    doc.querySelectorAll('[contenteditable]').forEach((el: any) => {
      el.removeAttribute('contenteditable');
    });
    doc.querySelectorAll('.editing').forEach(el => el.classList.remove('editing'));
    doc.getElementById('edit-overlay-style')?.remove();
  };

  const disableEditModeInIframe = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    const doc = iframeRef.current.contentDocument;
    cleanupEditMode(doc);
  }, []);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SAVE_INSTRUCTION') {
        handleSave();
      } else if (event.data?.type === 'CANCEL_EDIT') {
        setEditMode(false);
        // Reload iframe to discard changes
        if (iframeRef.current) {
          iframeRef.current.srcdoc = htmlContent;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [htmlContent]);

  // Apply edit mode when toggled
  useEffect(() => {
    if (!htmlContent) return;

    const timer = setTimeout(() => {
      if (editMode && !showCodeEditor) {
        enableEditModeInIframe();
      } else {
        disableEditModeInIframe();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editMode, showCodeEditor, enableEditModeInIframe, disableEditModeInIframe]);

  const handleToggleEdit = () => {
    if (editMode) {
      // Exiting edit mode - discard changes
      setEditMode(false);
      setShowCodeEditor(false);
      // Reload original content
      if (iframeRef.current) {
        iframeRef.current.srcdoc = htmlContent;
      }
    } else {
      setEditMode(true);
    }
  };

  const handleOpenCodeEditor = () => {
    // Get current HTML from iframe
    const currentHtml = getIframeHtml();
    setEditedHtml(currentHtml);
    setShowCodeEditor(true);
  };

  const handleToggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      loadVersions();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Загрузка инструкции...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Главная
                </Button>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">
                📋 Инструкция логиста
              </h1>
              {lastSaved && (
                <span className="text-xs text-gray-400 hidden sm:inline">
                  Сохранено: {lastSaved}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Edit toggle */}
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleEdit}
              >
                {editMode ? (
                  <>
                    <Unlock className="w-4 h-4 mr-1" />
                    Режим редактирования
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1" />
                    Просмотр
                  </>
                )}
              </Button>

              {/* Code editor toggle (only in edit mode) */}
              {editMode && (
                <>
                  <Button
                    variant={showCodeEditor ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (showCodeEditor) {
                        setShowCodeEditor(false);
                      } else {
                        handleOpenCodeEditor();
                      }
                    }}
                  >
                    <Code className="w-4 h-4 mr-1" />
                    HTML
                  </Button>

                  {showCodeEditor && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Описание изменений..."
                        value={changeNote}
                        onChange={(e) => setChangeNote(e.target.value)}
                        className="px-3 py-1.5 text-sm border rounded-md w-48"
                      />
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        Сохранить
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* History */}
              <Button variant="outline" size="sm" onClick={handleToggleHistory}>
                <History className="w-4 h-4 mr-1" />
                История
              </Button>

              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([htmlContent], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'instruction.html';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Version History Sidebar */}
      {showHistory && (
        <div className="fixed right-0 top-[57px] bottom-0 w-80 bg-white border-l shadow-lg z-40 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">📜 История изменений</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {loadingVersions ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Загрузка...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>Пока нет сохранённых версий.</p>
                <p className="mt-1">Отредактируйте инструкцию и сохраните изменения.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-3 bg-gray-50 rounded-lg border hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        Версия {version.version}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleRestore(version.id)}
                        disabled={restoringVersion === version.id}
                      >
                        {restoringVersion === version.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3 mr-1" />
                        )}
                        Восстановить
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(version.createdAt).toLocaleString('ru-RU')}
                    </p>
                    {version.changeNote && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        {version.changeNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 57px)' }}>
        {showCodeEditor ? (
          // HTML Code Editor
          <div className="h-full flex flex-col">
            <textarea
              ref={codeEditorRef}
              value={editedHtml}
              onChange={(e) => setEditedHtml(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none outline-none"
              spellCheck={false}
              style={{ tabSize: 2 }}
            />
          </div>
        ) : (
          // Instruction HTML in iframe
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title="Инструкция логиста"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  );
}
