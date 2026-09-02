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
  const analyzerPanelButton = document.querySelector('[data-panel="analyzer"]');
  const buildPanelButton = document.querySelector('[data-panel="build"]');
  const panelTabs = document.querySelector('[data-panel-tabs]');
  const buildEmpty = document.querySelector('[data-build-empty]');
  const consoleView = document.querySelector('[data-console-view]');
  const buildResult = document.querySelector('[data-build-result]');
  const buildDiagnostics = document.querySelector('[data-build-diagnostics]');
  const buildPreview = document.querySelector('[data-build-preview]');
  const buildCounters = {
    error: document.querySelector('[data-build-counter="error"]'),
    warning: document.querySelector('[data-build-counter="warning"]'),
    info: document.querySelector('[data-build-counter="info"]')
  };
  const statusbarBuild = document.getElementById('statusbar-build');
  const statusbarLabel = document.getElementById('statusbar-label');
  const statusbarProgress = document.getElementById('statusbar-progress-value');

  const PRESS_DELAY_MS = 800;
  const RUNNING_DELAY_MS = 3200;
  const BUILD_1_TIMESTAMP = '23.06.2026 15:43';
  const BUILD_2_TIMESTAMP = '23.06.2026 15:55';
  const BUILD_3_TIMESTAMP = '23.06.2026 15:58';
  const CALCULATE_BODY_SOURCE = `FUNCTION calculate : DINT
VAR_INPUT

    t : INT;
END_VAR
    result := t * 5;
    calculate := result;
END_FUNCTION`;
  const ST001 = Object.freeze({
    code: 'ST001',
    description: "Переменная 'result' не объявлена.",
    locations: Object.freeze(['calculate.st:6', 'calculate.st:7']),
    documentId: 'compute-a'
  });
  const CMP101 = Object.freeze({
    code: 'CMP101',
    description: "Функция 'compute' определена несколько раз. Функция до...",
    locations: Object.freeze([
      Object.freeze({
        id: 'compute-b:1',
        documentId: 'compute-b',
        file: 'compute.st',
        line: ':1',
        previewPath: '.\\util\\src\\lib.st:9:1',
        kind: 'error'
      }),
      Object.freeze({
        id: 'compute-a:1',
        documentId: 'compute-a',
        file: 'compute.st',
        line: ':1',
        previewPath: '.\\test\\src\\main.st:8:1',
        kind: 'info',
        description: "Первый раз функция 'compute' определена здесь"
      })
    ])
  });
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
      name: 'compute',
      source: `FUNCTION compute : DINT

END_FUNCTION`
    },
    'compute-b': {
      name: 'compute',
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
    pressTimer: null,
    completionTimer: null,
    pendingBuildId: null,
    view: 'build',
    builds: [],
    activeBuildId: null,
    expandedDiagnosticId: null,
    selectedBuildDiagnosticLocation: null,
    revealedDiagnosticLocation: null,
    activeDocumentId: activeDocument,
    renameValid: false,
    bodyValid: false,
    dirty: false,
    resultDeclarationValid: false,
    liveAnalyzerDiagnostics: []
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
    const tab = document.createElement('button');
    tab.className = 'is-active';
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'true');
    const icon = document.createElement('img');
    icon.src = 'scenarios/scenario-3/build-console.svg';
    icon.alt = '';
    const label = document.createElement('span');
    label.textContent = 'Консоль';
    tab.append(icon, label);
    panelTabs.replaceChildren(tab);

    scenario.view = 'console';
    consolePanelButton.classList.add('is-active');
    consolePanelButton.removeAttribute('aria-disabled');
    consolePanelButton.setAttribute('aria-current', 'page');
    analyzerPanelButton.classList.remove('is-active');
    analyzerPanelButton.removeAttribute('aria-current');
    buildPanelButton.classList.remove('is-active');
    buildPanelButton.removeAttribute('aria-current');
    buildEmpty.hidden = true;
    buildResult.hidden = true;
    consoleView.hidden = false;
    consoleView.textContent = lines.join('\n');
    consoleView.scrollTop = 0;
  }

  function createFirstBuildSnapshot() {
    const existing = scenario.builds.find(snapshot => snapshot.id === 'build-1');
    if (existing) return existing;

    const sourceSnapshot = Object.freeze(Object.fromEntries(
      Object.entries(sourceDocuments).map(([id, documentData]) => [id, documentData.source])
    ));
    const snapshot = Object.freeze({
      id: 'build-1',
      timestamp: BUILD_1_TIMESTAMP,
      counters: Object.freeze({ error: 1, warning: 0, info: 1 }),
      diagnostics: Object.freeze([Object.freeze({ ...CMP101 })]),
      sourceSnapshot
    });
    scenario.builds.push(snapshot);
    updateBuildSnapshotState();
    return snapshot;
  }

  function createSecondBuildSnapshot() {
    const existing = scenario.builds.find(snapshot => snapshot.id === 'build-2');
    if (existing) return existing;

    const sourceSnapshot = Object.freeze(Object.fromEntries(
      Object.entries(sourceDocuments).map(([id, documentData]) => [id, documentData.source])
    ));
    const snapshot = Object.freeze({
      id: 'build-2',
      timestamp: BUILD_2_TIMESTAMP,
      counters: Object.freeze({ error: 0, warning: 0, info: 0 }),
      diagnostics: Object.freeze([]),
      sourceSnapshot
    });
    scenario.builds.push(snapshot);
    updateBuildSnapshotState();
    return snapshot;
  }

  function createThirdBuildSnapshot() {
    const existing = scenario.builds.find(snapshot => snapshot.id === 'build-3');
    if (existing) return existing;

    const sourceSnapshot = Object.freeze(Object.fromEntries(
      Object.entries(sourceDocuments).map(([id, documentData]) => [id, documentData.source])
    ));
    const snapshot = Object.freeze({
      id: 'build-3',
      timestamp: BUILD_3_TIMESTAMP,
      counters: Object.freeze({ error: 0, warning: 0, info: 0 }),
      diagnostics: Object.freeze([]),
      sourceSnapshot
    });
    scenario.builds.push(snapshot);
    updateBuildSnapshotState();
    return snapshot;
  }

  function updateBuildSnapshotState() {
    root.dataset.buildCount = String(scenario.builds.length);
    root.dataset.buildSnapshotFrozen = String(
      scenario.builds.every(snapshot => (
        Object.isFrozen(snapshot)
        && Object.isFrozen(snapshot.sourceSnapshot)
        && Object.isFrozen(snapshot.counters)
        && Object.isFrozen(snapshot.diagnostics)
        && snapshot.diagnostics.every(diagnostic => (
          Object.isFrozen(diagnostic)
          && Object.isFrozen(diagnostic.locations)
        ))
      ))
    );
  }

  function createBuildTab(snapshot, activeSnapshot) {
    const tab = document.createElement('button');
    const isActive = snapshot.id === activeSnapshot.id;
    tab.classList.toggle('is-active', isActive);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(isActive));
    tab.dataset.buildId = snapshot.id;
    const icon = document.createElement('img');
    icon.src = 'scenarios/scenario-3/build-console.svg';
    icon.alt = '';
    const label = document.createElement('span');
    label.textContent = `Сборка ${snapshot.timestamp}`;
    tab.append(icon, label);
    return tab;
  }

  function renderBuildTabs(activeSnapshot) {
    const tabs = [...scenario.builds]
      .reverse()
      .map(snapshot => createBuildTab(snapshot, activeSnapshot));
    panelTabs.replaceChildren(...tabs);
  }

  function renderBuildCounters(snapshot) {
    Object.entries(snapshot.counters).forEach(([key, value]) => {
      const counter = buildCounters[key];
      counter.querySelector('span').textContent = String(value);
      const labels = { error: 'Ошибки', warning: 'Предупреждения', info: 'Информация' };
      counter.setAttribute('aria-label', `${labels[key]}: ${value}`);
    });
  }

  function renderDiagnosticLocation(location) {
    const node = document.createElement('button');
    node.className = 'build-diagnostic-location';
    node.type = 'button';
    node.dataset.buildLocation = location.id;
    node.dataset.documentId = location.documentId;
    node.setAttribute('aria-label', `Открыть ${location.file}${location.line}`);
    if (scenario.revealedDiagnosticLocation === location.id) {
      node.setAttribute('aria-current', 'location');
    }
    node.textContent = location.file;
    const line = document.createElement('em');
    line.textContent = location.line;
    node.append(line);
    return node;
  }

  function renderDiagnosticRow(diagnostic, expanded) {
    const location = diagnostic.locations[0];
    const row = document.createElement('div');
    row.className = 'build-diagnostic-row is-selected';
    row.dataset.diagnosticCode = diagnostic.code;
    row.dataset.diagnosticToggle = diagnostic.code;
    row.dataset.expanded = String(expanded);
    row.setAttribute('aria-expanded', String(expanded));

    const leading = document.createElement('div');
    leading.className = 'build-diagnostic-leading';
    const disclosure = document.createElement('button');
    disclosure.className = 'build-diagnostic-disclosure';
    disclosure.type = 'button';
    disclosure.dataset.diagnosticDisclosure = diagnostic.code;
    disclosure.setAttribute('aria-label', `${diagnostic.code} ${expanded ? 'свёрнуть' : 'раскрыть'}`);
    disclosure.setAttribute('aria-expanded', String(expanded));
    const errorIcon = document.createElement('img');
    errorIcon.src = 'assets/icons/status-error.svg';
    errorIcon.alt = '';
    leading.append(disclosure, errorIcon);

    const code = document.createElement('span');
    code.className = 'build-diagnostic-code';
    code.textContent = diagnostic.code;
    const description = document.createElement('span');
    description.className = 'build-diagnostic-description';
    description.textContent = diagnostic.description;
    row.append(leading, code, description, renderDiagnosticLocation(location));
    return row;
  }

  function renderInformerRow(diagnostic, location) {
    const row = document.createElement('div');
    row.className = 'build-diagnostic-row build-diagnostic-informer';
    row.dataset.diagnosticCode = diagnostic.code;
    row.dataset.locationId = location.id;

    const leading = document.createElement('div');
    leading.className = 'build-diagnostic-leading';
    const spacer = document.createElement('span');
    spacer.className = 'build-diagnostic-spacer';
    const infoIcon = document.createElement('img');
    infoIcon.src = 'assets/icons/status-info.svg';
    infoIcon.alt = '';
    leading.append(spacer, infoIcon);

    const code = document.createElement('span');
    code.className = 'build-diagnostic-code';
    code.textContent = diagnostic.code;
    const description = document.createElement('span');
    description.className = 'build-diagnostic-description';
    description.textContent = location.description;

    row.append(leading, code, description, renderDiagnosticLocation(location));
    return row;
  }

  function renderBuildPreview(snapshot, diagnostic) {
    const location = diagnostic.locations.find(
      item => item.id === scenario.selectedBuildDiagnosticLocation
    );
    buildPreview.replaceChildren();
    buildPreview.classList.toggle('has-content', Boolean(location));

    if (!location) {
      buildPreview.setAttribute('aria-label', 'Предпросмотр кода пуст');
      buildPreview.removeAttribute('data-preview-document');
      return;
    }

    const snapshotSource = snapshot.sourceSnapshot[location.documentId];
    buildPreview.dataset.previewDocument = location.documentId;
    buildPreview.setAttribute('aria-label', `Предпросмотр ${location.file}${location.line}`);

    const output = document.createElement('div');
    output.className = 'build-preview-output';

    const message = document.createElement('div');
    message.className = 'build-preview-message';
    message.append('error: the name ');
    const symbol = document.createElement('code');
    symbol.textContent = '`compute`';
    message.append(symbol, ' is defined multiple times');

    const path = document.createElement('div');
    path.className = 'build-preview-path';
    path.textContent = `  → ${location.previewPath}`;
    output.append(message, path);

    const source = document.createElement('div');
    source.className = 'build-preview-source';
    snapshotSource.split('\n').forEach((sourceLine, index) => {
      const line = document.createElement('div');
      line.className = 'build-preview-source-line';
      if (index === 0) line.classList.add('has-conflict');
      const number = document.createElement('span');
      number.className = 'build-preview-line-number';
      number.textContent = String(index + 1);
      const marker = document.createElement('span');
      marker.className = 'build-preview-line-marker';
      marker.textContent = index === 0 ? '/' : '|';
      const code = document.createElement('code');
      code.innerHTML = highlightSource(sourceLine) || '&nbsp;';
      line.append(number, marker, code);
      source.append(line);
    });

    const conflict = document.createElement('div');
    conflict.className = 'build-preview-conflict';
    conflict.textContent = "|_________________ ^ `compute` redefined here";
    const otherLocation = diagnostic.locations.find(item => item.id !== location.id);
    const related = document.createElement('div');
    related.className = 'build-preview-path build-preview-related';
    related.textContent = `... ${otherLocation.previewPath}`;

    output.append(source, conflict, related);
    buildPreview.append(output);
  }

  function renderBuildDiagnostics(snapshot) {
    const nodes = [];
    snapshot.diagnostics.forEach(diagnostic => {
      const expanded = scenario.expandedDiagnosticId === diagnostic.code;
      nodes.push(renderDiagnosticRow(diagnostic, expanded));
      if (expanded) nodes.push(renderInformerRow(diagnostic, diagnostic.locations[1]));
    });
    buildDiagnostics.replaceChildren(...nodes);

    const selectedDiagnostic = snapshot.diagnostics.find(
      diagnostic => diagnostic.code === scenario.expandedDiagnosticId
    );
    if (selectedDiagnostic) renderBuildPreview(snapshot, selectedDiagnostic);
    else {
      buildPreview.replaceChildren();
      buildPreview.classList.remove('has-content');
      buildPreview.setAttribute('aria-label', 'Предпросмотр кода пуст');
      buildPreview.removeAttribute('data-preview-document');
    }
    root.dataset.expandedDiagnosticId = scenario.expandedDiagnosticId || '';
    root.dataset.selectedBuildDiagnosticLocation = scenario.selectedBuildDiagnosticLocation || '';
  }

  function showBuild(snapshot) {
    scenario.view = 'build';
    scenario.activeBuildId = snapshot.id;
    renderBuildTabs(snapshot);
    renderBuildCounters(snapshot);
    renderBuildDiagnostics(snapshot);
    buildResult.dataset.resultView = 'build';
    buildResult.setAttribute('aria-label', 'Результат сборки');
    buildDiagnostics.setAttribute('aria-label', 'Сообщения компилятора');
    consolePanelButton.classList.remove('is-active');
    consolePanelButton.removeAttribute('aria-current');
    analyzerPanelButton.classList.remove('is-active');
    analyzerPanelButton.removeAttribute('aria-current');
    buildPanelButton.classList.add('is-active');
    buildPanelButton.setAttribute('aria-current', 'page');
    buildEmpty.hidden = true;
    consoleView.hidden = true;
    buildResult.hidden = false;
    root.dataset.activeBuildId = snapshot.id;
    root.dataset.activeBuildSnapshotSource = snapshot.sourceSnapshot['compute-a'] || '';
    setBottomHeight(412);
  }

  function renderAnalyzerDiagnostic() {
    const row = document.createElement('div');
    row.className = 'build-diagnostic-row is-selected analyzer-diagnostic-row';
    row.dataset.diagnosticCode = ST001.code;

    const leading = document.createElement('div');
    leading.className = 'build-diagnostic-leading';
    const spacer = document.createElement('span');
    spacer.className = 'build-diagnostic-spacer';
    const errorIcon = document.createElement('img');
    errorIcon.src = 'assets/icons/status-error.svg';
    errorIcon.alt = '';
    leading.append(spacer, errorIcon);

    const code = document.createElement('span');
    code.className = 'build-diagnostic-code';
    code.textContent = ST001.code;
    const description = document.createElement('span');
    description.className = 'build-diagnostic-description';
    description.textContent = ST001.description;
    const locations = document.createElement('span');
    locations.className = 'analyzer-diagnostic-location';
    locations.textContent = ST001.locations.join(' · ');
    row.append(leading, code, description, locations);
    return row;
  }

  function showAnalyzer() {
    if (!scenario.bodyValid) return;

    const tab = document.createElement('button');
    tab.className = 'is-active';
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'true');
    const icon = document.createElement('img');
    icon.src = 'assets/icons/panel-messages.svg';
    icon.alt = '';
    const label = document.createElement('span');
    label.textContent = 'Сообщения анализатора';
    tab.append(icon, label);
    panelTabs.replaceChildren(tab);

    scenario.view = 'analyzer';
    if (!scenario.resultDeclarationValid) setState('analyzer-messages-st001');
    consolePanelButton.classList.remove('is-active');
    consolePanelButton.removeAttribute('aria-current');
    buildPanelButton.classList.remove('is-active');
    buildPanelButton.removeAttribute('aria-current');
    analyzerPanelButton.classList.add('is-active');
    analyzerPanelButton.removeAttribute('aria-disabled');
    analyzerPanelButton.setAttribute('aria-current', 'page');
    analyzerPanelButton.classList.remove('has-notification');

    renderBuildCounters({
      counters: scenario.resultDeclarationValid
        ? { error: 0, warning: 0, info: 0 }
        : { error: 1, warning: 0, info: 0 }
    });
    buildDiagnostics.replaceChildren(
      ...(scenario.resultDeclarationValid ? [] : [renderAnalyzerDiagnostic()])
    );
    buildDiagnostics.setAttribute(
      'aria-label',
      scenario.resultDeclarationValid
        ? 'Сообщения анализатора: ошибок нет'
        : 'Сообщения анализатора: одна ошибка ST001'
    );
    buildPreview.replaceChildren();
    buildPreview.classList.remove('has-content');
    buildPreview.setAttribute('aria-label', 'Предпросмотр кода пуст');
    buildResult.dataset.resultView = 'analyzer';
    buildResult.setAttribute('aria-label', 'Сообщения анализатора');
    buildEmpty.hidden = true;
    consoleView.hidden = true;
    buildResult.hidden = false;
    setBottomHeight(228);
    renderDocument(activeDocument);
  }

  function getActiveBuildSnapshot() {
    return scenario.builds.find(snapshot => snapshot.id === scenario.activeBuildId) || null;
  }

  function setBuilding(active) {
    statusbarBuild.hidden = !active;
    statusbarLabel.textContent = active ? 'Сборка проекта' : '';
    statusbarProgress.style.width = active ? '40%' : '0';
  }

  function enterCompiling(sequence) {
    const expectedState = scenario.pendingBuildId === 'build-3'
      ? 'compile-pressed-build-3'
      : scenario.pendingBuildId === 'build-2'
        ? 'compile-pressed-build-2'
        : 'compile-pressed';
    if (sequence !== scenario.sequence || scenario.state !== expectedState) return;
    scenario.pressTimer = null;
    setState(scenario.pendingBuildId === 'build-3'
      ? 'compiling-build-3'
      : scenario.pendingBuildId === 'build-2'
        ? 'compiling-build-2'
        : 'compiling');
    setCompileVisual('active', true);
    showConsole(RUNNING_CONSOLE_LINES);
    setBuilding(true);
    scenario.completionTimer = window.setTimeout(
      () => enterCompileComplete(sequence),
      RUNNING_DELAY_MS
    );
  }

  function enterCompileComplete(sequence) {
    const buildId = scenario.pendingBuildId;
    const expectedState = buildId === 'build-3'
      ? 'compiling-build-3'
      : buildId === 'build-2'
        ? 'compiling-build-2'
        : 'compiling';
    if (sequence !== scenario.sequence || scenario.state !== expectedState) return;
    scenario.completionTimer = null;
    setState(buildId === 'build-3'
      ? 'compile-complete-build-3'
      : buildId === 'build-2'
        ? 'compile-complete-build-2'
        : 'compile-complete');
    setCompileVisual('default', true);
    setBuilding(false);
    if (buildId === 'build-3') createThirdBuildSnapshot();
    else if (buildId === 'build-2') createSecondBuildSnapshot();
    else createFirstBuildSnapshot();
    scenario.pendingBuildId = null;
    buildPanelButton.classList.add('has-notification');
    buildPanelButton.removeAttribute('aria-disabled');
    buildPanelButton.setAttribute('aria-label', 'Сообщения компилятора');
  }

  function startCompilation() {
    const isFirstBuild = scenario.state === 'initial' && scenario.builds.length === 0;
    const isSecondBuild = scenario.state === 'compiler-messages-build-1'
      && scenario.renameValid
      && scenario.builds.length === 1;
    const isThirdBuild = scenario.state === 'result-declaration-fixed'
      && scenario.resultDeclarationValid
      && scenario.liveAnalyzerDiagnostics.length === 0
      && scenario.builds.length === 2;
    if ((!isFirstBuild && !isSecondBuild && !isThirdBuild)
      || scenario.pressTimer !== null
      || scenario.completionTimer !== null) return;
    scenario.pendingBuildId = isThirdBuild
      ? 'build-3'
      : isSecondBuild
        ? 'build-2'
        : 'build-1';
    scenario.starts += 1;
    scenario.sequence += 1;
    root.dataset.compileStarts = String(scenario.starts);
    setState(isThirdBuild
      ? 'compile-pressed-build-3'
      : isSecondBuild
        ? 'compile-pressed-build-2'
        : 'compile-pressed');
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

  function highlightSource(source, options = {}) {
    let conflictRevealed = false;
    const tokenPattern = /\b(FUNCTION|VAR_INPUT|END_VAR|END_FUNCTION)\b|\b(DINT|INT)\b|\b(compute|calculate|result|t)\b|(:=|:|;|\*)|\b(\d+)\b/g;
    return escapeHtml(source).replace(tokenPattern, (token, keyword, type, name, operator, number) => {
      if (keyword) return `<span class="kw">${token}</span>`;
      if (type) return `<span class="type">${token}</span>`;
      if (name) {
        const isRenameTarget = options.renameTarget
          && token === 'compute'
          && !conflictRevealed;
        const isRevealedConflict = options.revealConflict
          && token === 'compute'
          && !conflictRevealed;
        if (isRenameTarget || isRevealedConflict) conflictRevealed = true;
        if (isRenameTarget) {
          return `<button class="code-action-target rename-code-action name" type="button" data-code-action="rename-function" aria-label="Исправить имя функции compute на calculate">${token}</button>`;
        }
        if (options.markUndeclaredResult && token === 'result') {
          return `<span class="name live-analyzer-problem" data-analyzer-problem="${ST001.code}">${token}</span>`;
        }
        return `<span class="name${isRevealedConflict ? ' has-diagnostic' : ''}"${isRevealedConflict ? ` data-revealed-location="${options.locationId}"` : ''}>${token}</span>`;
      }
      if (operator) return `<span class="op">${token}</span>`;
      if (number) return `<span class="num">${token}</span>`;
      return token;
    });
  }

  function createCodeActionTarget(action, label, ariaLabel) {
    const target = document.createElement('button');
    target.className = 'code-action-target body-code-action';
    target.type = 'button';
    target.dataset.codeAction = action;
    target.setAttribute('aria-label', ariaLabel);
    target.textContent = label;
    return target;
  }

  function appendHighlightedSource(target, source, options = {}) {
    const template = document.createElement('template');
    template.innerHTML = highlightSource(source, options);
    target.append(template.content);
  }

  function findReservedBodyOffset(source) {
    const lines = source.split('\n');
    const endIndex = lines.findIndex(line => line.trim() === 'END_FUNCTION');
    const limit = endIndex < 0 ? lines.length : endIndex;
    let offset = 0;
    for (let index = 0; index < limit; index += 1) {
      if (index > 0 && lines[index].trim() === '') return offset;
      offset += lines[index].length + 1;
    }
    return null;
  }

  function renderCalculateBodyTarget(source) {
    const insertionOffset = findReservedBodyOffset(source);
    if (insertionOffset === null) {
      sourceCode.innerHTML = highlightSource(source);
      return;
    }

    const fragment = document.createDocumentFragment();
    appendHighlightedSource(fragment, source.slice(0, insertionOffset));
    fragment.append(
      document.createTextNode('  '),
      createCodeActionTarget(
        'insert-calculate-body',
        'Вставьте код',
        'Вставить тело функции calculate'
      )
    );
    appendHighlightedSource(fragment, source.slice(insertionOffset));
    sourceCode.replaceChildren(fragment);
  }

  function renderResultDeclarationTarget(source) {
    const fragment = document.createDocumentFragment();
    source.replace(/\r\n?/g, '\n').split('\n').forEach((lineText, index) => {
      const line = document.createElement('span');
      line.className = 'source-line';
      line.dataset.editorLine = String(index + 1);
      if (index === 2 && lineText.trim() === '') {
        const target = createCodeActionTarget(
          'declare-result',
          'Объявите переменную',
          'Объявить переменную result'
        );
        target.classList.add('declaration-code-action');
        line.append(document.createTextNode('    '), target);
      } else {
        appendHighlightedSource(line, lineText, { markUndeclaredResult: true });
      }
      fragment.append(line);
    });
    sourceCode.replaceChildren(fragment);
  }

  function validateCalculateBody(source) {
    return source.replace(/\r\n?/g, '\n') === CALCULATE_BODY_SOURCE;
  }

  function canShowCalculateBodyTarget(documentId) {
    return documentId === 'compute-a'
      && scenario.renameValid
      && !scenario.bodyValid
      && scenario.state === 'compiler-messages-build-2'
      && scenario.activeBuildId === 'build-2';
  }

  function canShowResultDeclarationTarget(documentId) {
    return documentId === 'compute-a'
      && scenario.bodyValid
      && !scenario.resultDeclarationValid
      && scenario.state === 'analyzer-messages-st001';
  }

  function getBuildLocation(locationId) {
    if (!locationId) return null;
    return scenario.builds
      .flatMap(snapshot => snapshot.diagnostics)
      .flatMap(diagnostic => diagnostic.locations)
      .find(location => location.id === locationId) || null;
  }

  function renderDocument(documentId) {
    const sourceDocument = sourceDocuments[documentId];
    if (!sourceDocument) return;

    activeDocument = documentId;
    scenario.activeDocumentId = documentId;
    const revealedLocation = getBuildLocation(scenario.revealedDiagnosticLocation);
    const revealConflict = revealedLocation?.documentId === documentId;
    const renameTarget = revealConflict
      && documentId === 'compute-a'
      && !scenario.renameValid;
    sourceCode.dataset.source = sourceDocument.source;
    if (canShowCalculateBodyTarget(documentId)) {
      renderCalculateBodyTarget(sourceDocument.source);
    } else if (canShowResultDeclarationTarget(documentId)) {
      renderResultDeclarationTarget(sourceDocument.source);
    } else {
      sourceCode.innerHTML = highlightSource(sourceDocument.source, {
        revealConflict,
        renameTarget,
        locationId: revealedLocation?.id,
        markUndeclaredResult: documentId === 'compute-a'
          && scenario.bodyValid
          && !scenario.resultDeclarationValid
      });
    }

    editorTabs.forEach(tab => {
      const isActive = tab.dataset.editorTab === documentId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    treeDocuments.forEach(row => {
      const isSelected = row.dataset.treeDocument === documentId;
      const hasDiagnostic = Boolean(
        scenario.revealedDiagnosticLocation
        && scenario.builds[0]?.diagnostics.some(diagnostic => (
          diagnostic.locations.some(location => location.documentId === row.dataset.treeDocument)
        ))
      );
      row.classList.toggle('is-selected', isSelected);
      row.classList.toggle('has-diagnostic', hasDiagnostic);
      if (isSelected) row.setAttribute('aria-selected', 'true');
      else row.removeAttribute('aria-selected');
    });

    root.dataset.activeDocumentId = documentId;
    root.dataset.revealedDiagnosticLocation = scenario.revealedDiagnosticLocation || '';
    root.dataset.renameValid = String(scenario.renameValid);
    root.dataset.bodyValid = String(scenario.bodyValid);
    root.dataset.resultDeclarationValid = String(scenario.resultDeclarationValid);
    root.dataset.liveAnalyzerProblems = String(scenario.liveAnalyzerDiagnostics.length);
    if (revealConflict) {
      const codeCanvas = sourceCode.closest('.code-canvas');
      codeCanvas.scrollTop = 0;
      codeCanvas.scrollLeft = 0;
    }
  }

  function applyCalculateBody() {
    if (!canShowCalculateBodyTarget(activeDocument) || scenario.bodyValid) return;

    const documentData = sourceDocuments['compute-a'];
    documentData.source = CALCULATE_BODY_SOURCE;
    scenario.bodyValid = validateCalculateBody(documentData.source);
    if (!scenario.bodyValid) return;

    scenario.dirty = true;
    scenario.liveAnalyzerDiagnostics = [ST001];
    setState('calculate-body-with-undeclared-result');
    analyzerPanelButton.removeAttribute('aria-disabled');
    analyzerPanelButton.classList.add('has-notification');
    renderDocument('compute-a');
  }

  function applyResultDeclaration() {
    if (!canShowResultDeclarationTarget(activeDocument)) return;

    const documentData = sourceDocuments['compute-a'];
    const lines = documentData.source.replace(/\r\n?/g, '\n').split('\n');
    if (lines[2]?.trim() !== '') return;
    lines[2] = '    result : INT;';
    documentData.source = lines.join('\n');
    scenario.resultDeclarationValid = /\bVAR_INPUT\b\s*\n\s*result\s*:\s*INT\s*;/m
      .test(documentData.source);
    if (!scenario.resultDeclarationValid) return;

    scenario.dirty = true;
    scenario.liveAnalyzerDiagnostics = [];
    setState('result-declaration-fixed');
    analyzerPanelButton.classList.remove('has-notification');
    setCompileVisual('default', false);
    renderDocument('compute-a');
    showAnalyzer();
  }

  function isBuildHistoryState() {
    return scenario.state.startsWith('compiler-messages-build-')
      || [
        'calculate-body-with-undeclared-result',
        'analyzer-messages-st001',
        'result-declaration-fixed'
      ].includes(scenario.state);
  }

  function navigateToBuildLocation(locationId) {
    if (!scenario.state.startsWith('compiler-messages-build-')
      || scenario.activeBuildId !== 'build-1'
      || scenario.expandedDiagnosticId !== CMP101.code) return;
    const snapshot = getActiveBuildSnapshot();
    const location = snapshot?.diagnostics
      .flatMap(diagnostic => diagnostic.locations)
      .find(item => item.id === locationId);
    if (!location || !sourceDocuments[location.documentId]) return;

    scenario.revealedDiagnosticLocation = location.id;
    renderDocument(location.documentId);
    renderBuildDiagnostics(snapshot);
  }

  function syncDocumentName(documentId) {
    const documentData = sourceDocuments[documentId];
    if (!documentData) return;

    editorTabs
      .find(tab => tab.dataset.editorTab === documentId)
      ?.querySelector('span:not(.tab-close)')
      ?.replaceChildren(documentData.name);
    treeDocuments
      .find(row => row.dataset.treeDocument === documentId)
      ?.querySelector('span:not(.chevron-spacer):not(.tree-icon)')
      ?.replaceChildren(documentData.name);
  }

  function applyFunctionRename() {
    if (scenario.state !== 'compiler-messages-build-1'
      || activeDocument !== 'compute-a'
      || scenario.revealedDiagnosticLocation !== 'compute-a:1'
      || scenario.renameValid) return;

    const documentData = sourceDocuments['compute-a'];
    const nextSource = documentData.source.replace(
      /(\bFUNCTION\s+)compute\b/,
      '$1calculate'
    );
    if (nextSource === documentData.source) return;

    documentData.source = nextSource;
    documentData.name = 'calculate';
    scenario.renameValid = /^FUNCTION\s+calculate\s*:\s*DINT\b/m.test(documentData.source);
    if (!scenario.renameValid) return;

    scenario.revealedDiagnosticLocation = null;
    syncDocumentName('compute-a');
    setCompileVisual('default', false);
    renderDocument('compute-a');
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

  consolePanelButton.addEventListener('click', () => {
    if (![
      'compile-complete',
      'compiler-messages-build-1',
      'compile-complete-build-2',
      'compiler-messages-build-2',
      'calculate-body-with-undeclared-result',
      'analyzer-messages-st001',
      'result-declaration-fixed',
      'compile-complete-build-3',
      'compiler-messages-build-3'
    ].includes(scenario.state)) return;
    showConsole(RUNNING_CONSOLE_LINES);
  });

  analyzerPanelButton.addEventListener('click', showAnalyzer);

  buildPanelButton.addEventListener('click', () => {
    if (![
      'compile-complete',
      'compiler-messages-build-1',
      'compile-complete-build-2',
      'compiler-messages-build-2',
      'calculate-body-with-undeclared-result',
      'analyzer-messages-st001',
      'result-declaration-fixed',
      'compile-complete-build-3',
      'compiler-messages-build-3'
    ].includes(scenario.state)) return;
    const snapshot = scenario.builds.at(-1);
    if (!snapshot) return;
    if (snapshot.id === 'build-3' && scenario.state === 'compile-complete-build-3') {
      setState('compiler-messages-build-3');
    } else if (!scenario.bodyValid) {
      setState(snapshot.id === 'build-2'
        ? 'compiler-messages-build-2'
        : 'compiler-messages-build-1');
    }
    showBuild(snapshot);
  });

  panelTabs.addEventListener('click', event => {
    const tab = event.target.closest('[data-build-id]');
    if (!tab || !panelTabs.contains(tab)) return;
    const snapshot = scenario.builds.find(build => build.id === tab.dataset.buildId);
    if (!snapshot || !isBuildHistoryState()) return;
    showBuild(snapshot);
  });

  buildDiagnostics.addEventListener('click', event => {
    const locationTarget = event.target.closest('[data-build-location]');
    if (locationTarget) {
      navigateToBuildLocation(locationTarget.dataset.buildLocation);
      return;
    }

    const toggle = event.target.closest('[data-diagnostic-toggle], [data-diagnostic-disclosure]');
    if (!toggle || !isBuildHistoryState() || scenario.view !== 'build') return;
    const diagnosticCode = toggle.dataset.diagnosticToggle || toggle.dataset.diagnosticDisclosure;
    const snapshot = getActiveBuildSnapshot();
    const diagnostic = snapshot?.diagnostics.find(item => item.code === diagnosticCode);
    if (!diagnostic) return;

    const willExpand = scenario.expandedDiagnosticId !== diagnosticCode;
    scenario.expandedDiagnosticId = willExpand ? diagnosticCode : null;
    scenario.selectedBuildDiagnosticLocation = willExpand ? diagnostic.locations[0].id : null;
    renderBuildDiagnostics(snapshot);
  });

  sourceCode.addEventListener('click', event => {
    const target = event.target.closest('[data-code-action]');
    if (!target || !sourceCode.contains(target)) return;
    event.preventDefault();
    if (target.dataset.codeAction === 'rename-function') applyFunctionRename();
    else if (target.dataset.codeAction === 'insert-calculate-body') applyCalculateBody();
    else if (target.dataset.codeAction === 'declare-result') applyResultDeclaration();
  });

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
  root.dataset.buildCount = '0';
  renderDocument(activeDocument);
})();
