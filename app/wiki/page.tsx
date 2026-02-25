'use client';

import { useState, useEffect, useRef } from 'react';

interface Version {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
}

export default function WikiPage() {
  const [editMode, setEditMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const reloadIframe = () => setIframeKey((k) => k + 1);

  /* ── Load HTML for editing ── */
  const loadHtmlForEdit = async () => {
    try {
      const res = await fetch('/api/wiki/instruction?format=json');
      if (res.ok) {
        const data = await res.json();
        setHtmlContent(data.content);
      }
    } catch (e) {
      console.error('Error loading HTML for edit:', e);
    }
  };

  /* ── Edit handlers ── */
  const handleEdit = async () => {
    await loadHtmlForEdit();
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    setHtmlContent('');
  };

  const handleSave = async () => {
    if (!htmlContent.trim()) {
      alert('Нельзя сохранить пустую инструкцию');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/wiki/instruction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: htmlContent,
          changeNote: 'Обновление инструкции',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка сохранения');
      }
      const result = await res.json();
      alert(`✅ Сохранено! Версия ${result.version}`);
      setEditMode(false);
      setHtmlContent('');
      reloadIframe();
    } catch (e: any) {
      alert('❌ ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Version history ── */
  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch('/api/wiki/instruction/versions');
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (e) {
      console.error('Error loading versions:', e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Восстановить эту версию? Текущая версия будет заменена.')) return;
    setRestoringId(versionId);
    try {
      const res = await fetch('/api/wiki/instruction/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) throw new Error('Ошибка восстановления');
      alert('✅ Версия восстановлена!');
      reloadIframe();
      loadVersions();
    } catch (e: any) {
      alert('❌ ' + e.message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch('/api/wiki/instruction');
      if (!res.ok) return;
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'instruction.html';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  /* ── RENDER ── */

  // Edit mode — full-screen code editor
  if (editMode) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div
          style={{
            padding: '10px 20px',
            background: '#1a1a2e',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            ✏️ Редактирование инструкции (HTML)
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 20px',
              background: '#00b894',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? '⏳ Сохранение...' : '💾 Сохранить'}
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 20px',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ✕ Отмена
          </button>
        </div>

        {/* Code editor */}
        <textarea
          ref={textareaRef}
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            width: '100%',
            fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontSize: 13,
            lineHeight: 1.5,
            padding: 20,
            background: '#1e1e1e',
            color: '#d4d4d4',
            border: 'none',
            resize: 'none',
            outline: 'none',
            tabSize: 2,
          }}
        />
      </div>
    );
  }

  // View mode — full-screen iframe + floating controls
  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {/* Floating toolbar */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 9999,
          display: 'flex',
          gap: 6,
          background: 'rgba(26, 26, 46, 0.85)',
          padding: '6px 10px',
          borderRadius: 10,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <button onClick={handleEdit} style={floatingBtn}>
          ✏️ Редактировать
        </button>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) loadVersions();
          }}
          style={{
            ...floatingBtn,
            background: showHistory ? 'rgba(233,69,96,0.9)' : 'rgba(255,255,255,0.12)',
          }}
        >
          📜 История
        </button>
        <button onClick={handleDownload} style={floatingBtn} title="Скачать HTML">
          ⬇️
        </button>
      </div>

      {/* Full-screen iframe — loads directly from API, all relative URLs work */}
      <iframe
        key={iframeKey}
        src="/api/wiki/instruction"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Инструкция логиста"
      />

      {/* History sidebar */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 340,
            background: '#fff',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            zIndex: 9998,
            overflowY: 'auto',
            padding: 20,
            fontFamily: "'Segoe UI', sans-serif",
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              📜 История версий
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: '#666',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>

          {loadingVersions ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
              Загрузка...
            </p>
          ) : versions.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
              Нет сохранённых версий.
              <br />
              Отредактируйте инструкцию и сохраните.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {versions.map((v) => (
                <div
                  key={v.id}
                  style={{
                    padding: 14,
                    border: '1px solid #e8e8e8',
                    borderRadius: 10,
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = '#e94560')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = '#e8e8e8')
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: 14 }}>Версия {v.version}</strong>
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoringId === v.id}
                      style={{
                        padding: '4px 12px',
                        background: restoringId === v.id ? '#ccc' : '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor:
                          restoringId === v.id ? 'wait' : 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {restoringId === v.id ? '⏳' : '↩️'} Восстановить
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      marginTop: 6,
                    }}
                  >
                    {new Date(v.createdAt).toLocaleString('ru-RU')}
                  </div>
                  {v.changeNote && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#aaa',
                        fontStyle: 'italic',
                        marginTop: 4,
                      }}
                    >
                      {v.changeNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Shared styles ── */
const floatingBtn: React.CSSProperties = {
  padding: '7px 14px',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
  whiteSpace: 'nowrap',
};
