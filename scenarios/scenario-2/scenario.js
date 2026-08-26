(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const workspace = document.querySelector('.workspace');
  const split = document.getElementById('content-split');
  const verticalResizer = document.getElementById('vertical-resizer');
  const horizontalResizer = document.getElementById('horizontal-resizer');
  const editorTabs = [...document.querySelectorAll('[data-editor-tab]')];
  const documentRows = [...document.querySelectorAll('[data-tree-document]')];
  const messageTabs = [...document.querySelectorAll('[data-message-tab]')];
  const table = document.querySelector('[data-active-message-table]');
  const compileButton = document.querySelector('[data-action="compile"]');
  const consolePanelButton = document.querySelector('[data-panel="console"]');
  const messagesPanelButton = document.querySelector('[data-panel="messages"]');
  const messageTabsContainer = document.querySelector('[data-message-tabs]');
  const consoleTab = document.querySelector('[data-console-tab]');
  const messageView = document.querySelector('[data-message-view]');
  const consoleView = document.querySelector('[data-console-view]');
  const statusbarBuild = document.getElementById('statusbar-build');
  const statusbarLabel = document.getElementById('statusbar-label');
  const statusbarProgress = document.getElementById('statusbar-progress-value');
  const computeIdentifiers = [...document.querySelectorAll('[data-compute-identifier]')];

  const PRESS_DELAY_MS = 800;
  const RUNNING_DELAY_MS = 3200;
  const RUNNING_CONSOLE_LINES = [
    'Запущена генерация кода',
    'Журнал сообщений - создан',
    'Генерация файлов',
    'NEED YOGI implementation:Please, Build this target with fort stageII',
    'Генерация исходных текстов завершена',
    'executing `C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --',
    'crate-name sys_prg code\\HardwareSpecific\\function.st code\\headers\\libc.sth',
    'warning: 2 hidden warnings emitted',
    'to show hidden diagnostics rerun with `--verbose` flag',
    'executing `C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --crate-name plc_prg fort\\main\\..\\..\\code\\main.st`'
  ];
  const FAILED_CONSOLE_LINES = [
    ...RUNNING_CONSOLE_LINES,
    'error: failed to resolve: could not find value `b`',
    '--> C:\\Users\\t.yashina\\Documents\\Alta\\Project_9\\POU\\programm_1.st:5:1',
    '| 5 | b:=a;',
    '|   | ^ could not find value `b`',
    'error: unresolved error: cannot write to a unresolved item',
    '--> C:\\Users\\t.yashina\\Documents\\Alta\\Project_9\\POU\\programm_1.st:5:1',
    '| 5 | b:=a;',
    '|   | ^ cannot write to a unresolved item',
    'error: aborting due to 3 previous errors; 2 hidden warnings emitted',
    'error: process exited with error (exit code: 1)'
  ];

  const scenario = { state: 'initial', sequence: 0, starts: 0, timers: [] };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const cssPixels = name => parseFloat(getComputedStyle(root).getPropertyValue(name));

  function setState(state) {
    scenario.state = state;
    root.dataset.scenarioStep = state;
  }

  function setCompileVisual(state, disabled) {
    compileButton.dataset.state = state;
    compileButton.setAttribute('aria-pressed', String(state !== 'default'));
    if (disabled) compileButton.setAttribute('aria-disabled', 'true');
    else compileButton.removeAttribute('aria-disabled');
  }

  function showConsole(lines) {
    messageTabsContainer.hidden = true;
    consoleTab.hidden = false;
    messageView.hidden = true;
    consoleView.hidden = false;
    consoleView.textContent = lines.join('\n');
    consoleView.scrollTop = 0;
    consolePanelButton.classList.add('is-active');
    messagesPanelButton.classList.remove('is-active');
  }

  function setBuilding(active) {
    statusbarBuild.hidden = !active;
    statusbarLabel.textContent = active ? 'Сборка проекта' : '';
    statusbarProgress.style.width = active ? '40%' : '0';
  }

  function setConflictMarkers(active) {
    documentRows.forEach(row => row.classList.toggle('has-diagnostic', active));
    computeIdentifiers.forEach(identifier => identifier.classList.toggle('has-diagnostic', active));
    messagesPanelButton.classList.toggle('has-notification', active);
  }

  function enterCompiling(sequence) {
    if (sequence !== scenario.sequence || scenario.state !== 'compile-pressed') return;
    setState('compiling');
    setCompileVisual('active', true);
    setConflictMarkers(true);
    showConsole(RUNNING_CONSOLE_LINES);
    setBuilding(true);
    scenario.timers.push(window.setTimeout(() => enterCompileFailed(sequence), RUNNING_DELAY_MS));
  }

  function enterCompileFailed(sequence) {
    if (sequence !== scenario.sequence || scenario.state !== 'compiling') return;
    setState('compile-failed');
    setCompileVisual('default', true);
    setConflictMarkers(true);
    showConsole(FAILED_CONSOLE_LINES);
    setBuilding(false);
    scenario.timers = [];
  }

  function startCompilation() {
    if (scenario.state !== 'initial') return;
    scenario.starts += 1;
    root.dataset.compileStarts = String(scenario.starts);
    scenario.sequence += 1;
    const sequence = scenario.sequence;
    setState('compile-pressed');
    setCompileVisual('pressed', true);
    scenario.timers.push(window.setTimeout(() => enterCompiling(sequence), PRESS_DELAY_MS));
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

  const lines = document.querySelector('.code-lines');
  lines.replaceChildren(...Array.from({ length: 40 }, (_, index) => {
    const line = document.createElement('span');
    line.textContent = String(index + 1);
    return line;
  }));

  editorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      editorTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      documentRows.forEach(row => {
        const active = row.dataset.treeDocument === tab.dataset.editorTab;
        row.classList.toggle('is-selected', active);
        if (active) row.setAttribute('aria-selected', 'true');
        else row.removeAttribute('aria-selected');
      });
    });
  });

  messageTabs.forEach(tab => {
    tab.addEventListener('click', event => {
      messageTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      table.dataset.activeMessageTable = tab.dataset.messageTab;
      if (event.detail > 0) tab.blur();
    });
  });

  compileButton.addEventListener('click', event => {
    startCompilation();
    if (event.detail > 0) compileButton.blur();
  });

  window.addEventListener('resize', () => {
    setSidebarWidth(cssPixels('--sidebar-width'));
    setBottomHeight(cssPixels('--bottom-panel-height'));
  });

  root.dataset.compileStarts = '0';
  setState('initial');
  setCompileVisual('default', false);
  setConflictMarkers(false);
  setBuilding(false);
  setSidebarWidth(248);
  setBottomHeight(228);
})();
