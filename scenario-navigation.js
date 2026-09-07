(() => {
  const match = window.location.pathname.match(/\/scenarios\/scenario-(\d)\//);
  const currentScenario = match?.[1] || "";
  const siteRoot = window.location.pathname.split("/scenarios/")[0] || "";
  const selectedAction = new URLSearchParams(window.location.search).get("navAction");
  const links = [
    ["", "Главная", `${siteRoot}/`],
    ["1", "Сценарий 1", `${siteRoot}/scenarios/scenario-1/`],
    ["2", "Сценарий 2", `${siteRoot}/scenarios/scenario-2/`],
    ["3", "Сценарий 3", `${siteRoot}/scenarios/scenario-3/`],
    ["4", "Сценарий 4", `${siteRoot}/scenarios/scenario-4/`],
  ];
  const scenarioOneActions = [
    ["compile", "Скомпилировать проект"],
    ["cmp101", "Открыть ошибку CMP101"],
    ["location", "Перейти к месту ошибки"],
    ["rename", "Переименовать compute в calculate"],
    ["body", "Вставить код функции"],
    ["analyzer", "Открыть сообщения анализатора"],
    ["declaration", "Объявить переменную result"],
  ];

  const style = document.createElement("style");
  style.textContent = `
    .scenario-navigation {
      position: fixed;
      top: 100px;
      right: 22px;
      z-index: 10000;
      width: 158px;
      padding: 8px;
      border: 1px solid rgba(148, 163, 204, .28);
      border-radius: 9px;
      background: rgba(10, 15, 38, .94);
      box-shadow: 0 12px 32px rgba(0, 0, 0, .38);
      backdrop-filter: blur(10px);
      font: 500 12px/1.2 Inter, Arial, sans-serif;
    }
    .scenario-navigation a,
    .scenario-navigation button {
      display: block;
      width: 100%;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 5px;
      background: transparent;
      color: #d8dced;
      font: inherit;
      text-align: left;
      text-decoration: none;
      outline: none;
      cursor: pointer;
    }
    .scenario-navigation > :not(:first-child) { margin-top: 2px; }
    .scenario-navigation a:hover,
    .scenario-navigation button:hover {
      background: rgba(111, 126, 189, .18);
      color: #fff;
    }
    .scenario-navigation a:focus-visible,
    .scenario-navigation button:focus-visible {
      border-color: #db70d9;
      box-shadow: 0 0 0 1px rgba(219, 112, 217, .35);
    }
    .scenario-navigation [aria-current="page"],
    .scenario-navigation .scenario-navigation-toggle {
      background: rgba(135, 79, 194, .3);
      border-color: rgba(219, 112, 217, .48);
      color: #fff;
    }
    .scenario-navigation-toggle::after {
      content: "";
      float: right;
      width: 6px;
      height: 6px;
      margin-top: 2px;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: rotate(45deg);
      transition: transform .16s ease;
    }
    .scenario-navigation-toggle[aria-expanded="false"]::after {
      margin-top: 4px;
      transform: rotate(-45deg);
    }
    .scenario-navigation-actions {
      margin: 4px 0 6px;
      padding: 3px 0 3px 9px;
      border-left: 1px solid rgba(219, 112, 217, .25);
    }
    .scenario-navigation-actions[hidden] { display: none; }
    .scenario-navigation-actions a {
      padding: 6px 7px;
      color: #adb4ce;
      font-size: 11px;
      line-height: 1.3;
    }
    .scenario-navigation-actions a[aria-current="step"] {
      background: rgba(219, 112, 217, .13);
      color: #fff;
    }
  `;

  const navigation = document.createElement("nav");
  navigation.className = "scenario-navigation";
  navigation.setAttribute("aria-label", "Навигация по прототипам");
  links.forEach(([id, label, href]) => {
    if (id === "1" && currentScenario === "1") {
      const toggle = document.createElement("button");
      toggle.className = "scenario-navigation-toggle";
      toggle.type = "button";
      toggle.textContent = label;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-controls", "scenario-one-actions");
      navigation.append(toggle);

      const actions = document.createElement("div");
      actions.className = "scenario-navigation-actions";
      actions.id = "scenario-one-actions";
      scenarioOneActions.forEach(([actionId, actionLabel]) => {
        const actionLink = document.createElement("a");
        actionLink.href = `${siteRoot}/scenarios/scenario-1/?navAction=${actionId}`;
        actionLink.dataset.scenarioAction = actionId;
        actionLink.textContent = actionLabel;
        actions.append(actionLink);
      });
      navigation.append(actions);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        actions.hidden = expanded;
      });
      return;
    }

    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (id === currentScenario) link.setAttribute("aria-current", "page");
    navigation.append(link);
  });

  document.head.append(style);
  document.body.append(navigation);

  if (currentScenario !== "1") return;

  const actionIds = new Set(scenarioOneActions.map(([id]) => id));
  const click = selector => {
    const target = document.querySelector(selector);
    if (!target) throw new Error(`Scenario navigation target not found: ${selector}`);
    target.click();
  };

  async function completeCompileImmediately() {
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = callback => {
      queueMicrotask(callback);
      return 0;
    };
    try {
      click('[data-action="compile"]');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    } finally {
      window.setTimeout = nativeSetTimeout;
    }
  }

  async function restoreAction(actionId) {
    if (!actionIds.has(actionId) || actionId === "compile") return;

    await completeCompileImmediately();
    click('[data-panel="messages"]');
    if (actionId === "cmp101") return;

    click('.diagnostic-disclosure');
    if (actionId === "location") return;

    click('.diagnostic-location-button');
    if (actionId === "rename") return;

    click('[data-code-action="rename-function"]');
    if (actionId === "body") return;

    click('[data-code-action="insert-calculate-body"]');
    await completeCompileImmediately();
    if (actionId === "analyzer") return;

    click('[data-panel="messages"]');
    click('.diagnostic-location-button');
  }

  function activeActionForState() {
    const root = document.documentElement;
    const step = root?.dataset.scenarioStep;
    if (["initial", "compile-pressed", "compiling"].includes(step)) return "compile";
    if (step === "compile-failed") return "cmp101";
    if (step === "diagnostic-expanded") return "location";
    if (step === "fix-error") {
      if (document.querySelector('[data-code-action="rename-function"]')) return "rename";
      return "body";
    }
    if (["recompile-pressed", "recompiling", "recompile-complete-console", "analyzer-message"].includes(step)) {
      return "analyzer";
    }
    return "declaration";
  }

  function syncActiveAction(preferredAction = null) {
    const activeAction = preferredAction || activeActionForState();
    navigation.querySelectorAll('[data-scenario-action]').forEach(link => {
      if (link.dataset.scenarioAction === activeAction) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }

  const scenarioRoot = document.documentElement;
  const stepObserver = new MutationObserver(() => syncActiveAction());
  stepObserver.observe(scenarioRoot, {
    attributes: true,
    attributeFilter: ["data-scenario-step"],
  });
  const sourceCode = document.querySelector('.source-code');
  const editorObserver = new MutationObserver(() => syncActiveAction());
  if (sourceCode) editorObserver.observe(sourceCode, { childList: true, subtree: true });

  syncActiveAction(selectedAction && actionIds.has(selectedAction) ? selectedAction : null);
  if (selectedAction && actionIds.has(selectedAction)) {
    restoreAction(selectedAction)
      .then(() => syncActiveAction(selectedAction))
      .catch(error => console.error(error));
  }
})();
