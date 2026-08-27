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
    resultDeclarationBaseSource: null,
    resultDeclarationDraft: '',
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

  function setIdentifierInputWidth(input) {
    input.style.width = `${Math.max(1, input.value.length)}ch`;
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

  function readSourceSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!sourceCode.contains(range.commonAncestorContainer)) return null;
    const prefix = document.createRange();
    prefix.selectNodeContents(sourceCode);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    return { start, end: start + range.toString().length };
  }

  function setSourceCaret(offset) {
    const selection = window.getSelection();
    const textNode = sourceCode.firstChild;
    if (!selection || !textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    const range = document.createRange();
    range.setStart(textNode, Math.max(0, Math.min(offset, textNode.length)));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
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

  function declarationVisualLines(source) {
    return source.replace(/\r\n?/g, '\n').split('\n');
  }

  function revealEditorLine() {
    const sourceLine = Number(scenario.revealLocation?.match(/:(\d+)$/)?.[1]);
    return Number.isFinite(sourceLine) ? sourceLine : 6;
  }

  function renderDeclarationNavigationPreview(source) {
    const activeLine = revealEditorLine();
    const fragment = document.createDocumentFragment();
    declarationVisualLines(source).forEach((lineText, index) => {
      const lineNumber = index + 1;
      const line = document.createElement('span');
      line.className = 'source-line';
      line.dataset.editorLine = String(lineNumber);
      if (lineNumber === 3) {
        line.setAttribute('role', 'button');
        line.setAttribute('tabindex', '0');
        line.setAttribute('aria-label', 'Объявить переменную result в строке 3');
      }
      if (lineNumber === activeLine) {
        line.classList.add('is-active-line');
        line.setAttribute('tabindex', '-1');
      }
      appendHighlightedTokens(line, lineText);
      fragment.append(line);
    });
    sourceCode.replaceChildren(fragment);
  }

  function renderResultDeclarationEditor() {
    const source = scenario.resultDeclarationBaseSource || DOCUMENTS['compute-a'].source;
    const fragment = document.createDocumentFragment();
    declarationVisualLines(source).forEach((lineText, index) => {
      const lineNumber = index + 1;
      const line = document.createElement('span');
      line.className = 'source-line';
      line.dataset.editorLine = String(lineNumber);
      if (lineNumber === 3) {
        line.classList.add('is-active-line');
        line.append(document.createTextNode('    '));
        const input = document.createElement('input');
        input.className = 'result editable-result-declaration';
        input.type = 'text';
        input.value = scenario.resultDeclarationDraft;
        input.dataset.resultDeclarationInput = '';
        input.setAttribute('aria-label', 'Объявление переменной result');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.style.width = `${Math.max(13, input.value.length)}ch`;
        line.append(input);
      } else {
        appendHighlightedTokens(line, lineText);
      }
      fragment.append(line);
    });
    sourceCode.replaceChildren(fragment);
  }

  function setBodyEditAffordance() {
    sourceCode.setAttribute('role', 'button');
    sourceCode.setAttribute('tabindex', '0');
    sourceCode.setAttribute('aria-label', 'Редактировать исходный код calculate');
  }

  function renderBodyEditor(mode, selectContents = false) {
    const documentData = DOCUMENTS['compute-a'];
    sourceCode.textContent = documentData.source;
    sourceCode.contentEditable = 'plaintext-only';
    sourceCode.dataset.editorMode = mode;
    sourceCode.setAttribute('role', 'textbox');
    sourceCode.setAttribute('tabindex', '0');
    sourceCode.setAttribute('aria-label', 'Исходный код calculate');
    sourceCode.setAttribute('aria-multiline', 'true');
    sourceCode.setAttribute('spellcheck', 'false');
    sourceCode.classList.add('is-editable-source');
    sourceCode.dataset.source = documentData.source;
    if (!selectContents) return;
    sourceCode.focus({ preventScroll: true });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(sourceCode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function renderDefinitionDocument() {
    const documentData = DOCUMENTS['compute-a'];
    if (scenario.state === 'calculate-body-editing') {
      renderBodyEditor('calculate-body');
      sourceCode.dataset.bodyValid = String(scenario.bodyValid);
      sourceCode.dataset.resultDeclarationValid = String(scenario.resultDeclarationValid);
      return;
    }
    if (scenario.state === 'result-declaration-editing') {
      renderResultDeclarationEditor();
      sourceCode.dataset.source = documentData.source;
      sourceCode.dataset.bodyValid = 'true';
      sourceCode.dataset.resultDeclarationValid = 'false';
      return;
    }
    if (scenario.bodyValid) {
      if (scenario.state === 'st001-location') {
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
    const identifier = document.createElement(canEditFunctionName() ? 'input' : 'span');
    identifier.className = canEditFunctionName() ? 'name editable-identifier' : 'name';
    identifier.dataset.computeIdentifier = '';
    if (identifier.matches('input')) {
      identifier.type = 'text';
      identifier.value = identifierName;
      identifier.dataset.editableFunctionName = 'compute-a';
      identifier.setAttribute('aria-label', 'Имя второй функции');
      identifier.setAttribute('autocomplete', 'off');
      identifier.setAttribute('autocapitalize', 'off');
      identifier.setAttribute('spellcheck', 'false');
      setIdentifierInputWidth(identifier);
    } else {
      identifier.textContent = identifierName;
    }

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
    if (scenario.state === 'post-recompile-compiler-messages') setBodyEditAffordance();
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

  function beginCalculateBodyEdit(event) {
    if (scenario.state !== 'post-recompile-compiler-messages') return;
    if (scenario.activeDocument !== 'compute-a') return;
    if (sourceCode.dataset.editorMode === 'calculate-body') return;
    event?.preventDefault();
    window.setTimeout(() => {
      if (scenario.state !== 'post-recompile-compiler-messages') return;
      if (scenario.activeDocument !== 'compute-a') return;
      setState('calculate-body-editing');
      renderBodyEditor('calculate-body', true);
    }, 0);
  }

  function applyCalculateBodySource(source) {
    if (scenario.state !== 'calculate-body-editing') return;
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

  function updateCalculateBodyFromEditor() {
    applyCalculateBodySource(sourceCode.innerText);
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

  function focusResultDeclarationInput() {
    const input = sourceCode.querySelector('[data-result-declaration-input]');
    if (!input) return false;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    return true;
  }

  function beginResultDeclarationEdit(event, initialValue = '') {
    if (scenario.state !== 'st001-location') return;
    if (scenario.activeDocument !== 'compute-a') return;
    event?.preventDefault();
    window.setTimeout(() => {
      if (scenario.state !== 'st001-location') return;
      if (scenario.activeDocument !== 'compute-a') return;
      scenario.resultDeclarationBaseSource = DOCUMENTS['compute-a'].source;
      scenario.resultDeclarationDraft = initialValue;
      if (initialValue) {
        DOCUMENTS['compute-a'].source = buildResultDeclarationSource(
          scenario.resultDeclarationBaseSource,
          initialValue
        );
        scenario.dirty = true;
      }
      setState('result-declaration-editing');
      renderDefinitionDocument();
      focusResultDeclarationInput();
    }, 0);
  }

  function applyResultDeclarationDraft(declaration) {
    if (scenario.state !== 'result-declaration-editing') return;
    if (scenario.activeDocument !== 'compute-a') return;
    const documentData = DOCUMENTS['compute-a'];
    const normalizedDeclaration = declaration.replace(/[\r\n]/g, '');
    scenario.resultDeclarationDraft = normalizedDeclaration;
    documentData.source = buildResultDeclarationSource(
      scenario.resultDeclarationBaseSource,
      normalizedDeclaration
    );
    scenario.dirty = true;
    scenario.resultDeclarationValid = validateResultDeclaration(documentData.source);
    sourceCode.dataset.source = documentData.source;
    sourceCode.dataset.resultDeclarationValid = String(scenario.resultDeclarationValid);
    if (!scenario.resultDeclarationValid) return;

    scenario.resultDeclarationBaseSource = null;
    scenario.resultDeclarationDraft = '';
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

  function updateResultDeclarationFromInput(event) {
    const input = event.target.closest('[data-result-declaration-input]');
    if (!input || !sourceCode.contains(input)) return false;
    if (scenario.state !== 'result-declaration-editing') return true;
    input.value = input.value.replace(/[\r\n]/g, '');
    input.style.width = `${Math.max(13, input.value.length)}ch`;
    applyResultDeclarationDraft(input.value);
    return true;
  }

  function handleResultDeclarationLineClick(event) {
    const line = event.target.closest('[data-editor-line="3"]');
    if (!line || !sourceCode.contains(line)) return;
    if (scenario.state === 'result-declaration-editing') {
      focusResultDeclarationInput();
      return;
    }
    beginResultDeclarationEdit(event);
  }

  function handleResultDeclarationStart(event) {
    if (scenario.state !== 'st001-location') return;
    const line = event.target.closest('[data-editor-line]');
    if (!line || !sourceCode.contains(line)) return;
    const printableCharacter = event.key.length === 1
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey;
    if (event.key !== 'Enter' && !printableCharacter) return;
    event.preventDefault();
    beginResultDeclarationEdit(event, printableCharacter ? event.key : '');
  }

  function handleSourcePaste(event) {
    if (event.target !== sourceCode) return;
    const mode = sourceCode.dataset.editorMode;
    if (mode !== 'calculate-body') return;
    const pastedSource = event.clipboardData?.getData('text/plain');
    if (!pastedSource) return;
    event.preventDefault();

    const insertedSource = pastedSource.replace(/\r\n?/g, '\n');
    const currentSource = sourceCode.textContent;
    const selection = readSourceSelection();
    const start = Math.max(0, Math.min(
      selection ? selection.start : currentSource.length,
      currentSource.length
    ));
    const end = Math.max(start, Math.min(
      selection ? selection.end : currentSource.length,
      currentSource.length
    ));
    const nextSource = currentSource.slice(0, start) + insertedSource + currentSource.slice(end);

    sourceCode.textContent = nextSource;
    setSourceCaret(start + insertedSource.length);
    applyCalculateBodySource(nextSource);
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

  sourceCode.addEventListener('input', event => {
    if (updateResultDeclarationFromInput(event)) return;
    if (event.target === sourceCode && scenario.state === 'calculate-body-editing') {
      updateCalculateBodyFromEditor();
      return;
    }
    const input = event.target.closest('[data-editable-function-name]');
    if (!input || !sourceCode.contains(input)) return;
    if (scenario.activeDocument !== 'compute-a') return;
    if (!canEditFunctionName()) return;

    const nextIdentifier = input.value.replace(/[^A-Za-z0-9_]/g, '');
    const documentData = DOCUMENTS['compute-a'];
    documentData.source = replaceFunctionIdentifier(documentData.source, nextIdentifier);
    input.value = getFunctionIdentifier(documentData.source);
    setIdentifierInputWidth(input);
    scenario.renameValid = validateFunctionRename(documentData.source);
    sourceCode.dataset.source = documentData.source;
    sourceCode.dataset.renameValid = String(scenario.renameValid);

    if (scenario.renameValid) {
      documentData.name = 'calculate';
      setState('name-conflict-fixed-source');
      setCompileVisual('default', false);
      syncDocumentName('compute-a');
    } else {
      setState('name-conflict-editing');
      setCompileVisual('default', true);
    }
    setConflictMarkers(scenario.hasCmp101);
  });

  sourceCode.addEventListener('paste', handleSourcePaste);

  sourceCode.addEventListener('click', event => {
    beginCalculateBodyEdit(event);
    handleResultDeclarationLineClick(event);
  });

  sourceCode.addEventListener('keydown', event => {
    handleResultDeclarationStart(event);
    if (sourceCode.getAttribute('role') !== 'button') return;
    if (!['Enter', ' '].includes(event.key)) return;
    beginCalculateBodyEdit(event);
  });

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
      if (tab.dataset.messageTab === 'analyzer'
        && scenario.bodyValid
        && !scenario.resultDeclarationValid
        && scenario.state === 'calculate-body-with-undeclared-result') {
        setState('analyzer-messages-st001');
      }
      setActiveMessageTab(tab.dataset.messageTab);
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
