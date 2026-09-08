(() => {
  const match = window.location.pathname.match(/\/scenarios\/scenario-(\d)\//);
  const currentScenario = match?.[1] || "";
  const siteRoot = window.location.pathname.split("/scenarios/")[0] || "";
  const selectedAction = new URLSearchParams(window.location.search).get("navAction");
  const scenarioLinks = [["1", "Сценарий 1"], ["2", "Сценарий 2"], ["3", "Сценарий 3"], ["4", "Сценарий 4"]];
  const scenarioActions = {
    1: [
      ["compile", "Скомпилировать проект"], ["cmp101", "Открыть ошибку CMP101"],
      ["location", "Перейти к месту ошибки"], ["rename", "Переименовать compute в calculate"],
      ["body", "Вставить код функции"], ["analyzer", "Открыть сообщения анализатора"],
      ["declaration", "Объявить переменную result"],
    ],
    2: [
      ["s2-compile", "Скомпилировать проект"], ["s2-cmp101", "Открыть ошибку CMP101"],
      ["s2-location", "Перейти к месту ошибки"], ["s2-rename", "Переименовать compute в calculate"],
      ["s2-recompile", "Повторно скомпилировать проект"], ["s2-body", "Вставить код функции"],
      ["s2-analyzer", "Открыть сообщения анализатора"], ["s2-declaration", "Объявить переменную result"],
    ],
    3: [
      ["s3-compile", "Скомпилировать проект"], ["s3-conflict", "Открыть ошибку конфликта имён"],
      ["s3-preview", "Открыть preview ошибки"], ["s3-location", "Перейти к месту ошибки"],
      ["s3-rename", "Переименовать compute в calculate"], ["s3-recompile", "Повторно скомпилировать проект"],
      ["s3-body", "Вставить код функции"], ["s3-new-error", "Открыть новую сборку с ошибкой"],
      ["s3-history", "Перейти к предыдущей сборке"], ["s3-analyzer", "Открыть сообщения анализатора"],
      ["s3-declaration", "Объявить переменную result"], ["s3-final", "Выполнить финальную компиляцию"],
    ],
    4: [
      ["s4-errors", "Показать только ошибки"], ["s4-cfg801", "Выбрать ошибку CFG801"],
      ["s4-warnings", "Показать ошибки и предупреждения"], ["s4-analyzer", "Открыть сообщения анализатора"],
    ],
  };

  const style = document.createElement("style");
  style.textContent = `
    .scenario-navigation { position:fixed; top:100px; right:22px; z-index:10000; width:176px; max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); display:flex; flex-direction:column; overflow:hidden; padding:8px; border:1px solid rgba(148,163,204,.28); border-radius:9px; background:rgba(10,15,38,.94); box-shadow:0 12px 32px rgba(0,0,0,.38); backdrop-filter:blur(10px); font:500 12px/1.2 Inter,Arial,sans-serif; }
    .scenario-navigation a,.scenario-navigation button { display:block; width:100%; padding:8px 10px; border:1px solid transparent; border-radius:5px; background:transparent; color:#d8dced; font:inherit; text-align:left; text-decoration:none; outline:none; cursor:pointer; }
    .scenario-navigation-content { min-height:0; overflow:auto; }
    .scenario-navigation-content > :not(:first-child) { margin-top:2px; }
    .scenario-navigation-content[hidden] { display:none; }
    .scenario-navigation-header { display:flex; align-items:center; justify-content:space-between; gap:8px; flex:none; min-height:28px; padding-left:7px; cursor:grab; touch-action:none; user-select:none; color:#adb4ce; }
    .scenario-navigation.is-dragging .scenario-navigation-header { cursor:grabbing; }
    .scenario-navigation .scenario-navigation-collapse { width:28px; padding:5px; text-align:center; flex:none; }
    .scenario-navigation.is-collapsed { width:132px; }
    .scenario-navigation a:hover,.scenario-navigation button:hover { background:rgba(111,126,189,.18); color:#fff; }
    .scenario-navigation a:focus-visible,.scenario-navigation button:focus-visible { border-color:#db70d9; box-shadow:0 0 0 1px rgba(219,112,217,.35); }
    .scenario-navigation [aria-current="page"],.scenario-navigation .scenario-navigation-toggle { background:rgba(135,79,194,.3); border-color:rgba(219,112,217,.48); color:#fff; }
    .scenario-navigation-group-row { display:grid; grid-template-columns:minmax(0,1fr) 28px; gap:2px; }
    .scenario-navigation-group-row .scenario-navigation-disclosure { padding:7px; text-align:center; }
    .scenario-navigation-toggle::after,.scenario-navigation-disclosure::after { content:""; float:right; width:6px; height:6px; margin-top:2px; border-right:1px solid currentColor; border-bottom:1px solid currentColor; transform:rotate(45deg); transition:transform .16s ease; }
    .scenario-navigation-disclosure::after { float:none; display:inline-block; }
    .scenario-navigation-toggle[aria-expanded="false"]::after,.scenario-navigation-disclosure[aria-expanded="false"]::after { margin-top:4px; transform:rotate(-45deg); }
    .scenario-navigation-actions { margin:4px 0 6px; padding:3px 0 3px 9px; border-left:1px solid rgba(219,112,217,.25); }
    .scenario-navigation-actions[hidden] { display:none; }
    .scenario-navigation-actions a { padding:6px 7px; color:#adb4ce; font-size:11px; line-height:1.3; }
    .scenario-navigation-actions a[aria-current="step"] { background:rgba(219,112,217,.13); color:#fff; }
  `;

  const navigation = document.createElement("nav");
  navigation.className = "scenario-navigation";
  navigation.setAttribute("aria-label", "Навигация по прототипам");
  const storageKey = `altaide-navigation:${siteRoot}`;
  let savedNavigation = {};
  try { savedNavigation = JSON.parse(sessionStorage.getItem(storageKey)) || {}; } catch {}
  const header = document.createElement("div");
  header.className = "scenario-navigation-header";
  const title = document.createElement("span");
  title.textContent = "Навигация";
  const collapseButton = document.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "scenario-navigation-collapse";
  collapseButton.setAttribute("aria-controls", "scenario-navigation-content");
  header.append(title, collapseButton);
  const content = document.createElement("div");
  content.id = "scenario-navigation-content";
  content.className = "scenario-navigation-content";
  navigation.append(header, content);
  function saveNavigation() {
    const rect = navigation.getBoundingClientRect();
    savedNavigation.position = { x: rect.left, y: rect.top };
    savedNavigation.collapsed = content.hidden;
    savedNavigation.groups ||= {};
    savedNavigation.groups[currentScenario] = Object.fromEntries(
      [...content.querySelectorAll('.scenario-navigation-group')].map(group =>
        [group.dataset.scenario, !group.querySelector('.scenario-navigation-actions').hidden])
    );
    try { sessionStorage.setItem(storageKey, JSON.stringify(savedNavigation)); } catch {}
  }
  function placeNavigation(x, y) {
    const rect = navigation.getBoundingClientRect();
    const margin = 8;
    navigation.style.left = `${Math.max(margin, Math.min(x, window.innerWidth - rect.width - margin))}px`;
    navigation.style.top = `${Math.max(margin, Math.min(y, window.innerHeight - rect.height - margin))}px`;
    navigation.style.right = "auto";
  }
  function clampNavigation() {
    const rect = navigation.getBoundingClientRect();
    placeNavigation(rect.left, rect.top);
    saveNavigation();
  }
  function setCollapsed(collapsed) {
    content.hidden = collapsed;
    navigation.classList.toggle("is-collapsed", collapsed);
    collapseButton.textContent = collapsed ? "+" : "−";
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute("aria-label", collapsed ? "Развернуть навигацию" : "Свернуть навигацию");
  }
  setCollapsed(savedNavigation.collapsed === true);
  collapseButton.addEventListener("click", () => {
    setCollapsed(!content.hidden);
    clampNavigation();
  });
  let drag = null;
  header.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest("button, a")) return;
    const rect = navigation.getBoundingClientRect();
    drag = { id: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    header.setPointerCapture(event.pointerId);
    navigation.classList.add("is-dragging");
    event.preventDefault();
  });
  header.addEventListener("pointermove", event => {
    if (drag?.id !== event.pointerId) return;
    placeNavigation(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
  });
  const finishDrag = event => {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    navigation.classList.remove("is-dragging");
    if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
    saveNavigation();
  };
  header.addEventListener("pointerup", finishDrag);
  header.addEventListener("pointercancel", finishDrag);
  header.addEventListener("lostpointercapture", finishDrag);
  // Captured drags end on the header, never on a link beneath the pointer.
  header.addEventListener("click", event => { if (!event.target.closest("button")) event.preventDefault(); });
  const homeLink = document.createElement("a");
  homeLink.href = `${siteRoot}/`;
  homeLink.textContent = "Главная";
  content.append(homeLink);

  scenarioLinks.forEach(([scenarioId, label]) => {
    const group = document.createElement("div");
    group.className = "scenario-navigation-group";
    group.dataset.scenario = scenarioId;
    const actions = document.createElement("div");
    actions.className = "scenario-navigation-actions";
    actions.id = `scenario-${scenarioId}-actions`;
    actions.hidden = !(savedNavigation.groups?.[currentScenario]?.[scenarioId] ?? (scenarioId === currentScenario));
    const toggleActions = button => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      actions.hidden = expanded;
      clampNavigation();
    };
    if (scenarioId === currentScenario) {
      const toggle = document.createElement("button");
      toggle.className = "scenario-navigation-toggle";
      toggle.type = "button";
      toggle.textContent = label;
      toggle.setAttribute("aria-expanded", String(!actions.hidden));
      toggle.setAttribute("aria-controls", actions.id);
      toggle.addEventListener("click", () => toggleActions(toggle));
      group.append(toggle);
    } else {
      const row = document.createElement("div");
      row.className = "scenario-navigation-group-row";
      const scenarioLink = document.createElement("a");
      scenarioLink.href = `${siteRoot}/scenarios/scenario-${scenarioId}/`;
      scenarioLink.textContent = label;
      const disclosure = document.createElement("button");
      disclosure.className = "scenario-navigation-disclosure";
      disclosure.type = "button";
      disclosure.setAttribute("aria-label", `Раскрыть ${label}`);
      disclosure.setAttribute("aria-expanded", String(!actions.hidden));
      disclosure.setAttribute("aria-controls", actions.id);
      disclosure.addEventListener("click", () => toggleActions(disclosure));
      row.append(scenarioLink, disclosure);
      group.append(row);
    }
    scenarioActions[scenarioId].forEach(([actionId, actionLabel]) => {
      const actionLink = document.createElement("a");
      actionLink.href = `${siteRoot}/scenarios/scenario-${scenarioId}/?navAction=${actionId}`;
      actionLink.dataset.scenarioAction = actionId;
      actionLink.textContent = actionLabel;
      actions.append(actionLink);
    });
    group.append(actions);
    content.append(group);
  });
  document.head.append(style);
  document.body.append(navigation);
  if (Number.isFinite(savedNavigation.position?.x) && Number.isFinite(savedNavigation.position?.y)) {
    placeNavigation(savedNavigation.position.x, savedNavigation.position.y);
  }
  clampNavigation();
  window.addEventListener("resize", clampNavigation);
  new ResizeObserver(clampNavigation).observe(navigation);

  const currentActions = scenarioActions[currentScenario] || [];
  const actionIds = new Set(currentActions.map(([id]) => id));
  if (!currentActions.length) return;
  const click = selector => {
    const target = document.querySelector(selector);
    if (!target) throw new Error(`Scenario navigation target not found: ${selector}`);
    target.click();
  };
  async function completeCompileImmediately() {
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = callback => { queueMicrotask(callback); return 0; };
    try {
      click('[data-action="compile"]');
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    } finally { window.setTimeout = nativeSetTimeout; }
  }

  async function restoreScenarioOne(actionId) {
    if (actionId === "compile") return;
    await completeCompileImmediately(); click('[data-panel="messages"]');
    if (actionId === "cmp101") return;
    click('.diagnostic-disclosure'); if (actionId === "location") return;
    click('.diagnostic-location-button'); if (actionId === "rename") return;
    click('[data-code-action="rename-function"]'); if (actionId === "body") return;
    click('[data-code-action="insert-calculate-body"]'); await completeCompileImmediately();
    if (actionId === "analyzer") return;
    click('[data-panel="messages"]'); click('.diagnostic-location-button');
  }
  async function restoreScenarioTwo(actionId) {
    if (actionId === "s2-compile") return;
    await completeCompileImmediately(); click('[data-panel="messages"]');
    if (actionId === "s2-cmp101") return;
    click('[data-diagnostic-disclosure]'); if (actionId === "s2-location") return;
    click('[data-diagnostic-location]'); if (actionId === "s2-rename") return;
    click('[data-code-action="rename-function"]'); if (actionId === "s2-recompile") return;
    await completeCompileImmediately(); click('[data-panel="messages"]');
    if (actionId === "s2-body") return;
    click('[data-code-action="insert-calculate-body"]'); if (actionId === "s2-analyzer") return;
    click('[data-message-tab="analyzer"]');
  }
  async function restoreScenarioThree(actionId) {
    if (actionId === "s3-compile") return;
    await completeCompileImmediately(); if (actionId === "s3-conflict") return;
    click('[data-panel="build"]'); if (actionId === "s3-preview") return;
    click('[data-diagnostic-toggle="CMP101"], [data-diagnostic-disclosure="CMP101"]'); if (actionId === "s3-location") return;
    click('[data-build-location="compute-a:1"]'); if (actionId === "s3-rename") return;
    click('[data-code-action="rename-function"]'); if (actionId === "s3-recompile") return;
    await completeCompileImmediately(); click('[data-panel="build"]'); if (actionId === "s3-body") return;
    click('[data-code-action="insert-calculate-body"]');
    if (actionId === "s3-new-error" || actionId === "s3-analyzer") return;
    if (actionId === "s3-history") { click('[data-build-id="build-1"]'); return; }
    click('[data-panel="analyzer"]'); if (actionId === "s3-declaration") return;
    click('[data-code-action="declare-result"]');
  }
  async function restoreScenarioFour(actionId) {
    click('[data-counter="error"]'); if (actionId === "s4-errors") return;
    click('[data-code="CFG801"]'); if (actionId === "s4-cfg801") return;
    click('[data-counter="warning"]'); if (actionId === "s4-warnings") return;
    click('[data-panel="analyzer"]');
  }
  const restorers = { 1: restoreScenarioOne, 2: restoreScenarioTwo, 3: restoreScenarioThree, 4: restoreScenarioFour };

  function activeActionForState() {
    const { scenarioStep: step, activeFilters, activePanel, activeBuildId } = document.documentElement.dataset;
    if (currentScenario === "1") {
      if (["initial", "compile-pressed", "compiling"].includes(step)) return "compile";
      if (step === "compile-failed") return "cmp101";
      if (step === "diagnostic-expanded") return "location";
      if (step === "fix-error") return document.querySelector('[data-code-action="rename-function"]') ? "rename" : "body";
      if (["recompile-pressed", "recompiling", "recompile-complete-console", "analyzer-message"].includes(step)) return "analyzer";
      return "declaration";
    }
    if (currentScenario === "2") {
      if (["initial", "compile-pressed", "compiling"].includes(step)) return "s2-compile";
      if (["compile-failed", "compiler-messages-collapsed"].includes(step)) return "s2-cmp101";
      if (step === "compiler-messages-expanded") return "s2-location";
      if (step === "diagnostic-location") return "s2-rename";
      if (step === "name-conflict-fixed-source") return "s2-recompile";
      if (["recompile-pressed", "recompiling", "recompile-complete", "post-recompile-compiler-messages"].includes(step)) return "s2-body";
      if (step === "calculate-body-with-undeclared-result") return "s2-analyzer";
      return "s2-declaration";
    }
    if (currentScenario === "3") {
      if (["initial", "compile-pressed", "compiling"].includes(step)) return "s3-compile";
      if (step === "compile-complete") return "s3-conflict";
      if (step === "compiler-messages-build-1") {
        if (document.querySelector('[data-code-action="rename-function"]')) return "s3-rename";
        if (document.documentElement.dataset.renameValid === "true") return "s3-recompile";
        if (document.documentElement.dataset.expandedDiagnosticId) return "s3-location";
        return "s3-preview";
      }
      if (["compile-pressed-build-2", "compiling-build-2", "compile-complete-build-2", "compiler-messages-build-2"].includes(step)) return "s3-body";
      if (step === "calculate-body-with-undeclared-result") return activeBuildId === "build-1" ? "s3-history" : "s3-analyzer";
      if (step === "analyzer-messages-st001") return "s3-declaration";
      return "s3-final";
    }
    if (activePanel === "analyzer") return "s4-analyzer";
    if (activeFilters?.includes("warning")) return "s4-warnings";
    if (document.querySelector('.scenario-4-preview.has-content')) return "s4-cfg801";
    return "s4-errors";
  }
  function syncActiveAction(preferredAction = null) {
    const activeAction = preferredAction || activeActionForState();
    navigation.querySelectorAll('[data-scenario-action]').forEach(link => {
      if (link.dataset.scenarioAction === activeAction) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }
  new MutationObserver(() => syncActiveAction()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-scenario-step", "data-active-filters", "data-active-panel", "data-active-build-id"],
  });
  [document.querySelector('.source-code'), document.querySelector('[data-source-code]'), document.querySelector('[data-diagnostics]')]
    .filter(Boolean)
    .forEach(contentRoot => new MutationObserver(() => syncActiveAction()).observe(contentRoot, { childList: true, subtree: true }));

  syncActiveAction(selectedAction && actionIds.has(selectedAction) ? selectedAction : null);
  if (selectedAction && actionIds.has(selectedAction)) {
    restorers[currentScenario](selectedAction).then(() => syncActiveAction(selectedAction)).catch(error => console.error(error));
  }
})();
