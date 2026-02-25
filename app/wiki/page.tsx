'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Version {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
}

export default function WikiPage() {
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const reloadIframe = useCallback(() => setIframeKey((k) => k + 1), []);

  /* ── postMessage listener (save / cancel from iframe editing script) ── */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'LAVSIT_SAVE' && e.data.html) {
        saveInstruction(e.data.html);
      } else if (e.data?.type === 'LAVSIT_CANCEL') {
        setEditMode(false);
        reloadIframe();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [reloadIframe]);

  /* ── Save HTML via API ── */
  const saveInstruction = async (html: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/wiki/instruction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: html,
          changeNote: 'Обновление через визуальный редактор',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка сохранения');
      }
      const result = await res.json();
      alert(`✅ Сохранено! Версия ${result.version}`);
      setEditMode(false);
      reloadIframe();
    } catch (e: any) {
      alert('❌ ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Inject editing script into iframe ── */
  const activateEditMode = () => {
    setEditMode(true);
    const tryInject = (attempts = 0) => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || !doc.body || !doc.querySelector('.section')) {
          if (attempts < 30) setTimeout(() => tryInject(attempts + 1), 200);
          return;
        }
        // Don't double-inject
        if (doc.getElementById('le-css')) return;

        const script = doc.createElement('script');
        script.id = 'le-script';
        script.src = '/edit-mode.js';
        doc.body.appendChild(script);
      } catch (err) {
        console.error('Cannot inject edit script:', err);
      }
    };
    // Give iframe a moment to be ready
    setTimeout(() => tryInject(), 300);
  };

  /* ── Cancel edit mode ── */
  const cancelEditMode = () => {
    setEditMode(false);
    reloadIframe();
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
    if (!confirm('Восстановить эту версию? Текущая версия будет заменена.'))
      return;
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

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {/* ── Floating toolbar (top-right) ── */}
      <div
        style={{
          position: 'fixed',
          top: 10,
          right: showHistory ? 352 : 10,
          zIndex: 9999,
          display: 'flex',
          gap: 6,
          background: 'rgba(26,26,46,0.88)',
          padding: '6px 10px',
          borderRadius: 10,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          transition: 'right 0.3s ease',
        }}
      >
        {!editMode ? (
          <button onClick={activateEditMode} style={pill}>
            ✏️ Редактировать
          </button>
        ) : (
          <button onClick={cancelEditMode} style={pill}>
            ✕ Выйти из редактирования
          </button>
        )}

        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) loadVersions();
          }}
          style={{
            ...pill,
            background: showHistory
              ? 'rgba(233,69,96,0.85)'
              : 'rgba(255,255,255,0.12)',
          }}
        >
          📜 История
        </button>

        <button onClick={handleDownload} style={pill} title="Скачать HTML">
          ⬇️
        </button>
      </div>

      {/* ── Saving overlay ── */}
      {isSaving && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '32px 48px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Сохранение...
            </div>
          </div>
        </div>
      )}

      {/* ── Instruction iframe ── */}
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src="/api/wiki/instruction"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Инструкция логиста"
      />

      {/* ── Version history sidebar ── */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 340,
            background: '#fff',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
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
              ⏳ Загрузка...
            </p>
          ) : versions.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
              Нет сохранённых версий.
              <br />
              Отредактируйте и сохраните инструкцию.
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
                    <strong style={{ fontSize: 14 }}>
                      Версия {v.version}
                    </strong>
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoringId === v.id}
                      style={{
                        padding: '5px 14px',
                        background:
                          restoringId === v.id ? '#ccc' : '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor:
                          restoringId === v.id ? 'wait' : 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {restoringId === v.id ? '⏳' : '↩️'} Восстановить
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
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

/* ── Shared button style ── */
const pill: React.CSSProperties = {
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
