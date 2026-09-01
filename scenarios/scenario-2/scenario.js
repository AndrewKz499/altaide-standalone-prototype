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
  const codeCanvas = document.querySelector('.code-canvas');
  const sourceCode = document.querySelector('.source-code code');
  const diagnosticBody = document.querySelector('[data-diagnostics-body]');
  const counters = {
    error: document.querySelector('[data-counter="error"]'),
    warning: document.querySelector('[data-counter="warning"]'),
    info: document.querySelector('[data-counter="info"]')
  };

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
  const RECOMPILE_CONSOLE_LINES = [...RUNNING_CONSOLE_LINES];
  const CMP101 = {
    code: 'CMP101',
    description: "Функция 'compute' определена несколько раз. Функци...",
    location: '\\test\\src\\compute.st:3:1',
    child: {
      description: "Первый раз функция 'compute' определена здесь",
      location: '\\test\\src\\compute.st:4:1',
      documentId: 'compute-a'
    }
  };
  const ST001 = {
    code: 'ST001',
    description: "Переменная 'result' не объявлена.",
    locations: ['calculate.st:6', 'calculate.st:7'],
    documentId: 'compute-a'
  };
  const DOCUMENT_MARKUP = {
    'compute-b': `<span class="kw">FUNCTION</span> <span class="name" data-compute-identifier>compute</span> <span class="op">:</span> <span class="type">DINT</span>
<span class="kw">VAR_INPUT</span>
  <span class="name">t</span> <span class="op">:</span> <span class="type">INT</span><span class="op">;</span>
<span class="kw">END_VAR</span>
  <span class="name" data-compute-identifier>compute</span> <span class="op">:=</span> <span class="name">t</span> <span class="op">*</span> <span class="num">2</span><span class="op">;</span>
<span class="kw">END_FUNCTION</span>`
  };
  const DOCUMENTS = {
    'compute-b': {
      name: 'compute',
      source: `FUNCTION compute : DINT
VAR_INPUT
  t : INT;
END_VAR
  compute := t * 2;
END_FUNCTION`
    },
    'compute-a': {
      name: 'compute',
      source: `FUNCTION compute : DINT

END_FUNCTION`
    }
  };
  const CALCULATE_BODY_SOURCE = `FUNCTION calculate : DINT
VAR_INPUT

    t : INT;
END_VAR
    result := t * 5;
    calculate := result;
END_FUNCTION`;
  const CALCULATE_BODY_PATTERNS = [
    /^FUNCTION\s+calculate\s*:\s*DINT$/,
    /^VAR_INPUT$/,
    /^t\s*:\s*INT\s*;$/,
    /^END_VAR$/,
    /^result\s*:=\s*t\s*\*\s*5\s*;$/,
    /^calculate\s*:=\s*result\s*;$/,
    /^END_FUNCTION$/
  ];
  const EMPTY_ROW_COUNT = 10;

  const scenario = {
    state: 'initial',
    sequence: 0,
    starts: 0,
    timers: [],
    hasCmp101: false,
    messageTab: 'compiler',
    cmp101Expanded: false,
    activeDocument: 'compute-b',
    renameValid: false,
    bodyValid: false,
    resultDeclarationValid: false,
    dirty: false,
    selectedDiagnostic: null,
    revealLocation: null
  };

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
    consolePanelButton.removeAttribute('aria-disabled');
  }

  function setCounters(error = 0, warning = 0, info = 0) {
    const values = { error, warning, info };
    const labels = { error: 'Ошибки', warning: 'Предупреждения', info: 'Информация' };
    Object.entries(counters).forEach(([key, button]) => {
      const value = values[key];
      button.querySelector('span').textContent = String(value);
      button.setAttribute('aria-label', `${labels[key]}: ${value}`);
    });
  }

  function createEmptyDiagnosticRow() {
    const row = document.createElement('tr');
    row.innerHTML = '<td></td><td></td><td></td><td></td>';
    return row;
  }

  function createCmp101RootRow() {
    const row = document.createElement('tr');
    row.className = 'diagnostic-row scenario-2-diagnostic';
    row.dataset.diagnosticCode = CMP101.code;

    const typeCell = document.createElement('td');
    typeCell.className = 'diagnostic-type';

    const disclosure = document.createElement('button');
    disclosure.className = 'diagnostic-disclosure';
    disclosure.type = 'button';
    disclosure.dataset.diagnosticDisclosure = CMP101.code;
    disclosure.setAttribute(
      'aria-label',
      scenario.cmp101Expanded ? 'CMP101 развернута' : 'CMP101 свернута'
    );
    disclosure.setAttribute('aria-expanded', String(scenario.cmp101Expanded));

    const iconSlot = document.createElement('span');
    iconSlot.className = 'diagnostic-icon-slot';
    const icon = document.createElement('img');
    icon.src = 'assets/icons/status-error.svg';
    icon.alt = '';
    iconSlot.append(icon);
    typeCell.append(disclosure, iconSlot);

    const codeCell = document.createElement('td');
    codeCell.textContent = CMP101.code;

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = CMP101.description;
    descriptionCell.title = CMP101.description;

    const locationCell = document.createElement('td');
    const location = document.createElement('span');
    location.className = 'diagnostic-location';
    location.textContent = CMP101.location;
    locationCell.append(location);

    row.append(typeCell, codeCell, descriptionCell, locationCell);
    return row;
  }

  function createCmp101ChildRow() {
    const row = document.createElement('tr');
    row.className = 'diagnostic-row diagnostic-child scenario-2-diagnostic';
    row.dataset.diagnosticCode = CMP101.code;
    row.dataset.diagnosticChild = 'true';

    const typeCell = document.createElement('td');
    typeCell.className = 'diagnostic-type';
    const iconSlot = document.createElement('span');
    iconSlot.className = 'diagnostic-icon-slot';
    const icon = document.createElement('img');
    icon.src = 'assets/icons/status-info.svg';
    icon.alt = '';
    iconSlot.append(icon);
    typeCell.append(iconSlot);

    const codeCell = document.createElement('td');
    codeCell.textContent = CMP101.code;

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = CMP101.child.description;

    const locationCell = document.createElement('td');
    const location = document.createElement('button');
    location.className = 'diagnostic-location-button';
    location.type = 'button';
    location.dataset.diagnosticLocation = CMP101.child.location;
    location.setAttribute('aria-label', `Перейти к ${CMP101.child.location}`);
    location.textContent = CMP101.child.location;
    locationCell.append(location);

    row.append(typeCell, codeCell, descriptionCell, locationCell);
    return row;
  }

  function createSt001Row() {
    const row = document.createElement('tr');
    row.className = 'diagnostic-row scenario-2-diagnostic st001-diagnostic';
    row.dataset.diagnosticCode = ST001.code;

    const typeCell = document.createElement('td');
    typeCell.className = 'diagnostic-type';
    const iconSlot = document.createElement('span');
    iconSlot.className = 'diagnostic-icon-slot';
    const icon = document.createElement('img');
    icon.src = 'assets/icons/status-error.svg';
    icon.alt = '';
    iconSlot.append(icon);
    typeCell.append(iconSlot);

    const codeCell = document.createElement('td');
    codeCell.textContent = ST001.code;

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = ST001.description;

    const locationCell = document.createElement('td');
    locationCell.className = 'st001-locations';
    ST001.locations.forEach(locationValue => {
      const location = document.createElement('button');
      location.className = 'diagnostic-location-button';
      location.type = 'button';
      location.dataset.st001Location = locationValue;
      location.setAttribute('aria-label', `Перейти к ${locationValue}`);
      location.textContent = locationValue;
      locationCell.append(location);
    });

    row.append(typeCell, codeCell, descriptionCell, locationCell);
    return row;
  }

  function renderMessages() {
    const showCmp101 = scenario.hasCmp101 && scenario.messageTab === 'compiler';
    const showSt001 = scenario.bodyValid
      && !scenario.resultDeclarationValid
      && scenario.messageTab === 'analyzer';
    const rows = showCmp101
      ? [createCmp101RootRow()]
      : showSt001 ? [createSt001Row()] : [];
    if (showCmp101 && scenario.cmp101Expanded) rows.push(createCmp101ChildRow());
    rows.push(...Array.from(
      { length: EMPTY_ROW_COUNT - rows.length },
      createEmptyDiagnosticRow
    ));
    diagnosticBody.replaceChildren(...rows);
    diagnosticBody.setAttribute('aria-hidden', String(!showCmp101 && !showSt001));
    messageView.setAttribute(
      'aria-label',
      showCmp101
        ? 'Сообщения компилятора: одна ошибка'
        : showSt001
          ? 'Сообщения анализатора: одна ошибка ST001'
          : 'Пустая таблица сообщений'
    );
    if (scenario.resultDeclarationValid || showSt001) setCounters(1, 0, 0);
    else if (scenario.bodyValid) setCounters(2, 0, 1);
    else setCounters(showCmp101 ? 1 : 0, 0, 0);
  }

  function setActiveMessageTab(tabName) {
    scenario.messageTab = tabName;
    messageTabs.forEach(tab => {
      const active = tab.dataset.messageTab === tabName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    table.dataset.activeMessageTable = tabName;
    renderMessages();
  }

  function showMessages(tabName = 'compiler') {
    messageTabsContainer.hidden = false;
    consoleTab.hidden = true;
    messageView.hidden = false;
    consoleView.hidden = true;
    consolePanelButton.classList.remove('is-active');
    messagesPanelButton.classList.add('is-active');
    setActiveMessageTab(tabName);
  }

  function setBuilding(active) {
    statusbarBuild.hidden = !active;
    statusbarLabel.textContent = active ? 'Сборка проекта' : '';
    statusbarProgress.style.width = active ? '40%' : '0';
  }

  function setConflictMarkers(active) {
    documentRows.forEach(row => row.classList.toggle('has-diagnostic', active));
    document.querySelectorAll('[data-compute-identifier]').forEach(identifier => {
      const identifierName = identifier.matches('input')
        ? identifier.value
        : identifier.textContent;
      identifier.classList.toggle('has-diagnostic', active && identifierName === 'compute');
    });
    messagesPanelButton.classList.toggle('has-notification', active);
  }

  function setUndeclaredResultMarkers(active) {
    documentRows.forEach(row => {
      if (row.dataset.treeDocument === 'compute-a') {
        row.classList.toggle('has-diagnostic', active);
      }
    });
    document.querySelectorAll('[data-result-identifier]').forEach(identifier => {
      identifier.classList.toggle('has-diagnostic', active);
    });
    messagesPanelButton.classList.toggle('has-notification', active);
  }

  function refreshProblemMarkers() {
    setConflictMarkers(scenario.hasCmp101);
    if (scenario.bodyValid && !scenario.resultDeclarationValid) {
      setUndeclaredResultMarkers(true);
    }
  }

  function getFunctionIdentifier(source) {
    const match = source.match(/^FUNCTION\s+([^:\n]*?)\s*:\s*DINT/m);
    return match ? match[1].trim() : '';
  }

  function replaceFunctionIdentifier(source, identifier) {
    return source.replace(
      /^(FUNCTION\s+)([^:\n]*?)(\s*:\s*DINT)/m,
      (_, prefix, previousIdentifier, suffix) => prefix + identifier + suffix
    );
  }

  function validateFunctionRename(source) {
    return /^FUNCTION\s+calculate\s*:\s*DINT\b/m.test(source)
      && !/^FUNCTION\s+compute\b/m.test(source);
  }

  function validateCalculateBody(source) {
    const lines = source
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    return lines.length === CALCULATE_BODY_PATTERNS.length
      && CALCULATE_BODY_PATTERNS.every((pattern, index) => pattern.test(lines[index]));
  }

  function normalizeCalculateBodySource(source) {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const varInputIndex = lines.findIndex(line => line.trim() === 'VAR_INPUT');
    const inputIndex = lines.findIndex((line, index) => (
      index > varInputIndex && /^\s*t\s*:\s*INT\s*;\s*$/.test(line)
    ));
    if (varInputIndex < 0 || inputIndex < 0) return lines.join('\n');
    const declarationSlot = lines.slice(varInputIndex + 1, inputIndex);
    if (!declarationSlot.every(line => line.trim() === '')) return lines.join('\n');
    lines.splice(varInputIndex + 1, declarationSlot.length, '');
    return lines.join('\n');
  }

  function validateResultDeclaration(source) {
    const inputBlock = source.match(/\bVAR_INPUT\b([\s\S]*?)\bEND_VAR\b/);
    if (!inputBlock) return false;
    return inputBlock[1]
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .some(line => /^\s*result\s*:\s*INT\s*;\s*$/.test(line));
  }

  function canEditFunctionName() {
    return [
      'diagnostic-location',
      'name-conflict-editing',
      'name-conflict-fixed-source'
    ].includes(scenario.state);
  }

  function syncDocumentName(documentId) {
    const documentData = DOCUMENTS[documentId];
    const tabLabel = document.querySelector(
      `[data-editor-tab="${documentId}"] > span:not(.tab-close)`
    );
    const treeLabel = document.querySelector(
      `[data-tree-document="${documentId}"] > span:not(.chevron-spacer)`
    );
    if (tabLabel) tabLabel.textContent = documentData.name;
    if (treeLabel) treeLabel.textContent = documentData.name;
  }

  function resetSourceEditorMode() {
    sourceCode.contentEditable = 'false';
    delete sourceCode.dataset.editorMode;
    sourceCode.removeAttribute('role');
    sourceCode.removeAttribute('tabindex');
    sourceCode.removeAttribute('aria-label');
    sourceCode.removeAttribute('aria-multiline');
    sourceCode.removeAttribute('spellcheck');
    sourceCode.classList.remove('is-editable-source');
  }

  function createCodeActionTarget(action, label, ariaLabel, extraClass = '') {
    const target = document.createElement('button');
    target.className = `code-action-target ${extraClass}`.trim();
    target.type = 'button';
    target.dataset.codeAction = action;
    target.textContent = label;
    target.setAttribute('aria-label', ariaLabel);
    return target;
  }

  function appendHighlightedTokens(target, source) {
    const tokenPattern = /\b(?:FUNCTION|VAR_INPUT|END_VAR|END_FUNCTION)\b|\b(?:DINT|INT)\b|\b(?:calculate|t)\b|\bresult\b|:=|[:;*]|\b5\b/g;
    let cursor = 0;

    for (const match of source.matchAll(tokenPattern)) {
      target.append(document.createTextNode(source.slice(cursor, match.index)));
      const token = document.createElement('span');
      const value = match[0];
      if (['FUNCTION', 'VAR_INPUT', 'END_VAR', 'END_FUNCTION'].includes(value)) {
        token.className = 'kw';
      } else if (['DINT', 'INT'].includes(value)) {
        token.className = 'type';
      } else if (value === 'result') {
        token.className = scenario.resultDeclarationValid
          ? 'result'
          : 'result has-diagnostic';
        token.dataset.resultIdentifier = '';
      } else if (value === '5') {
        token.className = 'num';
      } else if ([':=', ':', ';', '*'].includes(value)) {
        token.className = 'op';
      } else {
        token.className = 'name';
      }
      token.textContent = value;
      target.append(token);
      cursor = match.index + value.length;
    }
    target.append(document.createTextNode(source.slice(cursor)));
  }

  function renderHighlightedCalculateBody(source) {
    const fragment = document.createDocumentFragment();
    appendHighlightedTokens(fragment, source);
    sourceCode.replaceChildren(fragment);
    codeCanvas.scrollTop = 0;
    codeCanvas.scrollLeft = 0;
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
    const fragment = document.createDocumentFragment();
    if (insertionOffset === null) {
      appendHighlightedTokens(fragment, source);
    } else {
      appendHighlightedTokens(fragment, source.slice(0, insertionOffset));
      fragment.append(
        document.createTextNode('  '),
        createCodeActionTarget(
          'insert-calculate-body',
          'Вставьте код',
          'Вставить тело функции calculate'
        )
      );
      appendHighlightedTokens(fragment, source.slice(insertionOffset));
    }
    sourceCode.replaceChildren(fragment);
  }

  function declarationVisualLines(source) {
    return source.replace(/\r\n?/g, '\n').split('\n');
  }

  function revealEditorLine() {
    const sourceLine = Number(scenario.revealLocation?.match(/:(\d+)$/)?.[1]);
    return Number.isFinite(sourceLine) ? sourceLine : 6;
  }

  function renderDeclarationNavigationPreview(source) {
    const activeLine = scenario.state === 'st001-location'
      ? revealEditorLine()
      : null;
    const fragment = document.createDocumentFragment();
    declarationVisualLines(source).forEach((lineText, index) => {
      const lineNumber = index + 1;
      const line = document.createElement('span');
      line.className = 'source-line';
      line.dataset.editorLine = String(lineNumber);
      if (lineNumber === 3) {
        line.append(
          document.createTextNode('    '),
          createCodeActionTarget(
            'declare-result',
            'Объявите переменную',
            'Объявить переменную result'
          )
        );
      } else {
        appendHighlightedTokens(line, lineText);
      }
      if (lineNumber === activeLine) {
        line.classList.add('is-active-line');
        line.setAttribute('tabindex', '-1');
      }
      fragment.append(line);
    });
    sourceCode.replaceChildren(fragment);
  }

  function renderDefinitionDocument() {
    const documentData = DOCUMENTS['compute-a'];
    if (scenario.state === 'post-recompile-compiler-messages'
      && scenario.renameValid
      && !scenario.bodyValid) {
      renderCalculateBodyTarget(documentData.source);
      sourceCode.dataset.source = documentData.source;
      sourceCode.dataset.renameValid = 'true';
      sourceCode.dataset.bodyValid = 'false';
      sourceCode.dataset.resultDeclarationValid = 'false';
      return;
    }
    if (scenario.bodyValid) {
      if (['analyzer-messages-st001', 'st001-location'].includes(scenario.state)) {
        renderDeclarationNavigationPreview(documentData.source);
      } else {
        renderHighlightedCalculateBody(documentData.source);
      }
      sourceCode.dataset.source = documentData.source;
      sourceCode.dataset.bodyValid = 'true';
      sourceCode.dataset.resultDeclarationValid = String(scenario.resultDeclarationValid);
      return;
    }
    const keyword = document.createElement('span');
    keyword.className = 'kw';
    keyword.textContent = 'FUNCTION';

    const identifierName = getFunctionIdentifier(documentData.source);
    const showsRenameTarget = canEditFunctionName() && !scenario.renameValid;
    const identifier = showsRenameTarget
      ? createCodeActionTarget(
        'rename-function',
        identifierName,
        'Исправить имя функции compute на calculate',
        'rename-code-action name'
      )
      : document.createElement('span');
    if (!showsRenameTarget) {
      identifier.className = 'name';
      identifier.textContent = identifierName;
    }
    identifier.dataset.computeIdentifier = '';

    const operator = document.createElement('span');
    operator.className = 'op';
    operator.textContent = ':';
    const type = document.createElement('span');
    type.className = 'type';
    type.textContent = 'DINT';
    const endKeyword = document.createElement('span');
    endKeyword.className = 'kw';
    endKeyword.textContent = 'END_FUNCTION';

    sourceCode.replaceChildren(
      keyword,
      document.createTextNode(' '),
      identifier,
      document.createTextNode(' '),
      operator,
      document.createTextNode(' '),
      type,
      document.createTextNode('\n\n'),
      endKeyword
    );
    sourceCode.dataset.source = documentData.source;
    sourceCode.dataset.renameValid = String(scenario.renameValid);
    sourceCode.dataset.bodyValid = 'false';
  }

  function renderDocument(documentId) {
    resetSourceEditorMode();
    if (documentId === 'compute-a') renderDefinitionDocument();
    else sourceCode.innerHTML = DOCUMENT_MARKUP[documentId];
  }

  function selectDocument(documentId) {
    if (!DOCUMENTS[documentId]) return;
    scenario.activeDocument = documentId;
    editorTabs.forEach(tab => {
      const active = tab.dataset.editorTab === documentId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    documentRows.forEach(row => {
      const active = row.dataset.treeDocument === documentId;
      row.classList.toggle('is-selected', active);
      if (active) row.setAttribute('aria-selected', 'true');
      else row.removeAttribute('aria-selected');
    });
    renderDocument(documentId);
    refreshProblemMarkers();
  }

  function applyCalculateBodySource(source) {
    if (scenario.state !== 'post-recompile-compiler-messages') return;
    if (scenario.activeDocument !== 'compute-a') return;
    const documentData = DOCUMENTS['compute-a'];
    documentData.source = source.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n');
    scenario.dirty = true;
    sourceCode.dataset.source = documentData.source;
    scenario.bodyValid = validateCalculateBody(documentData.source);
    sourceCode.dataset.bodyValid = String(scenario.bodyValid);
    if (!scenario.bodyValid) return;

    documentData.source = normalizeCalculateBodySource(documentData.source);

    setState('calculate-body-with-undeclared-result');
    resetSourceEditorMode();
    renderHighlightedCalculateBody(documentData.source);
    sourceCode.dataset.source = documentData.source;
    sourceCode.dataset.bodyValid = 'true';
    renderMessages();
    refreshProblemMarkers();
  }

  function buildResultDeclarationSource(baseSource, declaration) {
    if (!declaration) return baseSource;
    const inputBlock = baseSource.match(/\bVAR_INPUT\b[\s\S]*?\bEND_VAR\b/);
    if (!inputBlock) return baseSource;
    const lines = inputBlock[0].replace(/\r\n?/g, '\n').split('\n');
    const targetIndex = lines.findIndex(line => /^\s*t\s*:\s*INT\s*;\s*$/.test(line));
    if (targetIndex < 0) return baseSource;
    const slotIndex = targetIndex - 1;
    if (slotIndex > 0 && lines[slotIndex].trim() === '') {
      lines[slotIndex] = `    ${declaration}`;
    } else {
      lines.splice(targetIndex, 0, `    ${declaration}`);
    }
    return baseSource.replace(inputBlock[0], lines.join('\n'));
  }

  function applyResultDeclaration() {
    if (!['analyzer-messages-st001', 'st001-location'].includes(scenario.state)) return;
    if (scenario.activeDocument !== 'compute-a') return;
    const documentData = DOCUMENTS['compute-a'];
    documentData.source = buildResultDeclarationSource(
      documentData.source,
      'result : INT;'
    );
    scenario.dirty = true;
    scenario.resultDeclarationValid = validateResultDeclaration(documentData.source);
    sourceCode.dataset.source = documentData.source;
    sourceCode.dataset.resultDeclarationValid = String(scenario.resultDeclarationValid);
    if (!scenario.resultDeclarationValid) return;

    scenario.selectedDiagnostic = null;
    scenario.revealLocation = null;
    setState('result-declaration-fixed');
    resetSourceEditorMode();
    renderHighlightedCalculateBody(documentData.source);
    sourceCode.dataset.source = documentData.source;
    sourceCode.dataset.bodyValid = 'true';
    sourceCode.dataset.resultDeclarationValid = 'true';
    renderMessages();
    refreshProblemMarkers();
  }

  function applyFunctionRename() {
    if (scenario.activeDocument !== 'compute-a') return;
    if (!canEditFunctionName() || scenario.renameValid) return;

    const documentData = DOCUMENTS['compute-a'];
    documentData.source = replaceFunctionIdentifier(documentData.source, 'calculate');
    scenario.renameValid = validateFunctionRename(documentData.source);
    if (!scenario.renameValid) return;

    documentData.name = 'calculate';
    setState('name-conflict-fixed-source');
    setCompileVisual('default', false);
    syncDocumentName('compute-a');
    renderDocument('compute-a');
    setConflictMarkers(scenario.hasCmp101);
  }

  function handleCodeActionClick(event) {
    const target = event.target.closest('[data-code-action]');
    if (!target || !sourceCode.contains(target)) return;
    event.preventDefault();

    if (target.dataset.codeAction === 'rename-function') {
      applyFunctionRename();
    } else if (target.dataset.codeAction === 'insert-calculate-body') {
      applyCalculateBodySource(CALCULATE_BODY_SOURCE);
    } else if (target.dataset.codeAction === 'declare-result') {
      applyResultDeclaration();
    }
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
    scenario.hasCmp101 = true;
    showConsole(FAILED_CONSOLE_LINES);
    setBuilding(false);
    scenario.timers = [];
  }

  function enterRecompiling(sequence) {
    if (sequence !== scenario.sequence || scenario.state !== 'recompile-pressed') return;
    setState('recompiling');
    setCompileVisual('active', true);
    setConflictMarkers(true);
    showConsole(RECOMPILE_CONSOLE_LINES);
    setBuilding(true);
    scenario.timers.push(window.setTimeout(
      () => enterRecompileComplete(sequence),
      RUNNING_DELAY_MS
    ));
  }

  function enterRecompileComplete(sequence) {
    if (sequence !== scenario.sequence || scenario.state !== 'recompiling') return;
    setState('recompile-complete');
    setCompileVisual('default', true);
    scenario.hasCmp101 = false;
    scenario.cmp101Expanded = false;
    renderMessages();
    setConflictMarkers(false);
    showConsole(RECOMPILE_CONSOLE_LINES);
    setBuilding(false);
    scenario.timers = [];
  }

  function startCompilation() {
    const startsInitial = scenario.state === 'initial';
    const startsRecompile = scenario.renameValid
      && scenario.starts === 1
      && [
        'name-conflict-fixed-source',
        'compile-failed',
        'compiler-messages-collapsed',
        'compiler-messages-expanded',
        'diagnostic-location'
      ].includes(scenario.state);
    if (!startsInitial && !startsRecompile) return;
    scenario.starts += 1;
    root.dataset.compileStarts = String(scenario.starts);
    scenario.sequence += 1;
    const sequence = scenario.sequence;
    setState(startsInitial ? 'compile-pressed' : 'recompile-pressed');
    setCompileVisual('pressed', true);
    scenario.timers.push(window.setTimeout(
      () => startsInitial ? enterCompiling(sequence) : enterRecompiling(sequence),
      PRESS_DELAY_MS
    ));
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
      selectDocument(tab.dataset.editorTab);
    });
  });

  sourceCode.addEventListener('click', handleCodeActionClick);

  diagnosticBody.addEventListener('click', event => {
    const st001Location = event.target.closest('[data-st001-location]');
    if (st001Location && diagnosticBody.contains(st001Location)) {
      if (!scenario.bodyValid || scenario.resultDeclarationValid) return;
      if (scenario.messageTab !== 'analyzer') return;
      if (!ST001.locations.includes(st001Location.dataset.st001Location)) return;
      scenario.selectedDiagnostic = ST001.code;
      scenario.revealLocation = st001Location.dataset.st001Location;
      setState('st001-location');
      selectDocument(ST001.documentId);
      sourceCode.querySelector(`[data-editor-line="${revealEditorLine()}"]`)
        ?.focus({ preventScroll: true });
      if (event.detail > 0) st001Location.blur();
      return;
    }

    const disclosure = event.target.closest('[data-diagnostic-disclosure]');
    if (disclosure && diagnosticBody.contains(disclosure)) {
      if (!scenario.hasCmp101 || scenario.messageTab !== 'compiler') return;
      scenario.cmp101Expanded = !scenario.cmp101Expanded;
      setState(scenario.cmp101Expanded
        ? 'compiler-messages-expanded'
        : 'compiler-messages-collapsed');
      renderMessages();
      if (event.detail > 0) disclosure.blur();
      return;
    }

    const location = event.target.closest('[data-diagnostic-location]');
    if (!location || !diagnosticBody.contains(location)) return;
    if (!scenario.cmp101Expanded || scenario.messageTab !== 'compiler') return;
    if (location.dataset.diagnosticLocation !== CMP101.child.location) return;
    setState('diagnostic-location');
    selectDocument(CMP101.child.documentId);
    if (event.detail > 0) location.blur();
  });

  messageTabs.forEach(tab => {
    tab.addEventListener('click', event => {
      const entersAnalyzerDeclaration = tab.dataset.messageTab === 'analyzer'
        && scenario.bodyValid
        && !scenario.resultDeclarationValid
        && scenario.state === 'calculate-body-with-undeclared-result';
      if (entersAnalyzerDeclaration) {
        setState('analyzer-messages-st001');
      }
      setActiveMessageTab(tab.dataset.messageTab);
      if (entersAnalyzerDeclaration && scenario.activeDocument === 'compute-a') {
        renderDocument('compute-a');
      }
      if (event.detail > 0) tab.blur();
    });
  });

  messagesPanelButton.addEventListener('click', event => {
    if (!scenario.hasCmp101 && [
      'recompile-complete',
      'post-recompile-compiler-messages',
      'calculate-body-editing',
      'calculate-body-with-undeclared-result',
      'analyzer-messages-st001',
      'st001-location',
      'result-declaration-editing',
      'result-declaration-fixed'
    ].includes(scenario.state)) {
      if (scenario.state === 'recompile-complete') {
        setState('post-recompile-compiler-messages');
        if (scenario.activeDocument === 'compute-a') renderDocument('compute-a');
      }
      showMessages('compiler');
      refreshProblemMarkers();
      if (event.detail > 0) messagesPanelButton.blur();
      return;
    }
    if (!scenario.hasCmp101) return;
    if (![
      'compile-failed',
      'compiler-messages-collapsed',
      'compiler-messages-expanded',
      'diagnostic-location',
      'name-conflict-editing',
      'name-conflict-fixed-source'
    ].includes(scenario.state)) return;
    if (![
      'diagnostic-location',
      'name-conflict-editing',
      'name-conflict-fixed-source'
    ].includes(scenario.state)) {
      setState(scenario.cmp101Expanded
        ? 'compiler-messages-expanded'
        : 'compiler-messages-collapsed');
    }
    showMessages('compiler');
    if (event.detail > 0) messagesPanelButton.blur();
  });

  consolePanelButton.addEventListener('click', event => {
    if (!scenario.hasCmp101 && [
      'post-recompile-compiler-messages',
      'calculate-body-editing',
      'calculate-body-with-undeclared-result',
      'analyzer-messages-st001',
      'st001-location',
      'result-declaration-editing',
      'result-declaration-fixed'
    ].includes(scenario.state)) {
      showConsole(RECOMPILE_CONSOLE_LINES);
      refreshProblemMarkers();
      if (event.detail > 0) consolePanelButton.blur();
      return;
    }
    if (!scenario.hasCmp101 || ![
      'compiler-messages-collapsed',
      'compiler-messages-expanded',
      'diagnostic-location',
      'name-conflict-editing',
      'name-conflict-fixed-source'
    ].includes(scenario.state)) return;
    setState('compile-failed');
    showConsole(FAILED_CONSOLE_LINES);
    if (event.detail > 0) consolePanelButton.blur();
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
  selectDocument('compute-b');
  setConflictMarkers(false);
  setBuilding(false);
  setActiveMessageTab('compiler');
  setSidebarWidth(248);
  setBottomHeight(228);
})();
