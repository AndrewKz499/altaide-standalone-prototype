(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const workspace = document.querySelector('.workspace');
  const split = document.getElementById('content-split');
  const verticalResizer = document.getElementById('vertical-resizer');
  const horizontalResizer = document.getElementById('horizontal-resizer');
  const compileButton = document.querySelector('[data-action="compile"]');
  const bottomTabLabel = document.getElementById('bottom-tab-label');
  const verticalPanelButtons = [...document.querySelectorAll('.vertical-tabs button')];
  const tableScroll = document.querySelector('.table-scroll');
  const consoleOutput = document.getElementById('console-output');
  const rows = document.getElementById('message-rows');
  const counterButtons = [...document.querySelectorAll('[data-counter]')];
  const statusbarBuild = document.getElementById('statusbar-build');
  const statusbarLabel = document.getElementById('statusbar-label');
  const statusbarProgress = document.getElementById('statusbar-progress-value');
  const codeCanvas = document.querySelector('.code-canvas');
  const sourceCode = document.querySelector('.source-code code');
  const editorTabs = [...document.querySelectorAll('[data-editor-tab]')];
  const treeRows = [...document.querySelectorAll('.tree-row')];
  const messagePanelButton = document.querySelector('[data-panel="messages"]');
  const contextFilterButton = document.querySelector('.context-actions button:last-child');

  const PRESS_DELAY_MS = 800;
  const RUNNING_DELAY_MS = 3200;
  const EMPTY_ROW_COUNT = 17;
  const TAB_DOCUMENT_IDS = {
    'compute-a': 'compute-main',
    'compute-b': 'compute-definition'
  };

  const DOCUMENT_TEXT = {
    'compute-main': `FUNCTION compute : DINT
VAR_INPUT
  t : INT;
END_VAR
  compute := t * 2;
END_FUNCTION`,
    'compute-definition': `FUNCTION compute : DINT

END_FUNCTION`
  };

  const CALCULATE_DEFINITION_SOURCE = `FUNCTION calculate : DINT

END_FUNCTION`;

  const CALCULATE_BODY_SOURCE = `FUNCTION calculate : DINT
VAR_INPUT

    t : INT;
END_VAR
    result := t * 5;
    calculate := result;
END_FUNCTION`;

  const CALCULATE_DEFINITION_MARKUP = `<span class="kw">FUNCTION</span> <span class="name">calculate</span> <span class="op">:</span> <span class="type">DINT</span>

<span class="kw">END_FUNCTION</span>`;

  const DOCUMENT_MARKUP = {
    'compute-main': `<span class="kw" data-diagnostic-target="compute">FUNCTION</span> <span class="name" data-diagnostic-target="compute">compute</span> <span class="op">:</span> <span class="type">DINT</span>
<span class="kw">VAR_INPUT</span>
  <span class="name">t</span> <span class="op">:</span> <span class="type">INT</span><span class="op">;</span>
<span class="kw">END_VAR</span>
  <span class="name">compute</span> <span class="op">:=</span> <span class="name">t</span> <span class="op">*</span> <span class="num">2</span><span class="op">;</span>
<span class="kw">END_FUNCTION</span>`,
    'compute-definition': `<span class="kw" data-diagnostic-target="compute">FUNCTION</span> <span class="name" data-diagnostic-target="compute">compute</span> <span class="op">:</span> <span class="type">DINT</span>

<span class="kw">END_FUNCTION</span>`
  };

  const CALCULATE_LINE_MARKUP = [
    '<span class="kw">FUNCTION</span> <span class="name">calculate</span> <span class="op">:</span> <span class="type">DINT</span>',
    '<span class="kw">VAR_INPUT</span>',
    '',
    '    <span class="variable">t</span> <span class="op">:</span> <span class="type">INT</span><span class="op">;</span>',
    '<span class="kw">END_VAR</span>',
    '    <span class="result" data-diagnostic-target="result">result</span> <span class="op">:=</span> <span class="variable">t</span> <span class="math">*</span> <span class="num">5</span><span class="op">;</span>',
    '    <span class="name">calculate</span> <span class="op">:=</span> <span class="result" data-diagnostic-target="result">result</span><span class="op">;</span>',
    '<span class="kw">END_FUNCTION</span>'
  ];

  const CALCULATE_MARKUP = CALCULATE_LINE_MARKUP.join('\n');
  const CALCULATE_NAVIGATION_MARKUP = CALCULATE_LINE_MARKUP
    .map((line, index) => `<span class="source-line" data-editor-line="${index + 1}">${line}</span>`)
    .join('');
  const FIXED_CALCULATE_LINE_MARKUP = [
    '<span class="kw">FUNCTION</span> <span class="name">calculate</span> <span class="op">:</span> <span class="type">DINT</span>',
    '<span class="kw">VAR_INPUT</span>',
    '    <span class="result">result</span> <span class="op">:</span> <span class="type">INT</span><span class="op">;</span>',
    '    <span class="variable">t</span> <span class="op">:</span> <span class="type">INT</span><span class="op">;</span>',
    '<span class="kw">END_VAR</span>',
    '    <span class="result" data-diagnostic-target="result">result</span> <span class="op">:=</span> <span class="variable">t</span> <span class="math">*</span> <span class="num">5</span><span class="op">;</span>',
    '    <span class="name">calculate</span> <span class="op">:=</span> <span class="result" data-diagnostic-target="result">result</span><span class="op">;</span>',
    '<span class="kw">END_FUNCTION</span>'
  ];
  const FIXED_CALCULATE_MARKUP = FIXED_CALCULATE_LINE_MARKUP.join('\n');

  const RUNNING_CONSOLE_LINES = [
    'Запущена генерация кода',
    'Журнал сообщений - создан',
    'Генерация файлов',
    'NEED YOGI implementation:Please, Build this target with fort stageII',
    'Генерация исходных текстов завершена',
    'executing \`C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --',
    'crate-name sys_prg code\\HardwareSpecific\\function.st code\\headers\\libc.sth',
    'warning: 2 hidden warnings emitted',
    'to show hidden diagnostics rerun with "--verbose" flag',
    'executing "C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --crate-name plc_prg fort\\main\\..\\..\\code\\main.st"',
    'error: failed to resolve: could not find value "b"'
  ];

  const RECOMPILE_CONSOLE_LINES = [
    'Запущена генерация кода',
    'Журнал сообщений - создан',
    'Генерация файлов',
    'NEED YOGI implementation:Please, Build this target with fort stageII',
    'Генерация исходных текстов завершена',
    'executing `C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --crate-name sys_prg code\\HardwareSpecific\\function.st code\\headers\\libc.sth',
    'warning: 2 hidden warnings emitted',
    'to show hidden diagnostics rerun with `--verbose` flag',
    'executing `C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --crate-name plc_prg fort\\main\\..\\..\\code\\main.st -',
    'error: failed to resolve: could not find value `b`',
    '--> C:\\Users\\t.yashina\\Documents\\Alta\\Project_9\\POU\\programm_1.st:5:1',
    '| 5 | b:=a;',
    '|   | ^ could not find value `b`',
    'error: unresolved error: cannot write to a unresolved item',
    '--> C:\\Users\\t.yashina\\Documents\\Alta\\Project_9\\POU\\programm_1.st:5:1',
    '| 5 | b:=a;',
    '|   | ^ cannot write to a unresolved item',
    'error: aborting due to 3 previous errors; 2 hidden warnings emitted',
    'error: process exited with error (exit code: 1)',
    'command: `C:\\Users\\t.yashina\\AppData\\Roaming\\AltaIDE\\Compiler\\bin\\castle.exe --crate-name plc_prg code\\headers\\libc.sth code\\headers\\libc_user.sth code\\headers\\HSAL\\gpio_special_functions.sth`'
  ];

  const FAILED_DIAGNOSTICS = [
    {
      id: 'cmp101-root',
      severity: 'error',
      source: 'Компилятор',
      code: 'CMP101',
      description: "Функция 'compute' определена несколько раз. Функция с таким именем уже существует.",
      location: '\\test\\src\\main.st:3:1'
    },
    {
      id: 'cmp101-definition',
      parentId: 'cmp101-root',
      severity: 'info',
      source: 'Компилятор',
      code: 'CMP101',
      description: "Первый раз функция 'compute' определена здесь",
      location: '\\test\\src\\compute.st:4:1'
    }
  ];

  const ANALYZER_DIAGNOSTICS = [
    {
      id: 'st001-result',
      severity: 'error',
      source: 'Анализатор',
      code: 'ST001',
      description: "Переменная 'result' не объявлена.",
      location: 'calculate.st:6'
    }
  ];

  const ANALYZER_COUNTERS = { error: 2, warning: 0, info: 1 };
  const initialEditorContents = createEditorContents();

  const scenarioState = {
    step: 'initial',
    compileStatus: 'idle',
    toolbar: {
      compile: 'default'
    },
    bottomPanel: {
      view: 'messages',
      title: 'Сообщения',
      consoleLines: []
    },
    diagnostics: {
      items: [],
      expandedIds: []
    },
    tree: {
      selectedId: 'compute-main'
    },
    editorTabs: {
      activeId: 'compute-a'
    },
    documents: initialEditorContents,
    activeDocument: 'compute-main',
    editorContent: initialEditorContents['compute-main'],
    selectedDiagnostic: null,
    counters: {
      error: 0,
      warning: 0,
      info: 0
    },
    statusBar: {
      mode: 'idle',
      label: '',
      progress: 0
    }
  };

  let compileSequence = 0;
  let compileTimers = [];

  function createEditorContent(documentId, revealLocation = null) {
    return {
      document: {
        id: documentId,
        source: DOCUMENT_TEXT[documentId],
        dirty: false
      },
      revealLocation,
      activeLine: null,
      highlightedLines: [],
      validation: {
        computeRename: {
          satisfied: false
        },
        calculateBody: {
          satisfied: false
        },
        resultDeclaration: {
          satisfied: false
        }
      }
    };
  }

  function createEditorContents() {
    return Object.fromEntries(
      Object.keys(DOCUMENT_TEXT).map(documentId => [documentId, createEditorContent(documentId)])
    );
  }

  function replaceFunctionIdentifier(source, identifier) {
    return source.replace(
      /^(FUNCTION\s+)([^:\n]*?)(\s*:\s*DINT)/m,
      (_, prefix, previousIdentifier, suffix) => prefix + identifier + suffix
    );
  }

  function validateFunctionRename(source) {
    return /^FUNCTION\s+calculate\b/m.test(source)
      && !/^FUNCTION\s+compute\b/m.test(source);
  }

  function validateCalculateBody(source) {
    const lines = source
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(line => line.trim());
    const requiredLines = [
      /^FUNCTION\s+calculate\s*:\s*DINT$/,
      /^VAR_INPUT$/,
      /^t\s*:\s*INT\s*;$/,
      /^END_VAR$/,
      /^result\s*:=\s*t\s*\*\s*5\s*;$/,
      /^calculate\s*:=\s*result\s*;$/,
      /^END_FUNCTION$/
    ];
    let cursor = 0;
    return requiredLines.every((pattern, requiredIndex) => {
      const nextIndex = lines.findIndex(
        (line, index) => index >= cursor && line !== '' && pattern.test(line)
      );
      if (nextIndex < 0) return false;
      // сценарий резервирует пустую строку сразу после VAR_INPUT под result : INT;
      if (pattern.source === '^VAR_INPUT$' && lines[nextIndex + 1] !== '') return false;
      cursor = nextIndex + 1;
      return true;
    });
  }

  function validateResultDeclaration(source) {
    const variableBlock = source.match(/\bVAR_INPUT\b([\s\S]*?)\bEND_VAR\b/);
    return Boolean(
      variableBlock
      && /^\s*result\s*:\s*INT\s*;\s*$/m.test(variableBlock[1])
    );
  }

  // Сценарий резервирует пустую строку сразу после VAR_INPUT.
  // Объявление занимает именно её — документ остаётся восьмистрочным.
  function replaceResultDeclarationLine(source, declaration) {
    return source.replace(
      /(\bVAR_INPUT\b\n)[^\n]*\n/,
      `$1    ${declaration}\n`
    );
  }

  function isCompileBusy() {
    return scenarioState.compileStatus === 'pressed'
      || scenarioState.compileStatus === 'running';
  }

  function renderToolbar() {
    const isBusy = isCompileBusy();
    root.dataset.scenarioStep = scenarioState.step;
    compileButton.dataset.state = scenarioState.toolbar.compile;
    compileButton.disabled = isBusy;
    compileButton.setAttribute('aria-pressed', String(isBusy));
    compileButton.setAttribute('aria-disabled', String(isBusy));
  }

  function renderBottomPanel() {
    const showConsole = scenarioState.bottomPanel.view === 'console';
    bottomTabLabel.textContent = scenarioState.bottomPanel.title;
    verticalPanelButtons.forEach(button => {
      const activePanel = showConsole ? 'terminal' : 'messages';
      button.classList.toggle('is-active', button.dataset.panel === activePanel);
    });
    tableScroll.hidden = showConsole;
    consoleOutput.hidden = !showConsole;
    consoleOutput.textContent = scenarioState.bottomPanel.consoleLines.join('\n');
  }

  function createEmptyDiagnosticRow() {
    const row = document.createElement('tr');
    row.innerHTML = '<td></td><td></td><td></td><td></td><td></td>';
    return row;
  }

  function createDiagnosticRow(item) {
    const row = document.createElement('tr');
    row.className = 'diagnostic-row';
    row.dataset.diagnosticId = item.id;
    if (item.parentId) row.classList.add('diagnostic-child');

    const typeCell = document.createElement('td');
    typeCell.className = 'diagnostic-type';
    const hasChildren = scenarioState.diagnostics.items.some(candidate => candidate.parentId === item.id);
    if (hasChildren) {
      const expanded = scenarioState.diagnostics.expandedIds.includes(item.id);
      const disclosure = document.createElement('button');
      disclosure.className = 'diagnostic-disclosure';
      disclosure.type = 'button';
      disclosure.dataset.diagnosticId = item.id;
      disclosure.setAttribute('aria-label', expanded ? 'Вложенная ошибка открыта' : 'Показать вложенную ошибку');
      disclosure.setAttribute('aria-expanded', String(expanded));
      typeCell.append(disclosure);
    } else if (!item.parentId) {
      const disclosureSpacer = document.createElement('span');
      disclosureSpacer.className = 'diagnostic-disclosure-spacer';
      disclosureSpacer.setAttribute('aria-hidden', 'true');
      typeCell.append(disclosureSpacer);
    }
    const iconSlot = document.createElement('span');
    iconSlot.className = 'diagnostic-icon-slot';
    const icon = document.createElement('img');
    icon.src = item.severity === 'error' ? 'assets/icons/status-error.svg' : 'assets/icons/status-info.svg';
    icon.alt = '';
    iconSlot.append(icon);
    typeCell.append(iconSlot);

    const sourceCell = document.createElement('td');
    sourceCell.textContent = item.source;
    const codeCell = document.createElement('td');
    codeCell.textContent = item.code;
    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = item.description;
    const locationCell = document.createElement('td');
    const locationIsInteractive = (
      scenarioState.step === 'diagnostic-expanded'
      && item.id === 'cmp101-definition'
    ) || (
      scenarioState.step === 'analyzer-message'
      && item.id === 'st001-result'
      && item.location === 'calculate.st:6'
    );
    const location = document.createElement(locationIsInteractive ? 'button' : 'span');
    location.className = locationIsInteractive ? 'diagnostic-location-button' : 'diagnostic-location';
    if (locationIsInteractive) {
      location.type = 'button';
      location.dataset.diagnosticLocation = item.location;
      location.dataset.diagnosticId = item.id;
      location.setAttribute('aria-label', `Перейти к ${item.location}`);
    }
    location.textContent = item.location;
    locationCell.append(location);

    row.append(typeCell, sourceCell, codeCell, descriptionCell, locationCell);
    return row;
  }

  function renderDiagnostics() {
    const visibleItems = scenarioState.diagnostics.items.filter(item => {
      return !item.parentId || scenarioState.diagnostics.expandedIds.includes(item.parentId);
    });
    const renderedRows = visibleItems.map(createDiagnosticRow);
    const emptyRows = Array.from(
      { length: Math.max(0, EMPTY_ROW_COUNT - renderedRows.length) },
      createEmptyDiagnosticRow
    );
    rows.replaceChildren(...renderedRows, ...emptyRows);
  }

  function handleDiagnosticDisclosureClick(event) {
    const disclosure = event.target.closest('.diagnostic-disclosure');
    if (!disclosure || !rows.contains(disclosure)) return;
    if (scenarioState.step !== 'compile-failed') return;

    const diagnosticId = disclosure.dataset.diagnosticId;
    const hasNestedDiagnostic = scenarioState.diagnostics.items.some(item => item.parentId === diagnosticId);
    if (!hasNestedDiagnostic || scenarioState.diagnostics.expandedIds.includes(diagnosticId)) return;

    scenarioState.step = 'diagnostic-expanded';
    scenarioState.diagnostics.expandedIds = [diagnosticId];
    const parentDiagnostic = scenarioState.diagnostics.items.find(item => item.id === diagnosticId);
    if (parentDiagnostic) parentDiagnostic.location = '\\test\\src\\compute.st:3:1';
    renderScenarioState();
  }

  function handleDiagnosticLocationClick(event) {
    const location = event.target.closest('.diagnostic-location-button');
    if (!location || !rows.contains(location)) return;
    if (scenarioState.step === 'analyzer-message') {
      if (location.dataset.diagnosticId !== 'st001-result') return;
      if (location.dataset.diagnosticLocation !== 'calculate.st:6') return;

      scenarioState.step = 'analyzer-location';
      scenarioState.tree.selectedId = 'compute-definition';
      scenarioState.editorTabs.activeId = 'compute-b';
      scenarioState.activeDocument = 'compute-definition';
      scenarioState.editorContent.activeLine = 6;
      scenarioState.editorContent.highlightedLines = [6];
      scenarioState.editorContent.revealLocation = {
        path: 'calculate.st',
        line: 6,
        column: 5
      };
      scenarioState.selectedDiagnostic = 'st001-result';
      renderAnalyzerLocation();
      return;
    }
    if (scenarioState.step !== 'diagnostic-expanded') return;
    if (location.dataset.diagnosticId !== 'cmp101-definition') return;
    if (location.dataset.diagnosticLocation !== '\\test\\src\\compute.st:4:1') return;

    scenarioState.step = 'fix-error';
    scenarioState.tree.selectedId = 'compute-definition';
    scenarioState.editorTabs.activeId = 'compute-b';
    scenarioState.activeDocument = 'compute-definition';
    scenarioState.editorContent = scenarioState.documents['compute-definition'];
    scenarioState.editorContent.revealLocation = {
      path: '\\test\\src\\compute.st',
      line: 4,
      column: 1
    };
    scenarioState.editorContent.activeLine = null;
    scenarioState.editorContent.highlightedLines = [];
    scenarioState.selectedDiagnostic = 'cmp101-definition';
    scenarioState.diagnostics.items = scenarioState.diagnostics.items.map(item => ({
      ...item,
      location: item.id === 'cmp101-root'
        ? '\\test\\src\\main.st:3:1'
        : '\\test\\src\\main.st:4:1'
    }));
    renderScenarioState();
  }

  function renderCounters() {
    const labels = { error: 'Ошибки', warning: 'Предупреждения', info: 'Информация' };
    counterButtons.forEach(button => {
      const type = button.dataset.counter;
      const value = scenarioState.counters[type];
      button.querySelector('span').textContent = String(value);
      button.setAttribute('aria-label', labels[type] + ': ' + value);
    });
  }

  function renderStatusBar() {
    const isBuilding = scenarioState.statusBar.mode === 'building';
    statusbarBuild.hidden = !isBuilding;
    statusbarLabel.textContent = scenarioState.statusBar.label;
    statusbarProgress.style.width = (scenarioState.statusBar.progress * 100) + '%';
  }

  function renderTreeSelection() {
    treeRows.forEach(row => {
      const selected = row.dataset.treeNode === scenarioState.tree.selectedId;
      row.classList.toggle('is-selected', selected);
      if (selected) row.setAttribute('aria-selected', 'true');
      else row.removeAttribute('aria-selected');
    });
  }

  function renderEditorTabs() {
    editorTabs.forEach(tab => {
      const active = tab.dataset.editorTab === scenarioState.editorTabs.activeId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  function renderDocumentName() {
    const definitionContent = scenarioState.documents['compute-definition'];
    const targetName = definitionContent.validation.computeRename.satisfied
      ? 'calculate'
      : 'compute';
    const treeLabel = document.querySelector(
      '[data-tree-node="compute-definition"] > span:not(.chevron-spacer)'
    );
    const tabLabel = document.querySelector(
      '[data-editor-tab="compute-b"] > span:not(.tab-close)'
    );
    if (treeLabel) treeLabel.textContent = targetName;
    if (tabLabel) tabLabel.textContent = targetName;
  }

  function renderDefinitionDocument() {
    const keyword = document.createElement('span');
    keyword.className = 'kw';
    keyword.textContent = 'FUNCTION';
    const identifierTarget = createCodeActionTarget(
      'rename-function',
      'compute',
      'Исправить имя функции compute на calculate',
      'rename-code-action name'
    );
    identifierTarget.dataset.diagnosticTarget = 'compute';
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
      identifierTarget,
      document.createTextNode(' '),
      operator,
      document.createTextNode(' '),
      type,
      document.createTextNode('\n\n'),
      endKeyword
    );
  }

  function appendHighlightedSource(target, source) {
    const tokenPattern = /\b(?:FUNCTION|VAR_INPUT|END_VAR|END_FUNCTION)\b|\b(?:DINT|INT)\b|:=|[:;*]|\b\d+\b|\b(?:calculate|compute|result|t)\b/g;
    const keywordTokens = new Set(['FUNCTION', 'VAR_INPUT', 'END_VAR', 'END_FUNCTION']);
    const typeTokens = new Set(['DINT', 'INT']);
    let sourceIndex = 0;

    source.replace(tokenPattern, (token, tokenIndex) => {
      target.append(document.createTextNode(source.slice(sourceIndex, tokenIndex)));
      const tokenElement = document.createElement('span');
      if (keywordTokens.has(token)) tokenElement.className = 'kw';
      else if (typeTokens.has(token)) tokenElement.className = 'type';
      else if (token === 'calculate' || token === 'compute') tokenElement.className = 'name';
      else if (token === 'result') {
        tokenElement.className = 'result';
        tokenElement.dataset.diagnosticTarget = 'result';
      } else if (token === 't') tokenElement.className = 'variable';
      else if (/^\d+$/.test(token)) tokenElement.className = 'num';
      else if (token === '*') tokenElement.className = 'math';
      else tokenElement.className = 'op';
      tokenElement.textContent = token;
      target.append(tokenElement);
      sourceIndex = tokenIndex + token.length;
      return token;
    });
    target.append(document.createTextNode(source.slice(sourceIndex)));
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

  function renderHighlightedSource(source, interactive) {
    if (source === CALCULATE_DEFINITION_SOURCE && !interactive) {
      sourceCode.innerHTML = CALCULATE_DEFINITION_MARKUP;
    } else {
      const fragment = document.createDocumentFragment();
      const insertionOffset = interactive ? findReservedBodyOffset(source) : null;
      if (insertionOffset === null) {
        appendHighlightedSource(fragment, source);
      } else {
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
      }
      sourceCode.replaceChildren(fragment);
    }
  }

  // Смещение начала первой пустой строки между заголовком FUNCTION и END_FUNCTION.
  // Именно её сценарий резервирует под тело функции.
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

  function renderResultDeclarationTarget() {
    sourceCode.innerHTML = [
      `<span class="source-line" data-editor-line="1">${FIXED_CALCULATE_LINE_MARKUP[0]}</span>`,
      `<span class="source-line" data-editor-line="2">${FIXED_CALCULATE_LINE_MARKUP[1]}</span>`,
      '<span class="source-line" data-editor-line="3"></span>',
      `<span class="source-line" data-editor-line="4">${FIXED_CALCULATE_LINE_MARKUP[3]}</span>`,
      `<span class="source-line" data-editor-line="5">${FIXED_CALCULATE_LINE_MARKUP[4]}</span>`,
      `<span class="source-line" data-editor-line="6">${FIXED_CALCULATE_LINE_MARKUP[5]}</span>`,
      `<span class="source-line" data-editor-line="7">${FIXED_CALCULATE_LINE_MARKUP[6]}</span>`,
      `<span class="source-line" data-editor-line="8">${FIXED_CALCULATE_LINE_MARKUP[7]}</span>`
    ].join('');
    sourceCode.querySelector('[data-editor-line="3"]').append(
      document.createTextNode('    '),
      createCodeActionTarget(
        'declare-result',
        'Объявите переменную',
        'Объявить переменную result'
      )
    );
  }

  function renderEditorContent() {
    const editorDocument = scenarioState.editorContent.document;
    const editsCalculateBody = editorDocument.id === 'compute-definition'
      && scenarioState.editorContent.validation.computeRename.satisfied
      && !scenarioState.editorContent.validation.calculateBody.satisfied;
    if (editsCalculateBody) {
      renderHighlightedSource(editorDocument.source, canEditCalculateBody());
    } else if (editorDocument.id === 'compute-definition'
      && scenarioState.step === 'fix-error'
      && !scenarioState.editorContent.validation.computeRename.satisfied) {
      renderDefinitionDocument();
    } else if (editorDocument.id === 'compute-definition'
      && scenarioState.step === 'analyzer-location'
      && canDeclareResult()) {
      renderResultDeclarationTarget();
    } else if (editorDocument.id === 'compute-definition'
      && scenarioState.editorContent.validation.computeRename.satisfied) {
      const showsFixedSource = [
        'result-declaration-fixed',
        'final-compile-pressed'
      ].includes(scenarioState.step);
      const showsEditorLines = RESULT_DECLARATION_STEPS.includes(scenarioState.step);
      const markup = showsEditorLines
        ? CALCULATE_NAVIGATION_MARKUP
        : showsFixedSource
          ? FIXED_CALCULATE_MARKUP
          : CALCULATE_MARKUP;
      if (sourceCode.innerHTML !== markup) sourceCode.innerHTML = markup;
    } else {
      const markup = DOCUMENT_MARKUP[editorDocument.id];
      if (markup && sourceCode.innerHTML !== markup) sourceCode.innerHTML = markup;
    }
    sourceCode.dataset.source = editorDocument.source;
    sourceCode.dataset.dirty = String(editorDocument.dirty);
    sourceCode.dataset.renameValid = String(
      scenarioState.editorContent.validation.computeRename.satisfied
    );
    sourceCode.dataset.calculateBodyValid = String(
      scenarioState.editorContent.validation.calculateBody.satisfied
    );
    sourceCode.dataset.resultDeclarationValid = String(
      scenarioState.editorContent.validation.resultDeclaration.satisfied
    );
    if (scenarioState.step === 'final-compiling') {
      sourceCode.dataset.visualSnapshot = 'figma-21593-702767';
    } else {
      delete sourceCode.dataset.visualSnapshot;
    }
    const activeLine = scenarioState.editorContent.activeLine;
    const highlightedLines = scenarioState.editorContent.highlightedLines;
    if (activeLine) sourceCode.dataset.activeLine = String(activeLine);
    else delete sourceCode.dataset.activeLine;
    sourceCode.dataset.highlightedLines = highlightedLines.join(',');
    sourceCode.querySelectorAll('[data-editor-line]').forEach(line => {
      const lineNumber = Number(line.dataset.editorLine);
      const highlighted = highlightedLines.includes(lineNumber);
      line.classList.toggle('is-active-line', highlighted);
      if (lineNumber === activeLine) line.setAttribute('tabindex', '-1');
      else line.removeAttribute('tabindex');
    });
    const target = scenarioState.editorContent.revealLocation;
    if (target) {
      sourceCode.dataset.revealPath = target.path;
      sourceCode.dataset.revealLine = String(target.line);
      sourceCode.dataset.revealColumn = String(target.column);
      const targetLine = sourceCode.querySelector(`[data-editor-line="${target.line}"]`);
      if (targetLine) {
        const canvasBounds = codeCanvas.getBoundingClientRect();
        const lineBounds = targetLine.getBoundingClientRect();
        if (lineBounds.top < canvasBounds.top || lineBounds.bottom > canvasBounds.bottom) {
          codeCanvas.scrollTop = Math.max(0, targetLine.offsetTop - codeCanvas.clientHeight / 2);
        }
        codeCanvas.scrollLeft = 0;
        targetLine.focus({ preventScroll: true });
      } else {
        codeCanvas.scrollTop = 0;
        codeCanvas.scrollLeft = 0;
      }
    } else {
      delete sourceCode.dataset.revealPath;
      delete sourceCode.dataset.revealLine;
      delete sourceCode.dataset.revealColumn;
    }
  }

  function applyFunctionRename() {
    if (scenarioState.step !== 'fix-error') return;
    if (scenarioState.activeDocument !== 'compute-definition') return;

    const editorDocument = scenarioState.editorContent.document;
    editorDocument.source = replaceFunctionIdentifier(editorDocument.source, 'calculate');
    editorDocument.dirty = true;
    scenarioState.editorContent.validation.computeRename.satisfied = validateFunctionRename(
      editorDocument.source
    );
    scenarioState.editorContent.validation.calculateBody.satisfied = false;
    renderEditorContent();
    renderToolbar();
    renderDocumentName();
    renderDiagnosticSurfaces();
  }

  function applyCalculateBodySource(source) {
    const editorDocument = scenarioState.editorContent.document;
    editorDocument.source = source.replace(/\r\n?/g, '\n');
    editorDocument.dirty = true;
    const satisfied = validateCalculateBody(editorDocument.source);
    scenarioState.editorContent.validation.calculateBody.satisfied = satisfied;
    sourceCode.dataset.source = editorDocument.source;
    sourceCode.dataset.dirty = 'true';
    sourceCode.dataset.calculateBodyValid = String(satisfied);
    if (!satisfied) return;

    const compilerDiagnostics = scenarioState.diagnostics.items
      .filter(item => !isAnalyzerDiagnosticId(item.id));
    scenarioState.diagnostics.items = [
      ...ANALYZER_DIAGNOSTICS.map(item => ({ ...item })),
      ...compilerDiagnostics
    ];
    scenarioState.counters = { ...ANALYZER_COUNTERS };
    scenarioState.selectedDiagnostic = null;
    renderEditorContent();
    renderDiagnostics();
    renderCounters();
    renderDiagnosticSurfaces();
  }

  const RESULT_DECLARATION_STEPS = [
    'recompile-complete-console',
    'analyzer-message',
    'analyzer-location'
  ];

  function canDeclareResult() {
    return RESULT_DECLARATION_STEPS.includes(scenarioState.step)
      && scenarioState.activeDocument === 'compute-definition'
      && scenarioState.editorContent.validation.calculateBody.satisfied
      && !scenarioState.editorContent.validation.resultDeclaration.satisfied;
  }

  function applyResultDeclaration() {
    if (scenarioState.step !== 'analyzer-location') return;
    if (!canDeclareResult()) return;
    const editorDocument = scenarioState.editorContent.document;
    editorDocument.source = replaceResultDeclarationLine(editorDocument.source, 'result : INT;');
    editorDocument.dirty = true;
    const satisfied = validateResultDeclaration(editorDocument.source);
    scenarioState.editorContent.validation.resultDeclaration.satisfied = satisfied;
    if (!satisfied) return;

    scenarioState.step = 'result-declaration-fixed';
    scenarioState.editorContent.activeLine = null;
    scenarioState.editorContent.highlightedLines = [];
    scenarioState.editorContent.revealLocation = null;
    scenarioState.diagnostics.items = [];
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.selectedDiagnostic = null;
    scenarioState.counters = { ...ANALYZER_COUNTERS };
    renderResultDeclarationFixed();
  }

  function handleCodeActionClick(event) {
    const target = event.target.closest('[data-code-action]');
    if (!target || !sourceCode.contains(target)) return;
    event.preventDefault();

    if (target.dataset.codeAction === 'rename-function') {
      applyFunctionRename();
    } else if (target.dataset.codeAction === 'insert-calculate-body') {
      if (canEditCalculateBody()) applyCalculateBodySource(CALCULATE_BODY_SOURCE);
    } else if (target.dataset.codeAction === 'declare-result') {
      applyResultDeclaration();
    }
  }

  const CALCULATE_BODY_EDIT_STEPS = [
    'fix-error',
    'recompile-complete-console',
    'analyzer-message'
  ];

  function canEditCalculateBody() {
    return CALCULATE_BODY_EDIT_STEPS.includes(scenarioState.step)
      && scenarioState.activeDocument === 'compute-definition'
      && scenarioState.editorContent.validation.computeRename.satisfied
      && !scenarioState.editorContent.validation.calculateBody.satisfied;
  }

  function isAnalyzerDiagnosticId(id) {
    return ANALYZER_DIAGNOSTICS.some(item => item.id === id);
  }

  function hasDiagnostic(id) {
    return scenarioState.diagnostics.items.some(item => item.id === id);
  }

  function renderDiagnosticSurfaces() {
    const computeConflictUnresolved = hasDiagnostic('cmp101-root');
    const resultDeclarationResolved = [
      'result-declaration-fixed',
      'final-compile-pressed',
      'final-compiling'
    ].includes(scenarioState.step);
    const showsAnalyzerResult = hasDiagnostic('st001-result')
      || scenarioState.documents['compute-definition'].validation.calculateBody.satisfied;
    const limitsAnalyzerMarkerToCalculate = [
      'recompiling',
      'recompile-complete-console',
      'analyzer-message',
      'analyzer-location',
      'result-declaration-editing'
    ].includes(scenarioState.step);
    const diagnosticTargets = [...document.querySelectorAll('[data-diagnostic-target="compute"]')];
    diagnosticTargets.forEach(target => {
      const treeRow = target.matches('.tree-row');
      const isCalculateTreeRow = target.dataset.treeNode === 'compute-definition';
      const showDiagnostic = treeRow
        && !resultDeclarationResolved
        && (
          computeConflictUnresolved
          || (showsAnalyzerResult && (!limitsAnalyzerMarkerToCalculate || isCalculateTreeRow))
        );
      target.classList.toggle('has-diagnostic', showDiagnostic);
      target.classList.remove('has-diagnostic-badge');
    });
    const computeSourceTokens = [...document.querySelectorAll('.source-code .name')]
      .filter(token => (
        token.matches('input') ? token.value === 'compute' : token.textContent === 'compute'
      ));
    computeSourceTokens.forEach(token => token.classList.toggle(
      'has-diagnostic',
      computeConflictUnresolved && !showsAnalyzerResult
    ));
    const resultTokens = [...document.querySelectorAll('[data-diagnostic-target="result"]')];
    resultTokens.forEach(token => token.classList.toggle(
      'has-diagnostic',
      (!resultDeclarationResolved && showsAnalyzerResult)
        || scenarioState.step === 'final-compiling'
    ));
    messagePanelButton.classList.toggle('has-notification', [
      'compiling',
      'final-compiling'
    ].includes(scenarioState.step));
    contextFilterButton.classList.remove('has-notification');
  }

  function renderScenarioState() {
    renderToolbar();
    renderBottomPanel();
    renderDiagnostics();
    renderCounters();
    renderStatusBar();
    renderTreeSelection();
    renderEditorTabs();
    renderEditorContent();
    renderDocumentName();
    renderDiagnosticSurfaces();
  }

  function renderAnalyzerLocation() {
    renderToolbar();
    renderDiagnostics();
    renderTreeSelection();
    renderEditorTabs();
    renderEditorContent();
    renderDocumentName();
    renderDiagnosticSurfaces();
  }

  function renderResultDeclarationFixed() {
    renderToolbar();
    renderDiagnostics();
    renderCounters();
    renderEditorContent();
    renderDocumentName();
    renderDiagnosticSurfaces();
  }

  function renderFinalCompilePressed() {
    renderToolbar();
    renderStatusBar();
    renderDiagnosticSurfaces();
  }

  function renderFinalCompiling() {
    renderToolbar();
    renderBottomPanel();
    renderDiagnostics();
    renderCounters();
    renderStatusBar();
    renderEditorContent();
    renderDiagnosticSurfaces();
  }

  function setInitialVisualState() {
    scenarioState.step = 'initial';
    scenarioState.compileStatus = 'idle';
    scenarioState.toolbar.compile = 'default';
    scenarioState.bottomPanel.view = 'messages';
    scenarioState.bottomPanel.title = 'Сообщения';
    scenarioState.bottomPanel.consoleLines = [];
    scenarioState.diagnostics.items = [];
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.tree.selectedId = 'compute-main';
    scenarioState.editorTabs.activeId = 'compute-a';
    scenarioState.documents = createEditorContents();
    scenarioState.activeDocument = 'compute-main';
    scenarioState.editorContent = scenarioState.documents['compute-main'];
    scenarioState.selectedDiagnostic = null;
    scenarioState.counters = { error: 0, warning: 0, info: 0 };
    scenarioState.statusBar = { mode: 'idle', label: '', progress: 0 };
  }

  function enterPressed(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'compile-pressed';
    scenarioState.compileStatus = 'pressed';
    scenarioState.toolbar.compile = 'pressed';
    scenarioState.bottomPanel.view = 'messages';
    scenarioState.bottomPanel.title = 'Сообщения';
    scenarioState.bottomPanel.consoleLines = [];
    scenarioState.diagnostics.items = [];
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.counters = { error: 0, warning: 0, info: 0 };
    scenarioState.statusBar = { mode: 'idle', label: '', progress: 0 };
    renderScenarioState();

    compileTimers.push(window.setTimeout(() => enterRunning(sequence), PRESS_DELAY_MS));
  }

  function enterRunning(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'compiling';
    scenarioState.compileStatus = 'running';
    scenarioState.toolbar.compile = 'active';
    scenarioState.bottomPanel.view = 'console';
    scenarioState.bottomPanel.title = 'Консоль';
    scenarioState.bottomPanel.consoleLines = [...RUNNING_CONSOLE_LINES];
    scenarioState.diagnostics.items = [];
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.counters = { error: 0, warning: 0, info: 0 };
    scenarioState.statusBar = { mode: 'building', label: 'Сборка проекта', progress: 0.4 };
    renderScenarioState();

    compileTimers.push(window.setTimeout(() => enterFailed(sequence), RUNNING_DELAY_MS));
  }

  function enterFailed(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'compile-failed';
    scenarioState.compileStatus = 'failed';
    scenarioState.toolbar.compile = 'default';
    scenarioState.bottomPanel.view = 'console';
    scenarioState.bottomPanel.title = 'Консоль';
    scenarioState.diagnostics.items = FAILED_DIAGNOSTICS.map(item => ({ ...item }));
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.counters = { error: 1, warning: 0, info: 1 };
    scenarioState.statusBar = { mode: 'idle', label: '', progress: 0 };
    compileTimers = [];
    renderScenarioState();
  }

  function enterRecompilePressed(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'recompile-pressed';
    scenarioState.compileStatus = 'pressed';
    scenarioState.toolbar.compile = 'pressed';
    scenarioState.statusBar = { mode: 'idle', label: '', progress: 0 };
    renderScenarioState();

    compileTimers.push(window.setTimeout(
      () => enterRecompiling(sequence),
      PRESS_DELAY_MS
    ));
  }

  function enterRecompiling(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'recompiling';
    scenarioState.compileStatus = 'running';
    scenarioState.toolbar.compile = 'active';
    scenarioState.bottomPanel.view = 'console';
    scenarioState.bottomPanel.title = 'Консоль';
    scenarioState.bottomPanel.consoleLines = [...RECOMPILE_CONSOLE_LINES];
    scenarioState.diagnostics.items = [];
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.counters = { error: 0, warning: 0, info: 0 };
    scenarioState.statusBar = { mode: 'building', label: 'Сборка проекта', progress: 0.4 };
    renderScenarioState();

    compileTimers.push(window.setTimeout(
      () => enterRecompileCompleteConsole(sequence),
      RUNNING_DELAY_MS
    ));
  }

  function enterRecompileCompleteConsole(sequence) {
    if (sequence !== compileSequence) return;
    const analyzerFindings = validateCalculateBody(
      scenarioState.documents['compute-definition'].document.source
    ) ? ANALYZER_DIAGNOSTICS : [];
    scenarioState.step = 'recompile-complete-console';
    scenarioState.compileStatus = 'failed';
    scenarioState.toolbar.compile = 'default';
    scenarioState.bottomPanel.view = 'console';
    scenarioState.bottomPanel.title = 'Консоль';
    scenarioState.diagnostics.items = analyzerFindings.map(item => ({ ...item }));
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.selectedDiagnostic = null;
    scenarioState.counters = analyzerFindings.length
      ? { ...ANALYZER_COUNTERS }
      : { error: 0, warning: 0, info: 0 };
    scenarioState.statusBar = { mode: 'idle', label: '', progress: 0 };
    compileTimers = [];
    renderScenarioState();
  }

  function showAnalyzerMessages() {
    if (scenarioState.step !== 'recompile-complete-console') return;
    scenarioState.step = 'analyzer-message';
    scenarioState.bottomPanel.view = 'messages';
    scenarioState.bottomPanel.title = 'Сообщения';
    renderScenarioState();
  }

  function showCompilationMessages() {
    if (scenarioState.step !== 'compile-failed') return;
    if (scenarioState.bottomPanel.view !== 'console') return;
    scenarioState.bottomPanel.view = 'messages';
    scenarioState.bottomPanel.title = 'Сообщения';
    renderBottomPanel();
    renderDiagnostics();
    renderCounters();
  }

  function revalidateRecompileSource() {
    const source = scenarioState.editorContent.document.source;
    const computeRenameSatisfied = validateFunctionRename(source);
    const calculateBodySatisfied = validateCalculateBody(source);
    const resultDeclarationSatisfied = validateResultDeclaration(source);
    scenarioState.editorContent.validation.computeRename.satisfied = computeRenameSatisfied;
    scenarioState.editorContent.validation.calculateBody.satisfied = calculateBodySatisfied;
    scenarioState.editorContent.validation.resultDeclaration.satisfied = resultDeclarationSatisfied;
    return computeRenameSatisfied && !resultDeclarationSatisfied;
  }

  function revalidateFinalCompilationSource() {
    const source = scenarioState.editorContent.document.source;
    const computeRenameSatisfied = validateFunctionRename(source);
    const resultDeclarationSatisfied = validateResultDeclaration(source);
    scenarioState.editorContent.validation.computeRename.satisfied = computeRenameSatisfied;
    scenarioState.editorContent.validation.resultDeclaration.satisfied = resultDeclarationSatisfied;
    return computeRenameSatisfied && resultDeclarationSatisfied;
  }

  function enterFinalCompilePressed(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'final-compile-pressed';
    scenarioState.compileStatus = 'pressed';
    scenarioState.toolbar.compile = 'pressed';
    scenarioState.statusBar = { mode: 'idle', label: '', progress: 0 };
    renderFinalCompilePressed();

    compileTimers.push(window.setTimeout(
      () => enterFinalCompiling(sequence),
      PRESS_DELAY_MS
    ));
  }

  function enterFinalCompiling(sequence) {
    if (sequence !== compileSequence) return;
    scenarioState.step = 'final-compiling';
    scenarioState.compileStatus = 'running';
    scenarioState.toolbar.compile = 'active';
    scenarioState.bottomPanel.view = 'console';
    scenarioState.bottomPanel.title = 'Консоль';
    scenarioState.bottomPanel.consoleLines = [...RECOMPILE_CONSOLE_LINES];
    scenarioState.diagnostics.items = [];
    scenarioState.diagnostics.expandedIds = [];
    scenarioState.counters = { error: 0, warning: 0, info: 0 };
    scenarioState.statusBar = { mode: 'building', label: 'Сборка проекта', progress: 0.4 };
    compileTimers = [];
    renderFinalCompiling();
  }

  function revealCalculateBodyStep() {
    if (!canEditCalculateBody()) return;
    const insertionTarget = sourceCode.querySelector('[data-code-action="insert-calculate-body"]');
    if (!insertionTarget) return;
    insertionTarget.focus({ preventScroll: true });
  }

  function startCompilation() {
    if (isCompileBusy()) return;
    const startsRecompile = scenarioState.step === 'fix-error'
      && scenarioState.editorContent.document.dirty
      && revalidateRecompileSource();
    if (scenarioState.step === 'fix-error' && !startsRecompile) {
      revealCalculateBodyStep();
      return;
    }
    if (scenarioState.step !== 'initial' && !startsRecompile) return;
    compileTimers.forEach(timer => window.clearTimeout(timer));
    compileTimers = [];
    compileSequence += 1;
    if (startsRecompile) enterRecompilePressed(compileSequence);
    else enterPressed(compileSequence);
  }

  compileButton.addEventListener('click', startCompilation);
  rows.addEventListener('click', handleDiagnosticDisclosureClick);
  rows.addEventListener('click', handleDiagnosticLocationClick);
  sourceCode.addEventListener('click', handleCodeActionClick);
  setInitialVisualState();
  renderScenarioState();

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const cssPixels = (name) => parseFloat(getComputedStyle(root).getPropertyValue(name));

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
    let isActive = true;

    target.setPointerCapture(pointerId);
    body.classList.add('is-resizing', `is-resizing-${axis}`);

    const move = (moveEvent) => {
      if (axis === 'vertical') {
        const bounds = workspace.getBoundingClientRect();
        setSidebarWidth(moveEvent.clientX - bounds.left);
      } else {
        const bounds = split.getBoundingClientRect();
        setBottomHeight(bounds.bottom - moveEvent.clientY);
      }
    };

    const stop = () => {
      if (!isActive) return;
      isActive = false;
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
      const tabId = tab.dataset.editorTab;
      const documentId = TAB_DOCUMENT_IDS[tabId];
      if (!documentId || !scenarioState.documents[documentId]) return;
      scenarioState.editorTabs.activeId = tabId;
      scenarioState.activeDocument = documentId;
      scenarioState.editorContent = scenarioState.documents[documentId];
      scenarioState.tree.selectedId = documentId;
      renderEditorTabs();
      renderTreeSelection();
      renderEditorContent();
      renderDocumentName();
      renderDiagnosticSurfaces();
    });
  });

  treeRows.forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.tree-row').forEach(item => {
        item.classList.remove('is-selected');
        item.removeAttribute('aria-selected');
      });
      row.classList.add('is-selected');
      row.setAttribute('aria-selected', 'true');
    });
  });

  function handleBottomPanelSwitch(event) {
    const button = event.currentTarget;
    if (scenarioState.compileStatus === 'pressed' || scenarioState.compileStatus === 'running') return;
    if (scenarioState.step === 'compile-failed'
      && scenarioState.bottomPanel.view === 'console'
      && button.dataset.panel === 'messages') {
      showCompilationMessages();
      if (event.detail > 0) button.blur();
      return;
    }
    if (scenarioState.step === 'recompile-complete-console'
      && button.dataset.panel === 'messages') {
      showAnalyzerMessages();
      if (event.detail > 0) button.blur();
      return;
    }
    scenarioState.bottomPanel.view = button.dataset.panel === 'terminal' ? 'console' : 'messages';
    scenarioState.bottomPanel.title = button.dataset.panel === 'terminal'
      ? 'Консоль'
      : button.dataset.panel === 'variables' ? 'Переменные' : 'Сообщения';
    renderBottomPanel();
    if (event.detail > 0) button.blur();
  }

  verticalPanelButtons.forEach(button => {
    button.addEventListener('click', handleBottomPanelSwitch);
  });

  document.querySelectorAll('.bottom-tabs button').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bottom-tabs button').forEach(item => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
    });
  });

  window.addEventListener('resize', () => {
    setSidebarWidth(cssPixels('--sidebar-width'));
    setBottomHeight(cssPixels('--bottom-panel-height'));
  });

  setSidebarWidth(248);
  setBottomHeight(228);
})();
