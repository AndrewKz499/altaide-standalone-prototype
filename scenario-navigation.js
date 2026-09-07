(() => {
  const match = window.location.pathname.match(/\/scenarios\/scenario-(\d)\//);
  const currentScenario = match?.[1] || "";
  const siteRoot = window.location.pathname.split("/scenarios/")[0] || "";
  const links = [
    ["", "Главная", `${siteRoot}/`],
    ["1", "Сценарий 1", `${siteRoot}/scenarios/scenario-1/`],
    ["2", "Сценарий 2", `${siteRoot}/scenarios/scenario-2/`],
    ["3", "Сценарий 3", `${siteRoot}/scenarios/scenario-3/`],
    ["4", "Сценарий 4", `${siteRoot}/scenarios/scenario-4/`],
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
    .scenario-navigation a {
      display: block;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 5px;
      color: #d8dced;
      text-decoration: none;
      outline: none;
    }
    .scenario-navigation a + a { margin-top: 2px; }
    .scenario-navigation a:hover {
      background: rgba(111, 126, 189, .18);
      color: #fff;
    }
    .scenario-navigation a:focus-visible {
      border-color: #db70d9;
      box-shadow: 0 0 0 1px rgba(219, 112, 217, .35);
    }
    .scenario-navigation a[aria-current="page"] {
      background: rgba(135, 79, 194, .3);
      border-color: rgba(219, 112, 217, .48);
      color: #fff;
    }
  `;

  const navigation = document.createElement("nav");
  navigation.className = "scenario-navigation";
  navigation.setAttribute("aria-label", "Навигация по прототипам");
  navigation.innerHTML = links.map(([id, label, href]) => {
    const current = id === currentScenario ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${label}</a>`;
  }).join("");

  document.head.append(style);
  document.body.append(navigation);
})();
