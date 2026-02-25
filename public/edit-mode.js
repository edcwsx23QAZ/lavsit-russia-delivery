/**
 * Lavsit Instruction — Inline Edit Mode v2
 * Injected into the instruction iframe when user activates editing.
 * Communicates with parent via postMessage.
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
    /* Top Toolbar */
    '.le-bar{position:fixed;top:0;left:0;right:0;height:54px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;display:flex;align-items:center;padding:0 20px;gap:14px;z-index:100000;box-shadow:0 4px 20px rgba(0,0,0,.35);font-family:"Segoe UI",sans-serif}',
    '.le-bar-label{font-size:14px;font-weight:600;opacity:.92;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.le-bar button{padding:8px 20px;border:none;border-radius:7px;cursor:pointer;font-weight:700;font-size:13px;transition:all .15s;white-space:nowrap}',
    '.le-bar .le-save{background:#00b894;color:#fff}',
    '.le-bar .le-save:hover{background:#00a07a}',
    '.le-bar .le-cancel{background:rgba(255,255,255,.13);color:#fff;border:1px solid rgba(255,255,255,.22)!important}',
    '.le-bar .le-cancel:hover{background:rgba(255,255,255,.22)}',

    /* Offset page */
    'body.le-active{padding-top:54px!important}',
    'body.le-active .sidebar{top:54px!important;height:calc(100vh - 54px)!important}',

    /* Section hover / edit */
    'body.le-active .section{position:relative!important;transition:box-shadow .2s}',
    'body.le-active .section:hover{box-shadow:0 0 0 2px rgba(233,69,96,.3);border-radius:8px}',
    'body.le-active .section.le-on{outline:2.5px solid #e94560;outline-offset:4px;border-radius:8px}',

    /* Section controls (top-right corner) */
    '.le-sec-ctrl{position:absolute;top:6px;right:6px;display:none;gap:5px;z-index:1000}',
    'body.le-active .section:hover .le-sec-ctrl,body.le-active .section.le-on .le-sec-ctrl{display:flex}',
    '.le-btn{width:34px;height:34px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .12s}',
    '.le-btn:hover{transform:scale(1.12)}',
    '.le-btn-edit{background:#e94560;color:#fff}',
    '.le-btn-del{background:#d63031;color:#fff}',

    /* Contenteditable */
    'body.le-active .le-on [contenteditable="true"]{outline:none;background:rgba(233,69,96,.04);border-radius:4px;padding:2px 6px;min-height:1.4em;transition:background .12s;cursor:text}',
    'body.le-active .le-on [contenteditable="true"]:hover{background:rgba(233,69,96,.07)}',
    'body.le-active .le-on [contenteditable="true"]:focus{background:rgba(233,69,96,.09);box-shadow:inset 0 0 0 2px rgba(233,69,96,.2)}',

    /* Floating format bar */
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

    /* ── Block controls (inside sections) ── */
    '.le-blk-ctrl{position:absolute;top:-12px;right:6px;display:none;gap:3px;z-index:10}',
    '.le-blk-b{width:26px;height:26px;border:none;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2);transition:transform .1s}',
    '.le-blk-b:hover{transform:scale(1.1)}',
    '.le-blk-b.le-bb-dup{background:#0984e3;color:#fff}',
    '.le-blk-b.le-bb-del{background:#d63031;color:#fff}',
    /* Show on hover when section is being edited */
    '.le-on .card,.le-on table,.le-on .info-box,.le-on .warning-box,.le-on .msg-template,.le-on .collapsible-content,.le-on .card-info,.le-on .card-warning{position:relative!important}',
    '.le-on .card:hover>.le-blk-ctrl,.le-on table:hover>.le-blk-ctrl,.le-on .info-box:hover>.le-blk-ctrl,.le-on .warning-box:hover>.le-blk-ctrl,.le-on .msg-template:hover>.le-blk-ctrl,.le-on .collapsible-content:hover>.le-blk-ctrl,.le-on .card-info:hover>.le-blk-ctrl,.le-on .card-warning:hover>.le-blk-ctrl{display:flex}',

    /* Add-block button */
    '.le-add-blk{display:block;width:100%;margin:14px 0 0;padding:10px;background:rgba(233,69,96,.05);border:2px dashed rgba(233,69,96,.25);border-radius:8px;color:#e94560;font-size:13px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}',
    '.le-add-blk:hover{background:rgba(233,69,96,.12)}',

    /* Block type picker (popup) */
    '.le-picker{position:fixed;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.2);padding:12px;z-index:100002;min-width:220px;font-family:"Segoe UI",sans-serif}',
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
    '<div class="le-bar-label">✏️ Режим редактирования — нажмите ✏️ на разделе, затем кликайте по тексту</div>' +
    '<button class="le-save">💾 Сохранить</button>' +
    '<button class="le-cancel">✕ Отмена</button>';
  document.body.prepend(bar);

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
    /* Close picker on outside click */
    var picker = document.querySelector('.le-picker');
    if (picker && !picker.contains(e.target) && !e.target.classList.contains('le-add-blk')) {
      picker.remove();
    }
  });

  /* ============================================================
     SECTION CONTROLS — init all sections
     ============================================================ */
  document.querySelectorAll('.section').forEach(initSection);

  function initSection(section) {
    if (section.querySelector('.le-sec-ctrl')) return; // already initialized

    var ctrl = document.createElement('div');
    ctrl.className = 'le-sec-ctrl';
    ctrl.innerHTML =
      '<button class="le-btn le-btn-edit" title="Редактировать секцию">✏️</button>' +
      '<button class="le-btn le-btn-del" title="Удалить раздел">🗑️</button>';
    section.appendChild(ctrl);

    ctrl.querySelector('.le-btn-edit').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleEdit(section);
    });
    ctrl.querySelector('.le-btn-del').addEventListener('click', function (e) {
      e.stopPropagation();
      var title = (section.querySelector('h2') || section.querySelector('h3'))?.textContent || '';
      if (confirm('Удалить раздел «' + title.substring(0, 60) + '»?')) deleteSection(section);
    });

    /* Add-block button at bottom of section */
    var ab = document.createElement('button');
    ab.className = 'le-add-blk';
    ab.textContent = '➕ Добавить блок';
    ab.addEventListener('click', function (e) { showBlockPicker(e, section); });
    section.appendChild(ab);

    /* Block controls (duplicate + delete) on inner blocks */
    addBlockControls(section);
  }

  /* ============================================================
     BLOCK CONTROLS: duplicate + delete on each inner block
     ============================================================ */
  var BLOCK_SELECTORS = '.card, table, .info-box, .warning-box, .msg-template, .collapsible, .card-info, .card-warning';

  function addBlockControls(section) {
    section.querySelectorAll(BLOCK_SELECTORS).forEach(function (block) {
      if (block.querySelector('.le-blk-ctrl')) return;

      var ctrl = document.createElement('div');
      ctrl.className = 'le-blk-ctrl';
      ctrl.innerHTML =
        '<button class="le-blk-b le-bb-dup" title="Дублировать блок">📋</button>' +
        '<button class="le-blk-b le-bb-del" title="Удалить блок">✕</button>';
      block.appendChild(ctrl);

      /* Duplicate */
      ctrl.querySelector('.le-bb-dup').addEventListener('click', function (e) {
        e.stopPropagation();
        duplicateBlock(block, section);
      });

      /* Delete */
      ctrl.querySelector('.le-bb-del').addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Удалить этот блок?')) {
          /* If it's a collapsible, also remove the content div after it */
          if (block.classList.contains('collapsible')) {
            var next = block.nextElementSibling;
            if (next && next.classList.contains('collapsible-content')) next.remove();
          }
          block.remove();
        }
      });
    });

    /* Also add controls to collapsible-content blocks */
    section.querySelectorAll('.collapsible-content').forEach(function (block) {
      if (block.querySelector('.le-blk-ctrl')) return;
      var ctrl = document.createElement('div');
      ctrl.className = 'le-blk-ctrl';
      ctrl.innerHTML =
        '<button class="le-blk-b le-bb-dup" title="Дублировать блок">📋</button>' +
        '<button class="le-blk-b le-bb-del" title="Удалить блок">✕</button>';
      block.appendChild(ctrl);

      ctrl.querySelector('.le-bb-dup').addEventListener('click', function (e) {
        e.stopPropagation();
        duplicateBlock(block, section);
      });
      ctrl.querySelector('.le-bb-del').addEventListener('click', function (e) {
        e.stopPropagation();
        /* Also remove the collapsible header before it */
        var prev = block.previousElementSibling;
        if (prev && prev.classList.contains('collapsible')) prev.remove();
        block.remove();
      });
    });
  }

  /* ============================================================
     DUPLICATE BLOCK
     ============================================================ */
  function duplicateBlock(block, section) {
    var clone = block.cloneNode(true);

    /* Remove old controls from clone */
    clone.querySelectorAll('.le-blk-ctrl').forEach(function (c) { c.remove(); });

    /* If collapsible header, also clone the content */
    if (block.classList.contains('collapsible')) {
      var contentAfter = block.nextElementSibling;
      if (contentAfter && contentAfter.classList.contains('collapsible-content')) {
        var contentClone = contentAfter.cloneNode(true);
        contentClone.querySelectorAll('.le-blk-ctrl').forEach(function (c) { c.remove(); });
        /* Insert clones after the content block */
        contentAfter.parentNode.insertBefore(clone, contentAfter.nextSibling);
        clone.parentNode.insertBefore(contentClone, clone.nextSibling);
        /* Re-init block controls on clones */
        addBlockControls(section);
        /* Enable edit on cloned elements */
        if (section.classList.contains('le-on')) {
          makeEditable(clone);
          makeEditable(contentClone);
        }
        return;
      }
    }

    /* If collapsible-content, also clone the header before it */
    if (block.classList.contains('collapsible-content')) {
      var headerBefore = block.previousElementSibling;
      if (headerBefore && headerBefore.classList.contains('collapsible')) {
        var headerClone = headerBefore.cloneNode(true);
        headerClone.querySelectorAll('.le-blk-ctrl').forEach(function (c) { c.remove(); });
        block.parentNode.insertBefore(headerClone, block.nextSibling);
        headerClone.parentNode.insertBefore(clone, headerClone.nextSibling);
        addBlockControls(section);
        if (section.classList.contains('le-on')) {
          makeEditable(headerClone);
          makeEditable(clone);
        }
        return;
      }
    }

    /* Standard block: insert clone after original */
    block.parentNode.insertBefore(clone, block.nextSibling);
    addBlockControls(section);

    if (section.classList.contains('le-on')) {
      makeEditable(clone);
    }
  }

  function makeEditable(el) {
    var sel = 'h2,h3,h4,p,li,td,th,blockquote,figcaption,dt,dd,div.msg-template';
    el.querySelectorAll(sel).forEach(function (child) {
      if (child.closest('.le-blk-ctrl,.le-sec-ctrl,.le-add-blk,.le-bar,.le-fmt,.le-nav-ctrl')) return;
      child.contentEditable = 'true';
    });
    /* If the element itself is a template or simple text */
    if (el.matches && (el.matches('.msg-template') || el.matches('p'))) {
      el.contentEditable = 'true';
    }
  }

  /* ============================================================
     BLOCK TYPE PICKER (popup near the + button)
     ============================================================ */
  function showBlockPicker(e, section) {
    /* Remove any existing picker */
    var old = document.querySelector('.le-picker');
    if (old) old.remove();

    var picker = document.createElement('div');
    picker.className = 'le-picker';

    var items = [
      { icon: '📝', label: 'Текстовый абзац', type: 'text' },
      { icon: '📦', label: 'Карточка', type: 'card' },
      { icon: 'ℹ️', label: 'Инфо-блок', type: 'info' },
      { icon: '⚠️', label: 'Предупреждение', type: 'warning' },
      { icon: '📋', label: 'Шаблон сообщения', type: 'template' },
      { icon: '📊', label: 'Таблица', type: 'table' },
      { icon: '▼', label: 'Раскрывающийся блок', type: 'collapsible' },
      { icon: '📄', label: 'Нумерованный список', type: 'ol' },
      { icon: '•', label: 'Маркированный список', type: 'ul' },
    ];

    picker.innerHTML = '<div class="le-picker-title">Тип блока:</div>' +
      items.map(function (it) {
        return '<button data-t="' + it.type + '"><span>' + it.icon + '</span>' + it.label + '</button>';
      }).join('');

    /* Position near the button */
    var rect = e.target.getBoundingClientRect();
    picker.style.top = (rect.top - items.length * 40 - 20) + 'px';
    picker.style.left = Math.max(8, rect.left) + 'px';
    /* Fallback: if off-screen top, show below */
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
        el.innerHTML = '<h4 contenteditable="true">Заголовок</h4><p contenteditable="true">Содержимое...</p>';
        break;
      case 'info':
        el = document.createElement('div');
        el.className = 'card card-info';
        el.innerHTML = '<h4 contenteditable="true">ℹ️ Информация</h4><p contenteditable="true">Содержимое...</p>';
        break;
      case 'warning':
        el = document.createElement('div');
        el.className = 'card card-warning';
        el.innerHTML = '<h4 contenteditable="true">⚠️ Внимание</h4><p contenteditable="true">Содержимое...</p>';
        break;
      case 'template':
        el = document.createElement('div');
        el.className = 'msg-template';
        el.contentEditable = 'true';
        el.innerHTML = '<button class="copy-btn" onclick="copyTemplate(this)" contenteditable="false">📋 Копировать</button>Текст шаблона...<br>Вторая строка...<br>';
        break;
      case 'table':
        el = document.createElement('div');
        el.style.overflowX = 'auto';
        el.innerHTML =
          '<table><thead><tr>' +
          '<th contenteditable="true">Столбец 1</th><th contenteditable="true">Столбец 2</th><th contenteditable="true">Столбец 3</th>' +
          '</tr></thead><tbody><tr>' +
          '<td contenteditable="true">—</td><td contenteditable="true">—</td><td contenteditable="true">—</td>' +
          '</tr></tbody></table>';
        break;
      case 'collapsible':
        /* Create header + content pair */
        var header = document.createElement('div');
        header.className = 'collapsible';
        header.setAttribute('onclick', 'toggleCollapse(this)');
        header.textContent = '📌 Заголовок раскрывающегося блока';
        var content = document.createElement('div');
        content.className = 'collapsible-content show';
        content.innerHTML = '<p contenteditable="true">Содержимое...</p>';

        var addBtn = section.querySelector('.le-add-blk');
        if (addBtn) {
          section.insertBefore(header, addBtn);
          section.insertBefore(content, addBtn);
        } else {
          section.appendChild(header);
          section.appendChild(content);
        }
        addBlockControls(section);
        if (!section.classList.contains('le-on')) startEdit(section);
        return; /* Already inserted */
      case 'ol':
        el = document.createElement('ol');
        el.innerHTML = '<li contenteditable="true">Пункт 1</li><li contenteditable="true">Пункт 2</li><li contenteditable="true">Пункт 3</li>';
        break;
      case 'ul':
        el = document.createElement('ul');
        el.innerHTML = '<li contenteditable="true">Пункт 1</li><li contenteditable="true">Пункт 2</li><li contenteditable="true">Пункт 3</li>';
        break;
      default: /* text */
        el = document.createElement('p');
        el.contentEditable = 'true';
        el.textContent = 'Новый текст — кликните для редактирования...';
    }

    if (!el) return;

    var addBtn = section.querySelector('.le-add-blk');
    if (addBtn) section.insertBefore(el, addBtn);
    else section.appendChild(el);

    addBlockControls(section);
    if (!section.classList.contains('le-on')) startEdit(section);

    var editable = el.querySelector('[contenteditable="true"]') || el;
    if (editable.contentEditable === 'true') editable.focus();
  }

  /* ============================================================
     TOGGLE SECTION EDITING
     ============================================================ */
  function toggleEdit(section) {
    if (section.classList.contains('le-on')) {
      finishEdit(section);
    } else {
      startEdit(section);
    }
  }

  function startEdit(section) {
    document.querySelectorAll('.section.le-on').forEach(function (s) {
      if (s !== section) finishEdit(s);
    });

    section.classList.add('le-on');

    /* Make all text elements editable */
    var sel = 'h2,h3,h4,p,li,td,th,blockquote,figcaption,dt,dd';
    section.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.le-sec-ctrl,.le-add-blk,.le-bar,.le-fmt,.le-nav-ctrl,.le-blk-ctrl,.le-add-sec,.le-picker,.copy-btn')) return;
      el.contentEditable = 'true';
    });

    /* Also make msg-template divs editable (the text inside them) */
    section.querySelectorAll('.msg-template').forEach(function (tmpl) {
      tmpl.contentEditable = 'true';
      /* Keep copy button non-editable */
      tmpl.querySelectorAll('.copy-btn').forEach(function (btn) { btn.contentEditable = 'false'; });
    });

    /* Collapsible headers */
    section.querySelectorAll('.collapsible').forEach(function (col) {
      col.contentEditable = 'true';
      /* Disable onclick toggle while editing */
      col.removeAttribute('onclick');
      col.dataset.leOldOnclick = 'toggleCollapse(this)';
    });

    section.classList.add('active');

    var btn = section.querySelector('.le-btn-edit');
    if (btn) btn.textContent = '✅';
  }

  function finishEdit(section) {
    section.classList.remove('le-on');
    section.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });

    /* Restore collapsible onclick */
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
    var headingText = heading.textContent.trim();
    var cleanText = headingText.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]+\s*/u, '');
    if (!cleanText) cleanText = headingText;

    var iconHtml = iconSpan ? iconSpan.outerHTML : '';
    var navCtrl = navLink.querySelector('.le-nav-ctrl');
    var navCtrlHtml = navCtrl ? navCtrl.outerHTML : '';
    navLink.innerHTML = iconHtml + ' ' + cleanText + navCtrlHtml;

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
      var dashNav = document.querySelector('.sidebar nav a[data-section="dashboard"]');
      if (dashNav) {
        document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
        dashNav.classList.add('active');
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

    /* Create nav link in sidebar */
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
     SIDEBAR: ↑↓🗑️ controls on each nav link
     ============================================================ */
  var navEl = document.querySelector('.sidebar nav');

  navEl.querySelectorAll('a[data-section]').forEach(function (link) {
    link.style.position = 'relative';
    appendNavControls(link);
  });

  /* ➕ Add Section at the bottom */
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
      '<button class="le-nav-b le-nav-del" data-d="del" title="Удалить раздел">✕</button>';
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
        var dir = nb.dataset.d;
        if (dir === 'del') {
          /* Delete section from sidebar */
          var sectionId = link.dataset.section;
          var section = document.getElementById('sec-' + sectionId);
          var title = section?.querySelector('h2')?.textContent || sectionId;
          if (confirm('Удалить раздел «' + title.substring(0, 60) + '»?')) {
            if (section) section.remove();
            link.remove();
            /* Show dashboard */
            var dash = document.getElementById('sec-dashboard');
            if (dash) {
              document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
              dash.classList.add('active');
              var dashNav = document.querySelector('.sidebar nav a[data-section="dashboard"]');
              if (dashNav) {
                document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
                dashNav.classList.add('active');
              }
            }
          }
        } else {
          moveSection(link, dir);
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
          var prevSec = document.getElementById('sec-' + prev.dataset.section);
          if (prevSec) section.parentNode.insertBefore(section, prevSec);
        }
      }
    } else {
      var next = navLink.nextElementSibling;
      while (next && next.tagName !== 'A') next = next.nextElementSibling;
      if (next) {
        navLink.parentNode.insertBefore(next, navLink);
        if (section) {
          var nextSec = document.getElementById('sec-' + next.dataset.section);
          if (nextSec) nextSec.parentNode.insertBefore(nextSec, section);
        }
      }
    }
  }

  /* ============================================================
     NAVIGATE TO SECTION
     ============================================================ */
  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
    var sec = document.getElementById('sec-' + sectionId);
    if (sec) sec.classList.add('active');
    var link = document.querySelector('.sidebar nav a[data-section="' + sectionId + '"]');
    if (link) link.classList.add('active');
  }

  /* ============================================================
     CLEANUP & GET HTML
     ============================================================ */
  function cleanupAndGetHtml() {
    document.querySelectorAll('.section.le-on').forEach(function (s) { finishEdit(s); });

    var selectors = '.le-bar,.le-fmt,.le-sec-ctrl,.le-add-blk,.le-nav-ctrl,.le-add-sec,.le-blk-ctrl,.le-picker';
    document.querySelectorAll(selectors).forEach(function (el) { el.remove(); });
    document.getElementById('le-css')?.remove();

    document.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });

    /* Remove all le- data attributes */
    document.querySelectorAll('[data-le-old-onclick]').forEach(function (el) {
      el.setAttribute('onclick', el.dataset.leOldOnclick);
      delete el.dataset.leOldOnclick;
    });

    document.body.classList.remove('le-active');
    document.querySelectorAll('.le-on').forEach(function (el) { el.classList.remove('le-on'); });
    document.body.style.paddingTop = '';

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
