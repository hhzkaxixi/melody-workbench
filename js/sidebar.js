/* ============================================
   美乐蒂工作台 - 侧边栏导航
   11项固定排序 + 自定义分类
   ============================================ */

// 侧边栏图标 SVG（简约线条风）
const SIDEBAR_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  planning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
  growth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8M12 14v8M6 6h12M4 12h16M8 18h8"/></svg>',
  exercise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M6 8h12M6 16h12M3 10v4M21 10v4"/></svg>',
  fortune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg>',
  finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18M7 14l4-4 4 3 5-6"/></svg>',
  savings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-3 .5-4 1.5C13 6 11 6 10 7c-3 0-6 2-6 6 0 2 1 4 3 5l-1 3h3l1-2h4l1 2h3v-4c2-1 3-3 3-5 0-1-.3-2-.5-3 .5-1 1.5-2 2.5-2V5z"/><circle cx="15" cy="11" r="0.5" fill="currentColor"/></svg>',
  english: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h12M9 3v2c0 4-2 8-6 10M5 9c0 2 2 4 4 5M13 19l4-9 4 9M14.5 16h5"/></svg>',
  invest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>',
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>',
  exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/></svg>',
  weight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l3 12H3L6 8z"/><circle cx="12" cy="5" r="2"/></svg>',
  language: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  inspiration: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>',
  fitness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v3H8V6a4 4 0 0 1 4-4zM6 9h12l1 7c.5 3-2 6-7 6s-7.5-3-7-6l1-7z"/></svg>',
  custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
};

// 固定侧边栏项（顺序永久锁定）
const FIXED_NAV_ITEMS = [
  { route: "dashboard", label: "今日总览", icon: "dashboard", fixed: true },
  { route: "planning", label: "人生规划", icon: "planning", fixed: true },
  { route: "growth", label: "自我成长", icon: "growth", fixed: true },
  { route: "study", label: "学习板块", icon: "study", fixed: true },
  { route: "fitness", label: "身材管理", icon: "fitness", fixed: true },
  { route: "fortune", label: "运势分析", icon: "fortune", fixed: true },
  { route: "export", label: "数据管理", icon: "export", fixed: true },
];

const Sidebar = (function () {
  let currentRoute = "dashboard";

  function getNavItems() {
    const settings = MelodiDB.getSettings();
    const customCats = settings.customCategories || [];
    // 固定项 + 自定义项
    return [...FIXED_NAV_ITEMS, ...customCats];
  }

  function render() {
    const nav = document.getElementById("sidebarNav");
    if (!nav) return;
    const items = getNavItems();
    nav.innerHTML = items.map(item => {
      const iconSvg = SIDEBAR_ICONS[item.icon] || SIDEBAR_ICONS.custom;
      const isActive = item.route === currentRoute ? " active" : "";
      const deleteBtn = item.fixed
        ? ""
        : '<span class="nav-delete" data-route="' + item.route + '">&times;</span>';
      return (
        '<li class="nav-item' + isActive + '" data-route="' + item.route + '">' +
        '<span class="nav-icon">' + iconSvg + "</span>" +
        '<span class="nav-label">' + item.label + "</span>" +
        deleteBtn +
        "</li>"
      );
    }).join("");

    // 绑定点击事件
    nav.querySelectorAll(".nav-item").forEach(el => {
      el.addEventListener("click", function (e) {
        if (e.target.classList.contains("nav-delete")) {
          e.stopPropagation();
          deleteCategory(this.dataset.route);
          return;
        }
        const route = this.dataset.route;
        navigateTo(route);
      });
    });
  }

  // 仅同步顶部标题（用于首屏根据 hash 渲染后校正标题，刷新不再停留在「今日总览」）
  function syncTitle(route) {
    const titleEl = document.getElementById("pageTitle");
    if (!titleEl) return;
    if (route === "settings") { titleEl.textContent = "设置"; return; }
    const items = getNavItems();
    const item = items.find(i => i.route === route);
    if (item) titleEl.textContent = item.label;
  }

  function navigateTo(route) {
    currentRoute = route;
    // 更新 URL hash
    window.location.hash = "#/" + route;
    // 更新激活状态
    document.querySelectorAll(".nav-item").forEach(el => {
      el.classList.toggle("active", el.dataset.route === route);
    });
    // 更新页面标题
    const items = getNavItems();
    const item = items.find(i => i.route === route);
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) {
      if (route === "settings") {
        titleEl.textContent = "设置";
      } else if (item) {
        titleEl.textContent = item.label;
      }
    }
    // 关闭移动端侧边栏
    closeSidebar();
    // 渲染页面内容
    if (window.App && App.renderPage) {
      App.renderPage(route);
    }
  }

  function openSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("show");
  }

  function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
  }

  function addCategory() {
    const name = prompt("请输入分类名称：");
    if (!name || !name.trim()) return;
    const route = "custom_" + Date.now();
    const settings = MelodiDB.getSettings();
    if (!settings.customCategories) settings.customCategories = [];
    settings.customCategories.push({
      route: route,
      label: name.trim(),
      icon: "custom",
      fixed: false,
    });
    MelodiDB.setSettings(settings);
    render();
  }

  function deleteCategory(route) {
    if (!confirm("确定删除这个分类吗？相关数据不会被删除。")) return;
    const settings = MelodiDB.getSettings();
    if (settings.customCategories) {
      settings.customCategories = settings.customCategories.filter(
        c => c.route !== route
      );
      MelodiDB.setSettings(settings);
      // 如果删除的是当前页，跳回首页
      if (currentRoute === route) {
        navigateTo("dashboard");
      } else {
        render();
      }
    }
  }

  function init() {
    render();
    // 新增分类按钮
    const addBtn = document.getElementById("addCategoryBtn");
    if (addBtn) addBtn.addEventListener("click", addCategory);

    // 移动端菜单按钮
    const menuToggle = document.getElementById("menuToggle");
    if (menuToggle) menuToggle.addEventListener("click", openSidebar);

    // 遮罩层点击关闭
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.addEventListener("click", closeSidebar);

    // 设置按钮
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", function () {
        navigateTo("settings");
        closeSidebar();
      });
    }

    // 处理初始 hash
    const hash = window.location.hash;
    if (hash && hash.startsWith("#/")) {
      const route = hash.slice(2);
      if (route === "settings") {
        currentRoute = "settings";
      } else {
        const items = getNavItems();
        if (items.some(i => i.route === route)) {
          currentRoute = route;
        }
      }
    }

    // 监听 hash 变化
    window.addEventListener("hashchange", function () {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#/")) {
        const route = hash.slice(2);
        if (route === "settings") {
          navigateTo("settings");
          return;
        }
        const items = getNavItems();
        if (items.some(i => i.route === route) && route !== currentRoute) {
          navigateTo(route);
        }
      }
    });
  }

  return {
    init,
    render,
    navigateTo,
    syncTitle,
    openSidebar,
    closeSidebar,
    getNavItems,
    getCurrentRoute: () => currentRoute,
  };
})();
