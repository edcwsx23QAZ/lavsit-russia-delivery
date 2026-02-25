/**
 * Lavsit Instruction — Inline Edit Mode
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
  const css = document.createElement('style');
  css.id = 'le-css';
  css.textContent = `
    /* ── Top Toolbar ── */
    .le-bar{position:fixed;top:0;left:0;right:0;height:54px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;display:flex;align-items:center;padding:0 20px;gap:14px;z-index:100000;box-shadow:0 4px 20px rgba(0,0,0,.35);font-family:'Segoe UI',sans-serif}
    .le-bar-label{font-size:14px;font-weight:600;opacity:.92;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .le-bar button{padding:8px 20px;border:none;border-radius:7px;cursor:pointer;font-weight:700;font-size:13px;transition:all .15s;white-space:nowrap}
    .le-bar .le-save{background:#00b894;color:#fff}
    .le-bar .le-save:hover{background:#00a07a}
    .le-bar .le-cancel{background:rgba(255,255,255,.13);color:#fff;border:1px solid rgba(255,255,255,.22)!important}
    .le-bar .le-cancel:hover{background:rgba(255,255,255,.22)}

    /* Offset page for toolbar */
    body.le-active{padding-top:54px!important}
    body.le-active .sidebar{top:54px!important;height:calc(100vh - 54px)!important}

    /* ── Section hover / edit state ── */
    body.le-active .section{position:relative!important;transition:box-shadow .2s,outline .2s}
    body.le-active .section:hover{box-shadow:0 0 0 2px rgba(233,69,96,.35);border-radius:8px}
    body.le-active .section.le-on{outline:2.5px solid #e94560;outline-offset:4px;border-radius:8px}

    /* ── Section controls (top-right) ── */
    .le-sec-ctrl{position:absolute;top:6px;right:6px;display:none;gap:5px;z-index:1000}
    body.le-active .section:hover .le-sec-ctrl,
    body.le-active .section.le-on .le-sec-ctrl{display:flex}
    .le-btn{width:34px;height:34px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .12s}
    .le-btn:hover{transform:scale(1.12)}
    .le-btn-edit{background:#e94560;color:#fff}
    .le-btn-del{background:#d63031;color:#fff}

    /* ── Contenteditable styling ── */
    body.le-active .le-on [contenteditable="true"]{
      outline:none;background:rgba(233,69,96,.04);border-radius:4px;padding:2px 6px;min-height:1.4em;transition:background .12s;cursor:text
    }
    body.le-active .le-on [contenteditable="true"]:hover{background:rgba(233,69,96,.07)}
    body.le-active .le-on [contenteditable="true"]:focus{background:rgba(233,69,96,.09);box-shadow:inset 0 0 0 2px rgba(233,69,96,.2)}

    /* ── Floating format bar ── */
    .le-fmt{position:fixed;display:none;background:#1a1a2e;border-radius:8px;padding:5px;gap:2px;z-index:100001;box-shadow:0 6px 20px rgba(0,0,0,.35)}
    .le-fmt.le-vis{display:flex}
    .le-fmt button{width:30px;height:30px;border:none;background:0 0;color:#fff;border-radius:5px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:background .1s}
    .le-fmt button:hover{background:rgba(255,255,255,.16)}
    .le-fmt .le-sep{width:1px;margin:4px 3px;background:rgba(255,255,255,.18)}

    /* ── Sidebar: reorder & add ── */
    body.le-active .sidebar nav a{position:relative!important}
    .le-nav-ctrl{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:none;gap:2px;z-index:10}
    body.le-active .sidebar nav a:hover .le-nav-ctrl{display:flex}
    .le-nav-b{width:22px;height:22px;border:none;background:rgba(255,255,255,.14);color:#fff;border-radius:4px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center}
    .le-nav-b:hover{background:rgba(255,255,255,.28)}
    .le-add-sec{display:block;width:calc(100% - 24px);margin:14px 12px;padding:14px;background:rgba(233,69,96,.12);border:2px dashed rgba(233,69,96,.45);border-radius:8px;color:#ff6b81;font-size:14px;font-weight:700;cursor:pointer;text-align:center;transition:all .15s}
    .le-add-sec:hover{background:rgba(233,69,96,.22);border-color:#e94560}

    /* ── Add block inside section ── */
    .le-add-blk{display:block;width:100%;margin:14px 0 0;padding:10px;background:rgba(233,69,96,.05);border:2px dashed rgba(233,69,96,.25);border-radius:8px;color:#e94560;font-size:13px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}
    .le-add-blk:hover{background:rgba(233,69,96,.12)}

    /* ── Block delete button (cards, tables, etc.) ── */
    .le-blk-del{position:absolute;top:-8px;right:-8px;width:24px;height:24px;border:none;border-radius:50%;background:#d63031;color:#fff;font-size:12px;cursor:pointer;display:none;align-items:center;justify-content:center;z-index:10;box-shadow:0 2px 6px rgba(0,0,0,.2)}
    .le-on .card:hover .le-blk-del,
    .le-on table:hover .le-blk-del,
    .le-on .info-box:hover .le-blk-del,
    .le-on .warning-box:hover .le-blk-del{display:flex}
    .le-on .card,.le-on table,.le-on .info-box,.le-on .warning-box{position:relative}
  `;
  document.head.appendChild(css);
  document.body.classList.add('le-active');

  /* ============================================================
     TOP TOOLBAR
     ============================================================ */
  const bar = document.createElement('div');
  bar.className = 'le-bar';
  bar.innerHTML = `
    <div class="le-bar-label">✏️ Режим редактирования — кликните ✏️ на любом разделе, затем кликайте на текст для правки</div>
    <button class="le-save">💾 Сохранить</button>
    <button class="le-cancel">✕ Отмена</button>
  `;
  document.body.prepend(bar);

  /* ============================================================
     FLOATING FORMAT BAR
     ============================================================ */
  const fmt = document.createElement('div');
  fmt.className = 'le-fmt';
  fmt.innerHTML = `
    <button title="Жирный (Ctrl+B)" data-c="bold"><b>Ж</b></button>
    <button title="Курсив (Ctrl+I)" data-c="italic"><i>К</i></button>
    <button title="Подчёркнутый" data-c="underline"><u>П</u></button>
    <div class="le-sep"></div>
    <button title="Ссылка" data-c="link">🔗</button>
    <button title="Убрать ссылку" data-c="unlink">✂️</button>
    <div class="le-sep"></div>
    <button title="Маркированный список" data-c="insertUnorderedList">•</button>
    <button title="Нумерованный список" data-c="insertOrderedList">1.</button>
  `;
  document.body.appendChild(fmt);

  fmt.querySelectorAll('button[data-c]').forEach(function (b) {
    b.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var c = b.dataset.c;
      if (c === 'link') {
        var url = prompt('Введите URL ссылки:');
        if (url) document.execCommand('createLink', false, url);
      } else if (c === 'unlink') {
        document.execCommand('unlink');
      } else {
        document.execCommand(c);
      }
    });
  });

  /* Show format bar on text selection inside editable elements */
  var fmtTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(fmtTimer);
    fmtTimer = setTimeout(updateFormatBar, 80);
  });

  function updateFormatBar() {
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
  }

  /* Hide format bar on click outside */
  document.addEventListener('mousedown', function (e) {
    if (!fmt.contains(e.target)) fmt.classList.remove('le-vis');
  });

  /* ============================================================
     SECTION CONTROLS
     ============================================================ */
  document.querySelectorAll('.section').forEach(initSection);

  function initSection(section) {
    /* Control buttons */
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
      var title = section.querySelector('h2,h3')?.textContent || 'этот раздел';
      if (confirm('Удалить раздел «' + title.substring(0, 60) + '»?')) deleteSection(section);
    });

    /* Add-block button at bottom */
    var ab = document.createElement('button');
    ab.className = 'le-add-blk';
    ab.textContent = '➕ Добавить блок';
    ab.addEventListener('click', function () { addBlock(section); });
    section.appendChild(ab);

    /* Delete buttons on inner cards/blocks */
    addBlockDeleteButtons(section);
  }

  function addBlockDeleteButtons(section) {
    section.querySelectorAll('.card, table, .info-box, .warning-box').forEach(function (block) {
      if (block.querySelector('.le-blk-del')) return; // already has one
      var del = document.createElement('button');
      del.className = 'le-blk-del';
      del.title = 'Удалить блок';
      del.textContent = '✕';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Удалить этот блок?')) block.remove();
      });
      block.appendChild(del);
    });
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
    /* Close others */
    document.querySelectorAll('.section.le-on').forEach(function (s) {
      if (s !== section) finishEdit(s);
    });

    section.classList.add('le-on');

    /* Make elements editable */
    var sel = 'h2,h3,h4,p,li,td,th,blockquote,figcaption,dt,dd';
    section.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.le-sec-ctrl,.le-add-blk,.le-bar,.le-fmt,.le-nav-ctrl,.le-blk-del,.le-add-sec')) return;
      el.contentEditable = 'true';
    });

    /* Make sure section is visible */
    section.classList.add('active');

    /* Update edit button icon */
    var btn = section.querySelector('.le-btn-edit');
    if (btn) btn.textContent = '✅';
  }

  function finishEdit(section) {
    section.classList.remove('le-on');
    section.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });

    var btn = section.querySelector('.le-btn-edit');
    if (btn) btn.textContent = '✏️';

    /* Sync sidebar label if heading changed */
    syncSidebarLabel(section);
  }

  function syncSidebarLabel(section) {
    var sectionId = section.id.replace('sec-', '');
    var heading = section.querySelector('h2');
    if (!heading) return;

    var navLink = document.querySelector('.sidebar nav a[data-section="' + sectionId + '"]');
    if (!navLink) return;

    /* Keep the icon span, replace text */
    var iconSpan = navLink.querySelector('.icon');
    var headingText = heading.textContent.trim();
    /* Remove emoji prefix from heading if present (first 1-3 chars may be emoji) */
    var cleanText = headingText.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]+\s*/u, '');
    if (!cleanText) cleanText = headingText;

    /* Rebuild link innerHTML */
    var iconHtml = iconSpan ? iconSpan.outerHTML : '';
    /* Remove le-nav-ctrl before rebuilding */
    var navCtrl = navLink.querySelector('.le-nav-ctrl');
    var navCtrlHtml = navCtrl ? navCtrl.outerHTML : '';
    navLink.innerHTML = iconHtml + ' ' + cleanText + navCtrlHtml;

    /* Re-attach nav control events */
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

  /* ============================================================
     ADD NEW SECTION
     ============================================================ */
  function addNewSection() {
    var id = 'new-' + Date.now();

    /* Create section element */
    var section = document.createElement('div');
    section.className = 'section active';
    section.id = 'sec-' + id;
    section.innerHTML =
      '<h2 contenteditable="true">📌 Новый раздел</h2>' +
      '<div class="card"><p contenteditable="true">Нажмите здесь, чтобы добавить содержимое...</p></div>';

    /* Hide all sections, show new one */
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });

    /* Insert into main */
    var main = document.querySelector('.main');
    main.appendChild(section);

    /* Initialize section controls */
    initSection(section);

    /* Create nav link */
    var nav = document.querySelector('.sidebar nav');
    var addBtn = nav.querySelector('.le-add-sec');
    var link = document.createElement('a');
    link.href = '#';
    link.dataset.section = id;
    link.innerHTML = '<span class="icon">📌</span> Новый раздел';
    link.style.position = 'relative';

    /* Add nav reorder controls */
    appendNavControls(link);

    /* Add click handler */
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showSection(id);
    });

    /* Activate in sidebar */
    document.querySelectorAll('.sidebar nav a').forEach(function (a) { a.classList.remove('active'); });
    link.classList.add('active');

    if (addBtn) nav.insertBefore(link, addBtn);
    else nav.appendChild(link);

    /* Auto-start editing and focus heading */
    startEdit(section);
    var h2 = section.querySelector('h2');
    if (h2) {
      h2.focus();
      /* Select all text for easy replacement */
      var range = document.createRange();
      range.selectNodeContents(h2);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /* ============================================================
     ADD BLOCK INSIDE SECTION
     ============================================================ */
  function addBlock(section) {
    var choice = prompt(
      'Выберите тип блока:\n' +
      '1 — Текстовый абзац\n' +
      '2 — Карточка (с заголовком)\n' +
      '3 — Инфо-блок (ℹ️)\n' +
      '4 — Предупреждение (⚠️)\n' +
      '5 — Таблица',
      '1'
    );

    var el;
    switch (choice) {
      case '2':
        el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = '<h4 contenteditable="true">Заголовок карточки</h4><p contenteditable="true">Содержимое...</p>';
        break;
      case '3':
        el = document.createElement('div');
        el.className = 'card card-info';
        el.innerHTML = '<h4 contenteditable="true">ℹ️ Информация</h4><p contenteditable="true">Содержимое...</p>';
        break;
      case '4':
        el = document.createElement('div');
        el.className = 'card card-warning';
        el.innerHTML = '<h4 contenteditable="true">⚠️ Внимание</h4><p contenteditable="true">Содержимое...</p>';
        break;
      case '5':
        el = document.createElement('div');
        el.style.overflowX = 'auto';
        el.innerHTML =
          '<table><thead><tr>' +
          '<th contenteditable="true">Столбец 1</th><th contenteditable="true">Столбец 2</th><th contenteditable="true">Столбец 3</th>' +
          '</tr></thead><tbody><tr>' +
          '<td contenteditable="true">—</td><td contenteditable="true">—</td><td contenteditable="true">—</td>' +
          '</tr></tbody></table>';
        break;
      default:
        el = document.createElement('p');
        el.contentEditable = 'true';
        el.textContent = 'Новый текст — кликните для редактирования...';
    }

    if (!el) return;

    /* Insert before the add-block button */
    var addBtn = section.querySelector('.le-add-blk');
    if (addBtn) section.insertBefore(el, addBtn);
    else section.appendChild(el);

    /* Add delete button if it's a card/table */
    addBlockDeleteButtons(section);

    /* Make sure section is in edit mode */
    if (!section.classList.contains('le-on')) startEdit(section);

    /* Focus first editable */
    var editable = el.querySelector('[contenteditable="true"]') || el;
    if (editable.contentEditable === 'true') editable.focus();
  }

  /* ============================================================
     SIDEBAR: REORDER CONTROLS
     ============================================================ */
  var nav = document.querySelector('.sidebar nav');

  nav.querySelectorAll('a[data-section]').forEach(function (link) {
    link.style.position = 'relative';
    appendNavControls(link);
  });

  /* Add Section button at the bottom of sidebar */
  var addSecBtn = document.createElement('button');
  addSecBtn.className = 'le-add-sec';
  addSecBtn.textContent = '➕ Добавить раздел';
  addSecBtn.addEventListener('click', addNewSection);
  nav.appendChild(addSecBtn);

  function appendNavControls(link) {
    var ctrl = document.createElement('div');
    ctrl.className = 'le-nav-ctrl';
    ctrl.innerHTML =
      '<button class="le-nav-b" data-d="up" title="Переместить вверх">↑</button>' +
      '<button class="le-nav-b" data-d="down" title="Переместить вниз">↓</button>';
    link.appendChild(ctrl);
    reattachNavCtrlEvents(link);
  }

  function reattachNavCtrlEvents(link) {
    link.querySelectorAll('.le-nav-b').forEach(function (b) {
      /* Remove old listeners by cloning */
      var nb = b.cloneNode(true);
      b.parentNode.replaceChild(nb, b);
      nb.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        moveSection(link, nb.dataset.d);
      });
    });
  }

  function moveSection(navLink, dir) {
    var sectionId = navLink.dataset.section;
    var section = document.getElementById('sec-' + sectionId);

    if (dir === 'up') {
      /* Find previous <a> sibling (skip nav-group-titles) */
      var prev = navLink.previousElementSibling;
      while (prev && prev.tagName !== 'A') prev = prev.previousElementSibling;
      if (prev) {
        navLink.parentNode.insertBefore(navLink, prev);
        /* Move section in DOM too */
        if (section) {
          var prevSecId = prev.dataset.section;
          var prevSection = document.getElementById('sec-' + prevSecId);
          if (prevSection) section.parentNode.insertBefore(section, prevSection);
        }
      }
    } else {
      var next = navLink.nextElementSibling;
      while (next && next.tagName !== 'A') next = next.nextElementSibling;
      if (next) {
        navLink.parentNode.insertBefore(next, navLink);
        if (section) {
          var nextSecId = next.dataset.section;
          var nextSection = document.getElementById('sec-' + nextSecId);
          if (nextSection) nextSection.parentNode.insertBefore(nextSection, section);
        }
      }
    }
  }

  /* ============================================================
     NAVIGATE TO SECTION (for dynamically created links)
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
    /* Finish all active edits */
    document.querySelectorAll('.section.le-on').forEach(function (s) { finishEdit(s); });

    /* Remove all editing artifacts */
    var selectors = '.le-bar,.le-fmt,.le-sec-ctrl,.le-add-blk,.le-nav-ctrl,.le-add-sec,.le-blk-del';
    document.querySelectorAll(selectors).forEach(function (el) { el.remove(); });
    document.getElementById('le-css')?.remove();

    /* Remove contenteditable attributes */
    document.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });

    /* Remove editing classes */
    document.body.classList.remove('le-active');
    document.querySelectorAll('.le-on').forEach(function (el) { el.classList.remove('le-on'); });

    /* Remove padding override */
    document.body.style.paddingTop = '';

    /* Remove the script tag itself */
    var scriptTag = document.getElementById('le-script');
    if (scriptTag) scriptTag.remove();

    return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  }

  /* ============================================================
     SAVE / CANCEL HANDLERS
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
    /* Ctrl+S → Save */
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      bar.querySelector('.le-save').click();
    }
    /* Escape → Cancel */
    if (e.key === 'Escape') {
      /* If a section is being edited, just close it */
      var active = document.querySelector('.section.le-on');
      if (active) {
        finishEdit(active);
      }
    }
  });

})();

