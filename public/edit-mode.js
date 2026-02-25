/**
 * Lavsit Instruction — Inline Edit Mode v3
 * Injected into the instruction iframe when user activates editing.
 * Communicates with parent via postMessage.
 *
 * Features:
 *  - Every block (card, template, table, list, paragraph, etc.) gets 📋 duplicate + ✕ delete
 *  - Duplicate copies the exact format and inserts below
 *  - For grid children the clone stays in the same grid
 *  - Section-level ✏️ toggle makes inner text editable
 *  - Sidebar gets ↑ ↓ ✕ per item + ➕ Add section
 *  - Block type picker for adding new blocks
 *  - Floating format toolbar (B/I/U/link/list)
 */
(function () {
  'use strict';
  if (window.__lavsitEditMode) return;
  window.__lavsitEditMode = true;

  /* ============================================================
     CSS
     ============================================================ */
  var css = document.createElement('style');
  css.id = 'le-css';
  css.textContent = [
    /* ── Bottom Toolbar (always visible) ── */
    '.le-bar{position:fixed;bottom:0;left:0;right:0;height:56px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;display:flex;align-items:center;padding:0 24px;gap:14px;z-index:100000;box-shadow:0 -4px 24px rgba(0,0,0,.35);font-family:"Segoe UI",sans-serif}',
    '.le-bar-label{font-size:14px;font-weight:600;opacity:.92;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.le-bar button{padding:10px 24px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;transition:all .15s;white-space:nowrap}',
    '.le-bar .le-save{background:#00b894;color:#fff;font-size:15px}',
    '.le-bar .le-save:hover{background:#00a07a;transform:scale(1.03)}',
    '.le-bar .le-cancel{background:rgba(255,255,255,.13);color:#fff;border:1px solid rgba(255,255,255,.22)!important}',
    '.le-bar .le-cancel:hover{background:rgba(255,255,255,.22)}',

    /* Offset page so content is not hidden behind bottom bar */
    'body.le-active{padding-bottom:60px!important}',

    /* ── Section states ── */
    'body.le-active .section{position:relative!important;transition:box-shadow .2s}',
    'body.le-active .section:hover{box-shadow:0 0 0 2px rgba(233,69,96,.3);border-radius:8px}',
    'body.le-active .section.le-on{outline:2.5px solid #e94560;outline-offset:4px;border-radius:8px}',

    /* ── Section controls (sticky: follows scroll inside section) ── */
    '.le-sec-ctrl{position:sticky;top:8px;float:right;display:none;gap:5px;z-index:1000;margin-bottom:-40px}',
    'body.le-active .section:hover .le-sec-ctrl,body.le-active .section.le-on .le-sec-ctrl{display:flex}',
    '.le-btn{width:34px;height:34px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .12s}',
    '.le-btn:hover{transform:scale(1.12)}',
    '.le-btn-edit{background:#e94560;color:#fff}',
    '.le-btn-del{background:#d63031;color:#fff}',

    /* ── Contenteditable ── */
    'body.le-active .le-on [contenteditable="true"]{outline:none;background:rgba(233,69,96,.04);border-radius:4px;padding:2px 6px;min-height:1.4em;transition:background .12s;cursor:text}',
    'body.le-active .le-on [contenteditable="true"]:hover{background:rgba(233,69,96,.07)}',
    'body.le-active .le-on [contenteditable="true"]:focus{background:rgba(233,69,96,.09);box-shadow:inset 0 0 0 2px rgba(233,69,96,.2)}',

    /* ── Floating format bar ── */
    '.le-fmt{position:fixed;display:none;background:#1a1a2e;border-radius:8px;padding:5px;gap:2px;z-index:100001;box-shadow:0 6px 20px rgba(0,0,0,.35)}',
    '.le-fmt.le-vis{display:flex}',
    '.le-fmt button{width:30px;height:30px;border:none;background:0 0;color:#fff;border-radius:5px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:background .1s}',
    '.le-fmt button:hover{background:rgba(255,255,255,.16)}',
    '.le-fmt .le-sep{width:1px;margin:4px 3px;background:rgba(255,255,255,.18)}',

    /* ── Sidebar controls ── */
    'body.le-active .sidebar nav a{position:relative!important;padding-right:75px!important}',
    '.le-nav-ctrl{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:none;gap:2px;z-index:10}',
    'body.le-active .sidebar nav a:hover .le-nav-ctrl{display:flex}',
    '.le-nav-b{width:22px;height:22px;border:none;background:rgba(255,255,255,.14);color:#fff;border-radius:4px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:background .1s}',
    '.le-nav-b:hover{background:rgba(255,255,255,.3)}',
    '.le-nav-b.le-nav-del{background:rgba(214,48,49,.6)}',
    '.le-nav-b.le-nav-del:hover{background:rgba(214,48,49,.9)}',
    '.le-add-sec{display:block;width:calc(100% - 24px);margin:14px 12px;padding:14px;background:rgba(233,69,96,.12);border:2px dashed rgba(233,69,96,.45);border-radius:8px;color:#ff6b81;font-size:14px;font-weight:700;cursor:pointer;text-align:center;transition:all .15s}',
    '.le-add-sec:hover{background:rgba(233,69,96,.22);border-color:#e94560}',

    /* ── Block hover controls (📋 ✕) — always visible on hover ── */
    '.le-blk-wrap{position:relative}',
    '.le-blk-bar{position:absolute;top:-2px;right:-2px;display:none;gap:3px;z-index:100;padding:3px;background:rgba(255,255,255,.92);border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.15)}',
    'body.le-active .le-blk-wrap:hover>.le-blk-bar{display:flex}',
    '.le-blk-bar button{width:28px;height:28px;border:none;border-radius:6px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .12s}',
    '.le-blk-bar button:hover{transform:scale(1.1)}',
    '.le-bb-dup{background:#0984e3;color:#fff}',
    '.le-bb-dup:hover{background:#0770c2}',
    '.le-bb-del{background:#d63031;color:#fff}',
    '.le-bb-del:hover{background:#b71c1c}',

    /* ── Add-block button ── */
    '.le-add-blk{display:block;width:100%;margin:14px 0 0;padding:10px;background:rgba(233,69,96,.05);border:2px dashed rgba(233,69,96,.25);border-radius:8px;color:#e94560;font-size:13px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}',
    '.le-add-blk:hover{background:rgba(233,69,96,.12)}',

    /* ── Block picker popup ── */
    '.le-picker{position:fixed;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.22);padding:12px;z-index:100002;min-width:230px;font-family:"Segoe UI",sans-serif}',
    '.le-picker-title{font-size:13px;font-weight:700;color:#333;margin-bottom:8px;padding:0 4px}',
    '.le-picker button{display:block;width:100%;padding:10px 12px;border:none;background:none;text-align:left;font-size:13px;border-radius:6px;cursor:pointer;transition:background .1s;color:#333}',
    '.le-picker button:hover{background:#f0f0f0}',
    '.le-picker button span{margin-right:8px}'
  ].join('\n');
  document.head.appendChild(css);
  document.body.classList.add('le-active');

  /* ============================================================
     TOP TOOLBAR
     ============================================================ */
  var bar = document.createElement('div');
  bar.className = 'le-bar';
  bar.innerHTML =
    '<div class="le-bar-label">✏️ Нажмите ✏️ на разделе → кликайте по тексту для правки</div>' +
    '<button class="le-cancel">✕ Отмена</button>' +
    '<button class="le-save">💾 Сохранить</button>';
  document.body.appendChild(bar);

  /* ============================================================
     FLOATING FORMAT BAR
     ============================================================ */
  var fmt = document.createElement('div');
  fmt.className = 'le-fmt';
  fmt.innerHTML =
    '<button title="Жирный" data-c="bold"><b>Ж</b></button>' +
    '<button title="Курсив" data-c="italic"><i>К</i></button>' +
    '<button title="Подчёркнутый" data-c="underline"><u>П</u></button>' +
    '<div class="le-sep"></div>' +
    '<button title="Ссылка" data-c="link">🔗</button>' +
    '<button title="Убрать ссылку" data-c="unlink">✂️</button>' +
    '<div class="le-sep"></div>' +
    '<button title="Список" data-c="insertUnorderedList">•</button>' +
    '<button title="Нумерованный" data-c="insertOrderedList">1.</button>';
  document.body.appendChild(fmt);

  fmt.querySelectorAll('button[data-c]').forEach(function (b) {
    b.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var c = b.dataset.c;
      if (c === 'link') {
        var url = prompt('URL ссылки:');
        if (url) document.execCommand('createLink', false, url);
      } else if (c === 'unlink') {
        document.execCommand('unlink');
      } else {
        document.execCommand(c);
      }
    });
  });

  var fmtTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(fmtTimer);
    fmtTimer = setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { fmt.classList.remove('le-vis'); return; }
      var node = sel.anchorNode;
      if (!node) { fmt.classList.remove('le-vis'); return; }
      var el = node.nodeType === 3 ? node.parentElement : node;
      if (!el || !el.closest('[contenteditable="true"]')) { fmt.classList.remove('le-vis'); return; }
      var rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width < 2) { fmt.classList.remove('le-vis'); return; }
      fmt.style.top = Math.max(0, rect.top - 48) + 'px';
      fmt.style.left = Math.max(8, rect.left + rect.width / 2 - 100) + 'px';
      fmt.classList.add('le-vis');
    }, 80);
  });

  document.addEventListener('mousedown', function (e) {
    if (!fmt.contains(e.target)) fmt.classList.remove('le-vis');
    var picker = document.querySelector('.le-picker');
    if (picker && !picker.contains(e.target) && !e.target.classList.contains('le-add-blk')) {
      picker.remove();
    }
  });

  /* ============================================================
     BLOCK SELECTORS  —  everything that counts as a "block"
     ============================================================ */
  var BLOCK_SEL = [
    '.card', '.card-info', '.card-warning', '.card-success', '.card-accent',
    '.card-highlight', '.info-box', '.warning-box',
    '.msg-template',
    'table',
    '.collapsible',       // collapsible header (will include its content)
    'details',
    'ol', 'ul',           // top-level lists
  ].join(',');

  /* Elements that should NOT get block controls */
  function isEditUI(el) {
    return el.closest('.le-bar,.le-fmt,.le-sec-ctrl,.le-add-blk,.le-blk-bar,.le-nav-ctrl,.le-add-sec,.le-picker,.le-blk-wrap');
  }

  /* ============================================================
     WRAP EVERY BLOCK WITH A WRAPPER that holds 📋 + ✕ buttons
     ============================================================ */
  function wrapBlocks(root) {
    root.querySelectorAll(BLOCK_SEL).forEach(function (block) {
      if (block.closest('.le-blk-wrap') || block.closest('.le-bar,.le-fmt,.le-sec-ctrl,.le-nav-ctrl,.le-add-sec,.le-picker')) return;
      if (block.classList.contains('le-blk-wrap')) return;
      // Skip <ol>/<ul> that are inside a .card (only wrap top-level ones)
      if ((block.tagName === 'OL' || block.tagName === 'UL') && block.parentElement.closest('.card,.card-info,.card-warning,.card-success,.card-accent,.card-highlight,.info-box,.warning-box,.msg-template')) return;

      wrapSingleBlock(block);
    });

    // Also wrap standalone <p> that are direct children of .section
    // (paragraphs not inside any card)
    root.querySelectorAll('.section > p, .section > h3, .section > h4').forEach(function (block) {
      if (block.closest('.le-blk-wrap') || block.closest('.le-bar,.le-fmt,.le-sec-ctrl,.le-nav-ctrl,.le-add-sec,.le-picker')) return;
      wrapSingleBlock(block);
    });
  }

  function wrapSingleBlock(block) {
    var wrap = document.createElement('div');
    wrap.className = 'le-blk-wrap';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);

    var barDiv = document.createElement('div');
    barDiv.className = 'le-blk-bar';
    barDiv.innerHTML =
      '<button class="le-bb-dup" title="Дублировать блок">📋</button>' +
      '<button class="le-bb-del" title="Удалить блок">✕</button>';
    wrap.appendChild(barDiv);

    barDiv.querySelector('.le-bb-dup').addEventListener('click', function (e) {
      e.stopPropagation();
      duplicateBlock(wrap);
    });
    barDiv.querySelector('.le-bb-del').addEventListener('click', function (e) {
      e.stopPropagation();
      if (confirm('Удалить этот блок?')) {
        // If collapsible header, also remove the content after it
        var inner = wrap.firstElementChild;
        if (inner && inner.classList.contains('collapsible')) {
          var nextWrap = wrap.nextElementSibling;
          if (nextWrap && nextWrap.classList.contains('le-blk-wrap')) {
            var nextInner = nextWrap.firstElementChild;
            if (nextInner && nextInner.classList.contains('collapsible-content')) {
              nextWrap.remove();
            }
          }
          // Also check unwrapped collapsible-content
          var nextSib = wrap.nextElementSibling;
          if (nextSib && nextSib.classList.contains('collapsible-content')) {
            nextSib.remove();
          }
        }
        wrap.remove();
      }
    });
  }

  /* ============================================================
     DUPLICATE BLOCK
     ============================================================ */
  function duplicateBlock(wrap) {
    var inner = wrap.firstElementChild;
    if (!inner) return;

    // Clone the inner element (not the wrapper)
    var clone = inner.cloneNode(true);
    // Remove any leftover editing artifacts
    clone.querySelectorAll('.le-blk-bar,.le-blk-wrap,.le-sec-ctrl,.le-add-blk').forEach(function (x) { x.remove(); });
    clone.querySelectorAll('[contenteditable]').forEach(function (x) { x.removeAttribute('contenteditable'); });

    // If the block is a collapsible, also clone its content
    if (inner.classList.contains('collapsible')) {
      var contentAfter = wrap.nextElementSibling;
      var contentEl = null;
      if (contentAfter && contentAfter.classList.contains('le-blk-wrap')) {
        contentEl = contentAfter.firstElementChild;
      } else if (contentAfter && contentAfter.classList.contains('collapsible-content')) {
        contentEl = contentAfter;
      }

      // Insert cloned header
      var newWrap = document.createElement('div');
      newWrap.className = 'le-blk-wrap';
      newWrap.appendChild(clone);
      var ref = contentAfter ? contentAfter.nextSibling : wrap.nextSibling;
      wrap.parentNode.insertBefore(newWrap, ref);
      addBarToWrap(newWrap);

      // Clone and insert content too
      if (contentEl) {
        var contentClone = contentEl.cloneNode(true);
        contentClone.querySelectorAll('.le-blk-bar,.le-blk-wrap').forEach(function (x) { x.remove(); });
        contentClone.querySelectorAll('[contenteditable]').forEach(function (x) { x.removeAttribute('contenteditable'); });
        var cw = document.createElement('div');
        cw.className = 'le-blk-wrap';
        cw.appendChild(contentClone);
        newWrap.parentNode.insertBefore(cw, newWrap.nextSibling);
        addBarToWrap(cw);
      }

      activateIfEditing(newWrap);
      return;
    }

    // Standard block — insert clone after current wrapper
    var newWrap2 = document.createElement('div');
    newWrap2.className = 'le-blk-wrap';
    newWrap2.appendChild(clone);
    wrap.parentNode.insertBefore(newWrap2, wrap.nextSibling);
    addBarToWrap(newWrap2);

    activateIfEditing(newWrap2);
  }

  function addBarToWrap(wrap) {
    if (wrap.querySelector('.le-blk-bar')) return;
    var barDiv = document.createElement('div');
    barDiv.className = 'le-blk-bar';
    barDiv.innerHTML =
      '<button class="le-bb-dup" title="Дублировать блок">📋</button>' +
      '<button class="le-bb-del" title="Удалить блок">✕</button>';
    wrap.appendChild(barDiv);

    barDiv.querySelector('.le-bb-dup').addEventListener('click', function (e) {
      e.stopPropagation();
      duplicateBlock(wrap);
    });
    barDiv.querySelector('.le-bb-del').addEventListener('click', function (e) {
      e.stopPropagation();
      if (confirm('Удалить этот блок?')) wrap.remove();
    });
  }

  /** If the parent section is being edited, make cloned block editable */
  function activateIfEditing(wrap) {
    var section = wrap.closest('.section');
    if (section && section.classList.contains('le-on')) {
      makeEditable(wrap);
    }
  }

  /* ============================================================
     INIT ALL SECTIONS
     ============================================================ */
  document.querySelectorAll('.section').forEach(initSection);

  function initSection(section) {
    if (section.querySelector('.le-sec-ctrl')) return;

    /* Wrap all blocks inside this section */
    wrapBlocks(section);

    /* Section controls (sticky float-right ✏️🗑️) — prepend so they float at top */
    var ctrl = document.createElement('div');
    ctrl.className = 'le-sec-ctrl';
    ctrl.innerHTML =
      '<button class="le-btn le-btn-edit" title="Редактировать секцию">✏️</button>' +
      '<button class="le-btn le-btn-del" title="Удалить раздел">🗑️</button>';
    section.prepend(ctrl);

    ctrl.querySelector('.le-btn-edit').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleEdit(section);
    });
    ctrl.querySelector('.le-btn-del').addEventListener('click', function (e) {
      e.stopPropagation();
      var title = (section.querySelector('h2') || section.querySelector('h3'))?.textContent || '';
      if (confirm('Удалить раздел «' + title.substring(0, 60) + '»?')) deleteSection(section);
    });

    /* Add-block button at bottom */
    var ab = document.createElement('button');
    ab.className = 'le-add-blk';
    ab.textContent = '➕ Добавить блок';
    ab.addEventListener('click', function (e) { showBlockPicker(e, section); });
    section.appendChild(ab);
  }

  /* ============================================================
     TOGGLE SECTION EDITING
     ============================================================ */
  function toggleEdit(section) {
    if (section.classList.contains('le-on')) finishEdit(section);
    else startEdit(section);
  }

  function startEdit(section) {
    document.querySelectorAll('.section.le-on').forEach(function (s) {
      if (s !== section) finishEdit(s);
    });
    section.classList.add('le-on');

    makeEditable(section);

    section.classList.add('active');
    var btn = section.querySelector('.le-btn-edit');
    if (btn) btn.textContent = '✅';
  }

  function makeEditable(root) {
    var sel = 'h2,h3,h4,p,li,td,th,blockquote,figcaption,dt,dd,summary';
    root.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.le-sec-ctrl,.le-add-blk,.le-bar,.le-fmt,.le-nav-ctrl,.le-blk-bar,.le-add-sec,.le-picker,.copy-btn')) return;
      el.contentEditable = 'true';
    });

    /* Template divs */
    root.querySelectorAll('.msg-template').forEach(function (tmpl) {
      tmpl.contentEditable = 'true';
      tmpl.querySelectorAll('.copy-btn').forEach(function (b) { b.contentEditable = 'false'; });
    });

    /* Collapsible headers */
    root.querySelectorAll('.collapsible').forEach(function (col) {
      col.contentEditable = 'true';
      col.removeAttribute('onclick');
      col.dataset.leOldOnclick = 'toggleCollapse(this)';
    });
  }

  function finishEdit(section) {
    section.classList.remove('le-on');
    section.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });

    section.querySelectorAll('.collapsible').forEach(function (col) {
      if (col.dataset.leOldOnclick) {
        col.setAttribute('onclick', col.dataset.leOldOnclick);
        delete col.dataset.leOldOnclick;
      }
    });

    var btn = section.querySelector('.le-btn-edit');
    if (btn) btn.textContent = '✏️';

    syncSidebarLabel(section);
  }

  function syncSidebarLabel(section) {
    var sectionId = section.id.replace('sec-', '');
    var heading = section.querySelector('h2');
    if (!heading) return;
    var navLink = document.querySelector('.sidebar nav a[data-section="' + sectionId + '"]');
    if (!navLink) return;
    var iconSpan = navLink.querySelector('.icon');
    var txt = heading.textContent.trim().replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]+\s*/u, '');
    if (!txt) txt = heading.textContent.trim();
    var iconHtml = iconSpan ? iconSpan.outerHTML : '';
    var navCtrl = navLink.querySelector('.le-nav-ctrl');
    var navCtrlHtml = navCtrl ? navCtrl.outerHTML : '';
    navLink.innerHTML = iconHtml + ' ' + txt + navCtrlHtml;
    reattachNavCtrlEvents(navLink);
  }

  /* ============================================================
     DELETE SECTION
     ============================================================ */
  function deleteSection(section) {
    var sectionId = section.id.replace('sec-', '');
    var navLink = document.querySelector('.sidebar nav a[data-section="' + sectionId + '"]');
    if (navLink) navLink.remove();
    section.remove();

    var dash = document.getElementById('sec-dashboard');
    if (dash) {
      document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
      dash.classList.add('active');
      var dn = document.querySelector('.sidebar nav a[data-section="dashboard"]');
      if (dn) {
        document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
        dn.classList.add('active');
      }
    }
  }

  /* ============================================================
     ADD NEW SECTION
     ============================================================ */
  function addNewSection() {
    var id = 'new-' + Date.now();
    var section = document.createElement('div');
    section.className = 'section active';
    section.id = 'sec-' + id;
    section.innerHTML =
      '<h2 contenteditable="true">📌 Новый раздел</h2>' +
      '<div class="card"><p contenteditable="true">Нажмите здесь, чтобы добавить содержимое...</p></div>';

    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });

    var main = document.querySelector('.main');
    main.appendChild(section);
    initSection(section);

    var navEl = document.querySelector('.sidebar nav');
    var addBtn = navEl.querySelector('.le-add-sec');
    var link = document.createElement('a');
    link.href = '#';
    link.dataset.section = id;
    link.innerHTML = '<span class="icon">📌</span> Новый раздел';
    link.style.position = 'relative';
    appendNavControls(link);
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showSection(id);
    });

    document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
    link.classList.add('active');
    if (addBtn) navEl.insertBefore(link, addBtn);
    else navEl.appendChild(link);

    startEdit(section);
    var h2 = section.querySelector('h2');
    if (h2) {
      h2.focus();
      var range = document.createRange();
      range.selectNodeContents(h2);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /* ============================================================
     BLOCK TYPE PICKER
     ============================================================ */
  function showBlockPicker(e, section) {
    var old = document.querySelector('.le-picker');
    if (old) old.remove();

    var picker = document.createElement('div');
    picker.className = 'le-picker';

    var items = [
      { icon: '📝', label: 'Текст', type: 'text' },
      { icon: '📦', label: 'Карточка', type: 'card' },
      { icon: 'ℹ️', label: 'Инфо-блок', type: 'info' },
      { icon: '⚠️', label: 'Предупреждение', type: 'warning' },
      { icon: '✅', label: 'Карточка-акцент', type: 'success' },
      { icon: '💬', label: 'Шаблон сообщения', type: 'template' },
      { icon: '📊', label: 'Таблица', type: 'table' },
      { icon: '▼', label: 'Раскрывающийся блок', type: 'collapsible' },
      { icon: '📄', label: 'Нумерованный список', type: 'ol' },
      { icon: '•', label: 'Маркированный список', type: 'ul' },
    ];

    picker.innerHTML = '<div class="le-picker-title">Тип блока:</div>' +
      items.map(function (it) {
        return '<button data-t="' + it.type + '"><span>' + it.icon + '</span>' + it.label + '</button>';
      }).join('');

    var rect = e.target.getBoundingClientRect();
    picker.style.top = (rect.top - items.length * 40 - 20) + 'px';
    picker.style.left = Math.max(8, rect.left) + 'px';
    if (parseInt(picker.style.top) < 60) {
      picker.style.top = (rect.bottom + 8) + 'px';
    }

    document.body.appendChild(picker);

    picker.querySelectorAll('button[data-t]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        createBlock(btn.dataset.t, section);
        picker.remove();
      });
    });
  }

  function createBlock(type, section) {
    var el;

    switch (type) {
      case 'card':
        el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = '<h4>Заголовок</h4><p>Содержимое...</p>';
        break;
      case 'info':
        el = document.createElement('div');
        el.className = 'card card-info';
        el.innerHTML = '<h4>ℹ️ Информация</h4><p>Содержимое...</p>';
        break;
      case 'warning':
        el = document.createElement('div');
        el.className = 'card card-warning';
        el.innerHTML = '<h4>⚠️ Внимание</h4><p>Содержимое...</p>';
        break;
      case 'success':
        el = document.createElement('div');
        el.className = 'card card-success';
        el.innerHTML = '<h4>✅ Акцент</h4><p>Содержимое...</p>';
        break;
      case 'template':
        el = document.createElement('div');
        el.className = 'msg-template';
        el.innerHTML = '<button class="copy-btn" onclick="copyTemplate(this)">📋 Копировать</button>Текст шаблона...<br>Вторая строка...<br>';
        break;
      case 'table':
        el = document.createElement('table');
        el.innerHTML =
          '<thead><tr><th>Столбец 1</th><th>Столбец 2</th><th>Столбец 3</th></tr></thead>' +
          '<tbody><tr><td>—</td><td>—</td><td>—</td></tr></tbody>';
        break;
      case 'collapsible':
        var header = document.createElement('div');
        header.className = 'collapsible';
        header.setAttribute('onclick', 'toggleCollapse(this)');
        header.textContent = '📌 Заголовок блока';
        var content = document.createElement('div');
        content.className = 'collapsible-content show';
        content.innerHTML = '<p>Содержимое...</p>';

        var addBtn = section.querySelector('.le-add-blk');
        if (addBtn) {
          // Wrap each and insert
          var w1 = document.createElement('div'); w1.className = 'le-blk-wrap';
          w1.appendChild(header);
          var w2 = document.createElement('div'); w2.className = 'le-blk-wrap';
          w2.appendChild(content);
          section.insertBefore(w1, addBtn);
          section.insertBefore(w2, addBtn);
          addBarToWrap(w1);
          addBarToWrap(w2);
        } else {
          section.appendChild(header);
          section.appendChild(content);
          wrapBlocks(section);
        }
        if (!section.classList.contains('le-on')) startEdit(section);
        return;
      case 'ol':
        el = document.createElement('ol');
        el.innerHTML = '<li>Пункт 1</li><li>Пункт 2</li><li>Пункт 3</li>';
        break;
      case 'ul':
        el = document.createElement('ul');
        el.innerHTML = '<li>Пункт 1</li><li>Пункт 2</li><li>Пункт 3</li>';
        break;
      default:
        el = document.createElement('p');
        el.textContent = 'Новый текст — кликните для редактирования...';
    }

    if (!el) return;

    /* Wrap it */
    var wrap = document.createElement('div');
    wrap.className = 'le-blk-wrap';
    wrap.appendChild(el);

    var addBtn = section.querySelector('.le-add-blk');
    if (addBtn) section.insertBefore(wrap, addBtn);
    else section.appendChild(wrap);

    addBarToWrap(wrap);
    if (!section.classList.contains('le-on')) startEdit(section);
    else makeEditable(wrap);

    var editable = el.querySelector('h4,p,li,td,th') || el;
    if (editable) {
      editable.contentEditable = 'true';
      editable.focus();
    }
  }

  /* ============================================================
     SIDEBAR: ↑ ↓ ✕ on each nav link + ➕ Add section
     ============================================================ */
  var navEl = document.querySelector('.sidebar nav');

  navEl.querySelectorAll('a[data-section]').forEach(function (link) {
    link.style.position = 'relative';
    appendNavControls(link);
  });

  var addSecBtn = document.createElement('button');
  addSecBtn.className = 'le-add-sec';
  addSecBtn.textContent = '➕ Добавить раздел';
  addSecBtn.addEventListener('click', addNewSection);
  navEl.appendChild(addSecBtn);

  function appendNavControls(link) {
    if (link.querySelector('.le-nav-ctrl')) return;
    var ctrl = document.createElement('div');
    ctrl.className = 'le-nav-ctrl';
    ctrl.innerHTML =
      '<button class="le-nav-b" data-d="up" title="Вверх">↑</button>' +
      '<button class="le-nav-b" data-d="down" title="Вниз">↓</button>' +
      '<button class="le-nav-b le-nav-del" data-d="del" title="Удалить">✕</button>';
    link.appendChild(ctrl);
    reattachNavCtrlEvents(link);
  }

  function reattachNavCtrlEvents(link) {
    link.querySelectorAll('.le-nav-b').forEach(function (b) {
      var nb = b.cloneNode(true);
      b.parentNode.replaceChild(nb, b);
      nb.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var d = nb.dataset.d;
        if (d === 'del') {
          var sectionId = link.dataset.section;
          var section = document.getElementById('sec-' + sectionId);
          var title = section?.querySelector('h2')?.textContent || sectionId;
          if (confirm('Удалить раздел «' + title.substring(0, 60) + '»?')) {
            if (section) section.remove();
            link.remove();
            var dash = document.getElementById('sec-dashboard');
            if (dash) {
              document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
              dash.classList.add('active');
              var dn = document.querySelector('.sidebar nav a[data-section="dashboard"]');
              if (dn) {
                document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
                dn.classList.add('active');
              }
            }
          }
        } else {
          moveSection(link, d);
        }
      });
    });
  }

  function moveSection(navLink, dir) {
    var sectionId = navLink.dataset.section;
    var section = document.getElementById('sec-' + sectionId);
    if (dir === 'up') {
      var prev = navLink.previousElementSibling;
      while (prev && prev.tagName !== 'A') prev = prev.previousElementSibling;
      if (prev) {
        navLink.parentNode.insertBefore(navLink, prev);
        if (section) {
          var ps = document.getElementById('sec-' + prev.dataset.section);
          if (ps) section.parentNode.insertBefore(section, ps);
        }
      }
    } else {
      var next = navLink.nextElementSibling;
      while (next && next.tagName !== 'A') next = next.nextElementSibling;
      if (next) {
        navLink.parentNode.insertBefore(next, navLink);
        if (section) {
          var ns = document.getElementById('sec-' + next.dataset.section);
          if (ns) ns.parentNode.insertBefore(ns, section);
        }
      }
    }
  }

  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
    var sec = document.getElementById('sec-' + sectionId);
    if (sec) sec.classList.add('active');
    var lnk = document.querySelector('.sidebar nav a[data-section="' + sectionId + '"]');
    if (lnk) lnk.classList.add('active');
  }

  /* ============================================================
     CLEANUP & GET HTML
     ============================================================ */
  function cleanupAndGetHtml() {
    /* Finish all edits */
    document.querySelectorAll('.section.le-on').forEach(function (s) { finishEdit(s); });

    /* Unwrap all le-blk-wrap divs (move children up) */
    document.querySelectorAll('.le-blk-wrap').forEach(function (wrap) {
      var parent = wrap.parentNode;
      while (wrap.firstChild) {
        if (wrap.firstChild.classList && wrap.firstChild.classList.contains('le-blk-bar')) {
          wrap.removeChild(wrap.firstChild);
        } else {
          parent.insertBefore(wrap.firstChild, wrap);
        }
      }
      parent.removeChild(wrap);
    });

    /* Remove all editing UI elements */
    var uiSel = '.le-bar,.le-fmt,.le-sec-ctrl,.le-add-blk,.le-nav-ctrl,.le-add-sec,.le-blk-bar,.le-blk-ctrl,.le-picker';
    document.querySelectorAll(uiSel).forEach(function (el) { el.remove(); });
    document.getElementById('le-css')?.remove();

    /* Remove contenteditable */
    document.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });

    /* Restore collapsible onclick */
    document.querySelectorAll('[data-le-old-onclick]').forEach(function (el) {
      el.setAttribute('onclick', el.dataset.leOldOnclick);
      delete el.dataset.leOldOnclick;
    });

    document.body.classList.remove('le-active');
    document.querySelectorAll('.le-on').forEach(function (el) { el.classList.remove('le-on'); });
    document.body.style.paddingBottom = '';

    var scriptTag = document.getElementById('le-script');
    if (scriptTag) scriptTag.remove();

    return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  }

  /* ============================================================
     SAVE / CANCEL
     ============================================================ */
  bar.querySelector('.le-save').addEventListener('click', function () {
    var html = cleanupAndGetHtml();
    window.parent.postMessage({ type: 'LAVSIT_SAVE', html: html }, '*');
  });

  bar.querySelector('.le-cancel').addEventListener('click', function () {
    if (!confirm('Отменить все изменения?')) return;
    window.parent.postMessage({ type: 'LAVSIT_CANCEL' }, '*');
  });

  /* ============================================================
     KEYBOARD SHORTCUTS
     ============================================================ */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      bar.querySelector('.le-save').click();
    }
    if (e.key === 'Escape') {
      var picker = document.querySelector('.le-picker');
      if (picker) { picker.remove(); return; }
      var active = document.querySelector('.section.le-on');
      if (active) finishEdit(active);
    }
  });

})();
