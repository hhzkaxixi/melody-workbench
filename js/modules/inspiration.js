/* ============================================
   美乐蒂工作台 - 灵感清单模块
   无聊时翻出来挑一件充实自己 · 不要求每天做
   类型：创意技能 / 观影 / 听音 / 整理收纳（整理类带软提醒）
   ============================================ */

const InspirationModule = (function () {
  // 类型定义（label + 主题色变量）
  var TYPES = {
    creative: { label: "创意技能", color: "var(--melodi-pink-600)", bg: "var(--melodi-pink-50)" },
    watch: { label: "观影", color: "var(--color-info)", bg: "var(--color-info-bg)" },
    listen: { label: "听音", color: "var(--color-success)", bg: "var(--color-success-bg)" },
    cleanup: { label: "整理收纳", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  };
  var TYPE_ORDER = ["creative", "watch", "listen", "cleanup"];

  // 一键添加的预设（来自小涵的日常清单）
  var PRESETS = {
    creative: ["画画", "打水印", "学习PS", "学习Procreate"],
    watch: ["看电影", "看纪录片"],
    listen: ["听播客", "听sub"],
    cleanup: ["删除图库", "整理小红书收藏", "整理抖音收藏"],
  };

  // 整理类软提醒周期（天）：超过这个天数轻推一下，不做硬闹钟
  var CLEANUP_PERIOD = 30;

  function render() {
    var items = MelodiDB.getList("inspiration");
    var doneCount = items.filter(function (i) { return i.done; }).length;
    var cleanupNudge = buildCleanupNudge(items);

    var html = "";

    // 顶部说明
    html += '<div class="card inspiration-intro">';
    html += '<div class="card-header"><div class="card-title">灵感清单</div>';
    html += '<span style="font-size:var(--font-size-xs);color:var(--text-tertiary);">无聊时翻出来 · 不要求每天做</span></div>';
    html += '<div class="inspiration-summary">共 <b>' + items.length + "</b> 件 · 最近做过 <b>" + doneCount + "</b> 件</div>";
    html += "</div>";

    // 整理类软提醒横幅
    if (cleanupNudge) {
      html += '<div class="inspiration-nudge">' + cleanupNudge + "</div>";
    }

    // 添加表单
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">添加一件想做的事</div></div>';
    html += '<div class="form-row" style="align-items:flex-end;">';
    html += '<div class="form-group" style="flex:1;margin-bottom:0;"><input type="text" class="form-input" id="inspTitle" placeholder="例如：画一张水彩..." /></div>';
    html += '<div class="form-group" style="flex:0 0 110px;margin-bottom:0;">';
    html += '<select class="form-input" id="inspType">';
    TYPE_ORDER.forEach(function (t) {
      html += '<option value="' + t + '">' + TYPES[t].label + "</option>";
    });
    html += "</select></div>";
    html += '<button class="btn btn-primary" id="inspAddBtn">添加</button>';
    html += "</div>";

    // 预设快捷添加
    html += '<div class="insp-presets">';
    TYPE_ORDER.forEach(function (t) {
      html += '<div class="insp-preset-group"><span class="insp-preset-type">' + TYPES[t].label + "</span>";
      PRESETS[t].forEach(function (p) {
        html += '<button class="insp-preset-chip" data-title="' + escapeHtml(p) + '" data-type="' + t + '">+ ' + escapeHtml(p) + "</button>";
      });
      html += "</div>";
    });
    html += "</div>";
    html += "</div>";

    // 清单（按类型分组）
    if (items.length === 0) {
      html += '<div class="empty-state" style="padding:28px;"><div class="empty-state-text">还没有灵感，从上面的预设点一下，或自己加一件吧</div></div>';
    } else {
      TYPE_ORDER.forEach(function (t) {
        var group = items.filter(function (i) { return i.type === t; });
        if (group.length === 0) return;
        html += '<div class="card">';
        html += '<div class="card-header"><div class="card-title"><span class="insp-type-dot" style="background:' + TYPES[t].color + '"></span>' + TYPES[t].label + "</div>";
        html += '<span style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + group.length + " 件</span></div>";
        html += '<div class="insp-list" id="inspList-' + t + '">';
        group.forEach(function (item) {
          html += renderItem(item, t);
        });
        html += "</div></div>";
      });
    }

    setTimeout(setupEvents, 0);
    return html;
  }

  function renderItem(item, type) {
    var sub = "";
    if (type === "cleanup") {
      if (item.lastDone) {
        var d = daysSince(item.lastDone);
        sub = d >= CLEANUP_PERIOD ? "距上次 " + d + " 天 · 该清理啦 ✨" : "上次 " + d + " 天前";
      } else {
        sub = "还没整理过 · 该清理啦 ✨";
      }
    } else if (item.lastDone) {
      sub = "做过 · " + daysSince(item.lastDone) + " 天前";
    }

    var html = '<div class="insp-item' + (item.done ? " done" : "") + '" data-id="' + item.id + '">';
    html += '<div class="insp-item-main">';
    html += '<div class="insp-item-title">' + escapeHtml(item.title) + "</div>";
    if (sub) html += '<div class="insp-item-sub">' + sub + "</div>";
    html += "</div>";
    html += '<div class="insp-item-actions">';
    html += '<button class="btn ' + (item.done ? "btn-ghost" : "btn-secondary") + ' btn-sm insp-done-btn" data-id="' + item.id + '">' + (item.done ? "已做过 · 撤销" : "做过 ✓") + "</button>";
    html += '<button class="btn btn-ghost btn-sm insp-del-btn" data-id="' + item.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>';
    html += "</div></div>";
    return html;
  }

  function buildCleanupNudge(items) {
    var cleanups = items.filter(function (i) { return i.type === "cleanup"; });
    if (cleanups.length === 0) return "";
    var due = cleanups.filter(function (i) {
      if (!i.lastDone) return true;
      return daysSince(i.lastDone) >= CLEANUP_PERIOD;
    });
    if (due.length === 0) return "";
    if (due.length === cleanups.length) {
      return "🧹 距离上次整理已有一阵子，挑一件清理一下手机空间吧～";
    }
    return "🧹 有 " + due.length + " 件整理任务可以安排啦（删图库 / 整理收藏）";
  }

  function setupEvents() {
    var titleInput = document.getElementById("inspTitle");
    var typeInput = document.getElementById("inspType");
    var addBtn = document.getElementById("inspAddBtn");

    function addItem(title, type) {
      title = (title || "").trim();
      if (!title) return;
      type = type || "creative";
      MelodiDB.addToList("inspiration", {
        title: title,
        type: type,
        done: false,
        lastDone: null,
        createdAt: new Date().toISOString(),
      });
      App.renderPageKeepScroll("inspiration");
      App.showReminder("已加入灵感清单", "success");
    }

    if (addBtn && titleInput) {
      addBtn.addEventListener("click", function () {
        addItem(titleInput.value, typeInput ? typeInput.value : "creative");
      });
      titleInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") addItem(titleInput.value, typeInput ? typeInput.value : "creative");
      });
    }

    // 预设快捷添加
    document.querySelectorAll(".insp-preset-chip").forEach(function (chip) {
      chip = chip;
      chip.addEventListener("click", function () {
        addItem(this.dataset.title, this.dataset.type);
      });
    });

    // 标记做过 / 撤销
    document.querySelectorAll(".insp-done-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.dataset.id;
        var item = MelodiDB.getList("inspiration").find(function (i) { return i.id === id; });
        if (!item) return;
        if (item.done) {
          MelodiDB.updateInList("inspiration", id, { done: false });
        } else {
          MelodiDB.updateInList("inspiration", id, { done: true, lastDone: new Date().toISOString() });
        }
        App.renderPageKeepScroll("inspiration");
      });
    });

    // 删除
    document.querySelectorAll(".insp-del-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        MelodiDB.removeFromList("inspiration", this.dataset.id);
        App.renderPageKeepScroll("inspiration");
      });
    });
  }

  /* ===== 工具 ===== */
  function daysSince(ts) {
    var then = new Date(ts).getTime();
    if (isNaN(then)) return 0;
    var diff = Date.now() - then;
    return Math.max(0, Math.floor(diff / 86400000));
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  return { render: render };
})();
window.InspirationModule = InspirationModule;
