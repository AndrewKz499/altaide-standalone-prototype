(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const workspace = document.querySelector('.workspace');
  const split = document.getElementById('content-split');
  const verticalResizer = document.getElementById('vertical-resizer');
  const horizontalResizer = document.getElementById('horizontal-resizer');
  const compileButton = document.querySelector('[data-action="compile"]');

  const scenarioState = {
    step: 'initial',
    compileStatus: 'idle'
  };

  function renderScenarioState() {
    const isCompiling = scenarioState.compileStatus === 'running';
    root.dataset.scenarioStep = scenarioState.step;
    compileButton.dataset.state = isCompiling ? 'pressed' : 'default';
    compileButton.setAttribute('aria-pressed', String(isCompiling));
  }

  function startCompilation() {
    if (scenarioState.compileStatus === 'running') return;
    scenarioState.step = 'compiling';
    scenarioState.compileStatus = 'running';
    renderScenarioState();
  }

  compileButton.addEventListener('click', startCompilation);
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
    event.currentTarget.setPointerCapture(event.pointerId);
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
      body.classList.remove('is-resizing', `is-resizing-${axis}`);
      event.currentTarget.removeEventListener('pointermove', move);
      event.currentTarget.removeEventListener('pointerup', stop);
      event.currentTarget.removeEventListener('pointercancel', stop);
    };

    event.currentTarget.addEventListener('pointermove', move);
    event.currentTarget.addEventListener('pointerup', stop);
    event.currentTarget.addEventListener('pointercancel', stop);
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

  const rows = document.getElementById('message-rows');
  rows.replaceChildren(...Array.from({ length: 17 }, () => {
    const row = document.createElement('tr');
    row.innerHTML = '<td></td><td></td><td></td><td></td><td></td>';
    return row;
  }));

  document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.editor-tab').forEach(item => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
    });
  });

  document.querySelectorAll('.tree-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.tree-row').forEach(item => {
        item.classList.remove('is-selected');
        item.removeAttribute('aria-selected');
      });
      row.classList.add('is-selected');
      row.setAttribute('aria-selected', 'true');
    });
  });

  const panelNames = { terminal: 'Терминал', messages: 'Сообщения', variables: 'Переменные' };
  document.querySelectorAll('.vertical-tabs button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.vertical-tabs button').forEach(item => item.classList.toggle('is-active', item === button));
      document.getElementById('bottom-tab-label').textContent = panelNames[button.dataset.panel];
    });
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
