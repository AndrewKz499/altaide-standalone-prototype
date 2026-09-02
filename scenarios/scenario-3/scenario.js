(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const workspace = document.querySelector('.workspace');
  const split = document.getElementById('content-split');
  const verticalResizer = document.getElementById('vertical-resizer');
  const horizontalResizer = document.getElementById('horizontal-resizer');
  const sourceCode = document.querySelector('[data-source-code]');
  const editorTabs = [...document.querySelectorAll('[data-editor-tab]')];
  const treeDocuments = [...document.querySelectorAll('[data-tree-document]')];
  const compileButton = document.querySelector('[data-action="compile"]');
  const consolePanelButton = document.querySelector('[data-panel="console"]');
  const buildPanelButton = document.querySelector('[data-panel="build"]');
  const buildEmpty = document.querySelector('[data-build-empty]');
  const consoleView = document.querySelector('[data-console-view]');
  const statusbarBuild = document.getElementById('statusbar-build');
  const statusbarLabel = document.getElementById('statusbar-label');
  const statusbarProgress = document.getElementById('statusbar-progress-value');

  const PRESS_DELAY_MS = 800;
  const RUNNING_CONSOLE_LINES = [
    'Запущена генерация кода',
    'Журнал сообщений - создан',
    'Генерация файлов',
    'NEED YOGI implementation:Please, Build this target with fort stageII',
    'Генерация исходных текстов завершена',
    'executing \`C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --',
    'crate-name sys_prg code\\HardwareSpecific\\function.st code\\headers\\libc.sth',
    'warning: 2 hidden warnings emitted',
    'to show hidden diagnostics rerun with \`--verbose\` flag',
    'executing \`C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --crate-name plc_prg fort\\main\\..\\..\\code\\main.st\`'
  ];

  const sourceDocuments = {
    'compute-a': {
      source: `FUNCTION compute : DINT

END_FUNCTION`
    },
    'compute-b': {
      source: `FUNCTION compute : DINT
VAR_INPUT
  t : INT;
END_VAR
  compute := t * 2;
END_FUNCTION`
    }
  };

  let activeDocument = 'compute-b';
  const scenario = {
    state: 'initial',
    sequence: 0,
    starts: 0,
    pressTimer: null
  };

  function setState(state) {
    scenario.state = state;
    root.dataset.scenarioStep = state;
  }

  function setCompileVisual(state, disabled) {
    compileButton.dataset.state = state;
    compileButton.disabled = disabled;
    compileButton.setAttribute('aria-disabled', String(disabled));
    compileButton.setAttribute('aria-pressed', String(state !== 'default'));
  }

  function showConsole(lines) {
    consolePanelButton.classList.add('is-active');
    consolePanelButton.removeAttribute('aria-disabled');
    consolePanelButton.setAttribute('aria-current', 'page');
    buildPanelButton.classList.remove('is-active');
    buildPanelButton.removeAttribute('aria-current');
    buildEmpty.hidden = true;
    consoleView.hidden = false;
    consoleView.textContent = lines.join('\n');
    consoleView.scrollTop = 0;
  }

  function setBuilding(active) {
    statusbarBuild.hidden = !active;
    statusbarLabel.textContent = active ? 'Сборка проекта' : '';
    statusbarProgress.style.width = active ? '40%' : '0';
  }

  function enterCompiling(sequence) {
    if (sequence !== scenario.sequence || scenario.state !== 'compile-pressed') return;
    scenario.pressTimer = null;
    setState('compiling');
    setCompileVisual('active', true);
    showConsole(RUNNING_CONSOLE_LINES);
    setBuilding(true);
  }

  function startCompilation() {
    if (scenario.state !== 'initial' || scenario.pressTimer !== null) return;
    scenario.starts += 1;
    scenario.sequence += 1;
    root.dataset.compileStarts = String(scenario.starts);
    setState('compile-pressed');
    setCompileVisual('pressed', true);
    showConsole([]);
    setBuilding(false);

    const sequence = scenario.sequence;
    scenario.pressTimer = window.setTimeout(
      () => enterCompiling(sequence),
      PRESS_DELAY_MS
    );
  }

  function escapeHtml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function highlightSource(source) {
    const tokenPattern = /\b(FUNCTION|VAR_INPUT|END_VAR|END_FUNCTION)\b|\b(DINT|INT)\b|\b(compute|t)\b|(:=|:|;|\*)|\b(\d+)\b/g;
    return escapeHtml(source).replace(tokenPattern, (token, keyword, type, name, operator, number) => {
      if (keyword) return `<span class="kw">${token}</span>`;
      if (type) return `<span class="type">${token}</span>`;
      if (name) return `<span class="name">${token}</span>`;
      if (operator) return `<span class="op">${token}</span>`;
      if (number) return `<span class="num">${token}</span>`;
      return token;
    });
  }

  function renderDocument(documentId) {
    const sourceDocument = sourceDocuments[documentId];
    if (!sourceDocument) return;

    activeDocument = documentId;
    sourceCode.dataset.source = sourceDocument.source;
    sourceCode.innerHTML = highlightSource(sourceDocument.source);

    editorTabs.forEach(tab => {
      const isActive = tab.dataset.editorTab === documentId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    treeDocuments.forEach(row => {
      const isSelected = row.dataset.treeDocument === documentId;
      row.classList.toggle('is-selected', isSelected);
      if (isSelected) row.setAttribute('aria-selected', 'true');
      else row.removeAttribute('aria-selected');
    });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function cssPixels(property) {
    return Number.parseFloat(getComputedStyle(root).getPropertyValue(property)) || 0;
  }

  function setSidebarWidth(width) {
    const max = Math.min(420, workspace.clientWidth - 520);
    const next = clamp(width, 180, Math.max(180, max));
    root.style.setProperty('--sidebar-width', `${next}px`);
    verticalResizer.setAttribute('aria-valuenow', Math.round(next));
    verticalResizer.setAttribute('aria-valuemin', '180');
    verticalResizer.setAttribute('aria-valuemax', String(Math.round(Math.max(180, max))));
  }

  function setBottomHeight(height) {
    const max = Math.max(150, split.clientHeight - 170);
    const next = clamp(height, 150, max);
    root.style.setProperty('--bottom-panel-height', `${next}px`);
    horizontalResizer.setAttribute('aria-valuenow', Math.round(next));
    horizontalResizer.setAttribute('aria-valuemin', '150');
    horizontalResizer.setAttribute('aria-valuemax', String(Math.round(max)));
  }

  function beginDrag(event, axis) {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    let active = true;

    target.setPointerCapture(pointerId);
    body.classList.add('is-resizing', `is-resizing-${axis}`);

    const move = moveEvent => {
      if (axis === 'vertical') {
        const bounds = workspace.getBoundingClientRect();
        setSidebarWidth(moveEvent.clientX - bounds.left);
      } else {
        const bounds = split.getBoundingClientRect();
        setBottomHeight(bounds.bottom - moveEvent.clientY);
      }
    };

    const stop = () => {
      if (!active) return;
      active = false;
      body.classList.remove('is-resizing', `is-resizing-${axis}`);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
      target.removeEventListener('lostpointercapture', stop);
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
    target.addEventListener('lostpointercapture', stop);
  }

  document.querySelector('.code-lines').replaceChildren(...Array.from({ length: 40 }, (_, index) => {
    const line = document.createElement('span');
    line.textContent = String(index + 1);
    return line;
  }));

  editorTabs.forEach(tab => {
    tab.addEventListener('click', () => renderDocument(tab.dataset.editorTab));
  });

  treeDocuments.forEach(row => {
    row.addEventListener('click', () => renderDocument(row.dataset.treeDocument));
  });

  compileButton.addEventListener('click', startCompilation);

  verticalResizer.addEventListener('pointerdown', event => beginDrag(event, 'vertical'));
  horizontalResizer.addEventListener('pointerdown', event => beginDrag(event, 'horizontal'));

  verticalResizer.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const current = cssPixels('--sidebar-width');
    setSidebarWidth(event.key === 'Home' ? 248 : current + (event.key === 'ArrowRight' ? 10 : -10));
  });

  horizontalResizer.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const current = cssPixels('--bottom-panel-height');
    setBottomHeight(event.key === 'Home' ? 228 : current + (event.key === 'ArrowUp' ? 10 : -10));
  });

  setSidebarWidth(cssPixels('--sidebar-width'));
  setBottomHeight(cssPixels('--bottom-panel-height'));
  setState('initial');
  setCompileVisual('default', false);
  setBuilding(false);
  root.dataset.compileStarts = '0';
  renderDocument(activeDocument);
})();
