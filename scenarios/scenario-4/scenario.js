(() => {
  'use strict';

  const root = document.documentElement;
  const workspace = document.querySelector('.workspace');
  const split = document.getElementById('content-split');
  const verticalResizer = document.getElementById('vertical-resizer');
  const horizontalResizer = document.getElementById('horizontal-resizer');
  const sourceCode = document.querySelector('[data-source-code]');
  const lineNumbers = document.querySelector('.code-lines');
  const diagnosticsRoot = document.querySelector('[data-diagnostics]');
  const previewRoot = document.querySelector('.scenario-4-preview');

  const sourceDocuments = {
    compute: {
      name: 'compute',
      source: `FUNCTION compute : DINT\nVAR_INPUT\n    t : INT;\nEND_VAR\n    compute := t * 2;\nEND_FUNCTION`
    },
    calculate: {
      name: 'calculate',
      source: `FUNCTION calculate : DINT\nVAR_INPUT\n    t : INT;\nEND_VAR\n    result := t * 5;\n    calculate := result;\nEND_FUNCTION`
    }
  };

  const diagnostics = Object.freeze([
    { kind: 'error', code: 'CMP102', description: 'Лишний END_IF без соответствующего открывающего IF', file: 'calculate.st', line: ':5' },
    { kind: 'error', code: 'TYP204', description: 'Нельзя присвоить значение REAL переменной типа BOOL', file: 'compute.st', line: ':12', disclosure: true },
    { kind: 'error', code: 'VAR301', description: 'Переменная pressureLimit не объявлена в области видимости', file: 'compute.st', line: ':4' },
    { kind: 'warning', code: 'VAR302', description: 'Имя ValveState уже объявлено в этом блоке', file: 'compute.st', line: ':9' },
    { kind: 'warning', code: 'FB401', description: 'Не задан обязательный вход Enable у блока MotorStart', file: 'compute.st', line: ':21' },
    { kind: 'error', code: 'FB402', description: 'Блок ValveController вызван как функция с возвращаемым значением', file: 'compute.st', line: ':15', disclosure: true },
    { kind: 'info', code: 'ARR501', description: 'Индекс массива sensors[8] вне диапазона 0..7', file: 'compute.st', line: ':13' },
    { kind: 'error', code: 'DIV601', description: 'Обнаружено деление на ноль в константном выражении', file: 'compute.st', line: ':6' },
    { kind: 'error', code: 'RET701', description: 'Функция Normalize не возвращает значение на всех ветках', file: 'func.st', line: ':27' },
    { kind: 'error', code: 'CFG801', description: 'Период задачи FST должен быть больше 0 мсекунд', file: 'task.cfg', line: ':3' },
    { kind: 'error', code: 'LIB901', description: 'Версия библиотеки MotionLib несовместима с проектом', file: 'libs.cfg', line: ':1' },
    { kind: 'error', code: 'IO902', description: 'Адрес %QX0.3 уже назначен другому выходу', file: 'io.st', line: ':41' },
    { kind: 'error', code: 'PRG903', description: 'Программа Main не назначена ни одной задаче', file: 'boot.cfg', line: ':5' },
    { kind: 'error', code: 'CMP101', description: 'После IF ожидается THEN, найден идентификатор pumpReady', file: 'main.st', line: ':7' }
  ]);

  let activeDocumentId = 'calculate';
  const activeFilters = new Set();
  let selectedDiagnosticCode = null;

  function highlight(source) {
    const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return source.split('\n').map(line => escape(line)
      .replace(/\b(FUNCTION|VAR_INPUT|END_VAR|END_FUNCTION)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(DINT|INT)\b/g, '<span class="type">$1</span>')
      .replace(/\b(calculate|compute)\b/g, '<span class="name">$1</span>')
      .replace(/\b(result)\b/g, '<span class="result scenario-4-undeclared">$1</span>')
      .replace(/(:=|:|;|\*)/g, '<span class="op">$1</span>')
      .replace(/\b(2|5)\b/g, '<span class="num">$1</span>')
    ).join('\n');
  }

  function renderDocument() {
    sourceCode.innerHTML = highlight(sourceDocuments[activeDocumentId].source);
    document.querySelectorAll('[data-editor-tab]').forEach(tab => {
      const active = tab.dataset.editorTab === activeDocumentId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-tree-document]').forEach(row => {
      const active = row.dataset.treeDocument === activeDocumentId;
      row.classList.toggle('is-selected', active);
      row.setAttribute('aria-selected', String(active));
    });
    root.dataset.activeDocumentId = activeDocumentId;
  }

  function renderPreview() {
    previewRoot.replaceChildren();
    previewRoot.classList.toggle('has-content', selectedDiagnosticCode === 'CFG801');
    previewRoot.setAttribute('aria-label', selectedDiagnosticCode === 'CFG801' ? 'Предпросмотр CFG801' : 'Предпросмотр кода пуст');
    if (selectedDiagnosticCode !== 'CFG801') return;

    const heading = document.createElement('div');
    heading.className = 'scenario-4-preview-heading';
    heading.textContent = 'task.cfg';
    const code = document.createElement('pre');
    code.className = 'scenario-4-preview-code';
    code.innerHTML = '<span><em>1</em><code><b>TASK</b> FST (</code></span>'
      + '<span class="is-problem"><em>2</em><code>    INTERVAL := T#0ms,</code></span>'
      + '<span><em>3</em><code>    PRIORITY := 1</code></span>'
      + '<span><em>4</em><code>);</code></span>';
    previewRoot.append(heading, code);
  }

  function renderDiagnostics() {
    const visibleDiagnostics = activeFilters.size === 0
      ? diagnostics
      : diagnostics.filter(item => activeFilters.has(item.kind));
    diagnosticsRoot.replaceChildren(...visibleDiagnostics.map(item => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'scenario-4-diagnostic-row';
      row.dataset.kind = item.kind;
      row.dataset.code = item.code;
      row.classList.toggle('is-selected', item.code === selectedDiagnosticCode);
      row.setAttribute('aria-pressed', String(item.code === selectedDiagnosticCode));
      const leading = document.createElement('span');
      leading.className = 'scenario-4-diagnostic-leading';
      const disclosure = document.createElement('span');
      disclosure.className = item.disclosure ? 'scenario-4-disclosure' : 'scenario-4-disclosure-spacer';
      const icon = document.createElement('img');
      icon.src = `assets/icons/status-${item.kind}.svg`;
      icon.alt = '';
      leading.append(disclosure, icon);
      const code = document.createElement('span');
      code.className = 'scenario-4-diagnostic-code';
      code.textContent = item.code;
      const description = document.createElement('span');
      description.className = 'scenario-4-diagnostic-description';
      description.textContent = item.description;
      const location = document.createElement('span');
      location.className = 'scenario-4-diagnostic-location';
      location.textContent = item.file;
      const line = document.createElement('em');
      line.textContent = item.line;
      location.append(line);
      row.append(leading, code, description, location);
      row.addEventListener('click', () => {
        selectedDiagnosticCode = item.code;
        renderDiagnostics();
        renderPreview();
      });
      return row;
    }));
    document.querySelectorAll('[data-counter]').forEach(counter => {
      const active = activeFilters.has(counter.dataset.counter);
      counter.classList.toggle('is-active', active);
      counter.setAttribute('aria-pressed', String(active));
    });
    root.dataset.filtersApplied = String(activeFilters.size > 0);
    root.dataset.activeFilters = [...activeFilters].join(',');
    root.dataset.visibleDiagnosticRows = String(visibleDiagnostics.length);
  }

  function setupResizer(handle, axis) {
    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add('is-resizing', `is-resizing-${axis}`);
      const start = axis === 'vertical' ? event.clientX : event.clientY;
      const initial = axis === 'vertical' ? workspace.getBoundingClientRect().width - workspace.querySelector('.content-area').getBoundingClientRect().width - 16 : parseFloat(getComputedStyle(root).getPropertyValue('--bottom-panel-height'));
      const move = moveEvent => {
        const delta = axis === 'vertical' ? moveEvent.clientX - start : start - moveEvent.clientY;
        const value = Math.max(axis === 'vertical' ? 190 : 170, Math.min(axis === 'vertical' ? 420 : 420, initial + delta));
        root.style.setProperty(axis === 'vertical' ? '--sidebar-width' : '--bottom-panel-height', `${value}px`);
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.body.classList.remove('is-resizing', `is-resizing-${axis}`);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }

  document.querySelectorAll('[data-editor-tab]').forEach(tab => tab.addEventListener('click', () => {
    activeDocumentId = tab.dataset.editorTab;
    renderDocument();
  }));
  document.querySelectorAll('[data-tree-document]').forEach(row => row.addEventListener('click', () => {
    activeDocumentId = row.dataset.treeDocument;
    renderDocument();
  }));
  document.querySelectorAll('[data-counter]').forEach(counter => counter.addEventListener('click', () => {
    const kind = counter.dataset.counter;
    if (activeFilters.has(kind)) activeFilters.delete(kind);
    else activeFilters.add(kind);
    renderDiagnostics();
  }));

  for (let i = 1; i <= 25; i += 1) lineNumbers.append(Object.assign(document.createElement('span'), { textContent: String(i) }));
  setupResizer(verticalResizer, 'vertical');
  setupResizer(horizontalResizer, 'horizontal');
  renderDocument();
  renderDiagnostics();
  renderPreview();
  root.dataset.scenarioStep = 'initial';
  root.dataset.errorCount = '11';
  root.dataset.warningCount = '2';
  root.dataset.infoCount = '1';
})();
