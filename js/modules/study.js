/* ============================================
   美乐蒂工作台 - 学习板块
   自定义学习计划 + 番茄钟连续专注 + 学习时长可视化
   ============================================ */

const StudyModule = (function () {
  "use strict";

  var api = {};

  /* 预置学习方向，也可以自定义添加 */
  var PRESET_DIRECTIONS = [
    { key: "exam_civil", label: "考公上岸", icon: "\uD83C\uDFDB\uFE0F" },
    { key: "exam_post", label: "考研", icon: "\uD83C\uDF93" },
    { key: "lang_en", label: "英语", icon: "\uD83D\uDD24" },
    { key: "lang_kr", label: "韩语", icon: "\uD83C\uDDF0\uD83C\uDDF7" },
    { key: "finance", label: "理财金融", icon: "\uD83D\uDCB0" },
    { key: "skill", label: "技能提升", icon: "\uD83D\uDEE0\uFE0F" },
  ];

  var PRIORITIES = [
    { key: "high", label: "最重要", color: "var(--energy-high)" },
    { key: "mid", label: "一般", color: "var(--energy-mid)" },
    { key: "low", label: "有空再做", color: "var(--energy-low)" },
  ];

  /* ===== 番茄钟连续专注状态 ===== */
  var pomo = {
    timer: null,
    phase: "idle",      // idle | work | break
    left: 0,
    round: 0,           // 已完成的专注轮数
    workMin: 25,
    breakMin: 5,
    autoNext: true,     // 连续专注模式
    planName: "",
  };

  /* ===== 数据读写 ===== */
  function getDirections() {
    var custom = MelodiDB.getList("studyDirections");
    var settings = MelodiDB.getSettings();
    var hidden = settings.hiddenDirections || [];
    var presets = PRESET_DIRECTIONS.filter(function (d) { return hidden.indexOf(d.key) < 0; });
    return presets.concat(custom.map(function (c) {
      return { key: c.id, label: c.text, icon: c.icon || "\uD83D\uDCDA", custom: true };
    }));
  }

  function getPlans() {
    return MelodiDB.getList("studyPlans");
  }

  function todayStudy() {
    return MelodiDB.getDayData("study") || { minutes: 0, rounds: 0, byDirection: {} };
  }

  function addStudyMinutes(direction, minutes) {
    var d = todayStudy();
    d.minutes = Math.round(((d.minutes || 0) + minutes) * 10) / 10;
    d.byDirection = d.byDirection || {};
    if (direction) {
      d.byDirection[direction] = Math.round(((d.byDirection[direction] || 0) + minutes) * 10) / 10;
    }
    MelodiDB.setDayData("study", d);
    return d;
  }

  /* ===== 渲染主页面 ===== */
  function render() {
    var dirs = getDirections();
    var plans = getPlans();
    var today = todayStudy();
    var settings = MelodiDB.getSettings();

    var html = "";

    // 今日学习概览
    var weekTotal = 0;
    MelodiDB.getLastNKeys(7).forEach(function (k) {
      var d = MelodiDB.getDayData("study", k);
      if (d) weekTotal += d.minutes || 0;
    });
    var focusToday = MelodiDB.getDayData("focus") || {};

    html += '<div class="stat-grid">';
    html += statCard(Math.round(today.minutes || 0) + " min", "今日学习");
    html += statCard((today.rounds || 0) + " 轮", "今日番茄");
    html += statCard(Math.round(weekTotal) + " min", "本周累计");
    html += statCard(Math.round(focusToday.total || 0) + " min", "今日专注");
    html += "</div>";

    // 番茄钟
    html += renderPomodoro(plans, settings);

    // 学习计划
    html += renderPlans(dirs, plans);

    // 学习方向管理
    html += renderDirections(dirs);

    // 图表
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">近 14 天学习时长</div></div>';
    html += '<div class="chart-box"><canvas id="studyTrendChart"></canvas></div>';
    html += "</div>";

    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">本月各方向时长占比</div></div>';
    html += '<div class="chart-box"><canvas id="studyPieChart"></canvas></div>';
    html += "</div>";

    setTimeout(afterRender, 0);
    return html;
  }

  function statCard(value, label) {
    return '<div class="stat-card"><div class="stat-value">' + value +
      '</div><div class="stat-label">' + label + "</div></div>";
  }

  /* ===== 番茄钟区块 ===== */
  function renderPomodoro(plans, settings) {
    var workMin = settings.pomodoroWork || 25;
    var breakMin = settings.pomodoroBreak || 5;

    var html = '<div class="card pomo-card">';
    html += '<div class="card-header"><div class="card-title">番茄钟</div>';
    html += '<label class="pomo-auto"><input type="checkbox" id="pomoAuto"' + (pomo.autoNext ? " checked" : "") + '> 连续专注</label>';
    html += "</div>";

    html += '<div class="pomo-main">';
    html += '<div class="pomo-ring' + (pomo.phase === "break" ? " break" : "") + '" id="pomoRing">';
    html += '<div class="pomo-time" id="pomoTime">' + fmt(pomo.left || workMin * 60) + "</div>";
    html += '<div class="pomo-phase" id="pomoPhase">' + phaseLabel() + "</div>";
    html += "</div>";
    html += "</div>";

    html += '<div class="pomo-rounds" id="pomoRounds">' + roundDots() + "</div>";

    // 绑定到某个学习计划，时长自动计入该方向
    html += '<div class="pomo-bind">';
    html += '<select class="form-select" id="pomoPlan">';
    html += '<option value="">不绑定计划（只计总时长）</option>';
    plans.filter(function (p) { return !p.done; }).forEach(function (p) {
      html += '<option value="' + p.id + '"' + (pomo.planName === p.text ? " selected" : "") + ">" + esc(p.text) + "</option>";
    });
    html += "</select>";
    html += "</div>";

    html += '<div class="pomo-config">';
    html += '<label>专注 <input type="number" class="form-input pomo-num" id="pomoWork" value="' + workMin + '" min="5" max="120"> 分</label>';
    html += '<label>休息 <input type="number" class="form-input pomo-num" id="pomoBreak" value="' + breakMin + '" min="1" max="30"> 分</label>';
    html += "</div>";

    html += '<div class="flex gap-sm" style="justify-content:center;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary btn-sm" id="pomoStartBtn">' + (pomo.phase === "idle" ? "开始专注" : (pomo.timer ? "暂停" : "继续")) + "</button>";
    html += '<button class="btn btn-secondary btn-sm" id="pomoSkipBtn">跳过本段</button>';
    html += '<button class="btn btn-ghost btn-sm" id="pomoStopBtn">结束</button>';
    html += "</div>";
    html += "</div>";
    return html;
  }

  function phaseLabel() {
    if (pomo.phase === "work") return "专注中 · 第 " + (pomo.round + 1) + " 轮";
    if (pomo.phase === "break") return "休息一下";
    return "准备开始";
  }

  function roundDots() {
    var h = "";
    var total = Math.max(4, pomo.round + 1);
    for (var i = 0; i < total; i++) {
      h += '<span class="pomo-dot' + (i < pomo.round ? " done" : "") + '"></span>';
    }
    h += '<span class="pomo-round-text">已完成 ' + pomo.round + " 轮</span>";
    return h;
  }

  function fmt(sec) {
    var m = Math.floor(Math.max(0, sec) / 60);
    var s = Math.max(0, sec) % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  /* ===== 学习计划区块 ===== */
  function renderPlans(dirs, plans) {
    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">学习计划</div>';
    html += '<span class="muted">' + plans.filter(function (p) { return !p.done; }).length + " 项进行中</span></div>";

    // 新增表单
    html += '<div class="plan-form">';
    html += '<input type="text" class="form-input" id="planText" placeholder="学习目标，比如：行测刷完 500 题">';
    html += '<div class="plan-form-row">';
    html += '<select class="form-select" id="planDir">';
    dirs.forEach(function (d) {
      html += '<option value="' + d.key + '">' + d.icon + " " + esc(d.label) + "</option>";
    });
    html += "</select>";
    html += '<select class="form-select" id="planPriority">';
    PRIORITIES.forEach(function (p) {
      html += '<option value="' + p.key + '">' + p.label + "</option>";
    });
    html += "</select>";
    html += '<input type="date" class="form-input" id="planDue">';
    html += '<button class="btn btn-primary btn-sm" id="planAddBtn">添加</button>';
    html += "</div></div>";

    // 计划列表：按优先级 → 截止日期排序
    var active = plans.filter(function (p) { return !p.done; });
    var order = { high: 0, mid: 1, low: 2 };
    active.sort(function (a, b) {
      var oa = order[a.priority] !== undefined ? order[a.priority] : 1;
      var ob = order[b.priority] !== undefined ? order[b.priority] : 1;
      if (oa !== ob) return oa - ob;
      if (a.due && b.due) return a.due < b.due ? -1 : 1;
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });

    html += '<div class="plan-list">';
    if (active.length === 0) {
      html += '<div class="empty-state">还没有学习计划，先加一个小目标吧</div>';
    }
    active.forEach(function (p) {
      var dir = dirs.filter(function (d) { return d.key === p.direction; })[0];
      var days = p.due ? daysLeft(p.due) : null;
      var pri = PRIORITIES.filter(function (x) { return x.key === p.priority; })[0] || PRIORITIES[1];

      html += '<div class="plan-item" data-id="' + p.id + '">';
      html += '<div class="plan-check" data-plan-done="' + p.id + '"></div>';
      html += '<div class="plan-body">';
      html += '<div class="plan-title">' + esc(p.text) + "</div>";
      html += '<div class="plan-meta">';
      if (dir) html += '<span class="plan-tag">' + dir.icon + " " + esc(dir.label) + "</span>";
      html += '<span class="plan-tag pri-' + pri.key + '">' + pri.label + "</span>";
      if (days !== null) {
        var dueCls = days < 0 ? "overdue" : days <= 3 ? "urgent" : "";
        var dueText = days < 0 ? "已逾期 " + Math.abs(days) + " 天" : days === 0 ? "今天截止" : "剩 " + days + " 天";
        html += '<span class="plan-tag due ' + dueCls + '">' + dueText + "</span>";
      }
      if (p.minutes) html += '<span class="plan-tag">已投入 ' + Math.round(p.minutes) + " 分钟</span>";
      html += "</div></div>";
      html += '<div class="plan-actions">';
      html += '<button class="btn-quickstart" data-plan-start="' + p.id + '">先做5分钟</button>';
      html += '<button class="plan-del" data-plan-del="' + p.id + '">×</button>';
      html += "</div>";
      html += "</div>";
    });
    html += "</div>";

    // 已完成折叠归档
    var done = plans.filter(function (p) { return p.done; });
    if (done.length > 0) {
      html += '<details class="hist-group"><summary>已完成 <span class="hist-badge">' + done.length + "</span></summary>";
      html += '<div class="hist-items">';
      done.slice(0, 30).forEach(function (p) {
        html += '<div class="hist-item"><span class="hist-val" style="text-decoration:line-through;opacity:.65;">' +
          esc(p.text) + "</span>";
        html += '<button class="plan-del" data-plan-del="' + p.id + '">×</button></div>';
      });
      html += "</div></details>";
    }

    html += "</div>";
    return html;
  }

  function daysLeft(due) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var d = new Date(due + "T00:00:00");
    return Math.round((d - t) / 86400000);
  }

  /* ===== 学习方向管理 ===== */
  function renderDirections(dirs) {
    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">学习方向</div></div>';
    html += '<div class="dir-list">';
    dirs.forEach(function (d) {
      html += '<span class="dir-chip">' + d.icon + " " + esc(d.label);
      html += '<button class="dir-del" data-dir-del="' + d.key + '" data-custom="' + (d.custom ? "1" : "0") + '">×</button></span>';
    });
    html += "</div>";
    html += '<div class="flex gap-sm" style="margin-top:12px;">';
    html += '<input type="text" class="form-input" id="dirNew" placeholder="自定义方向，比如：日语 / 摄影">';
    html += '<button class="btn btn-secondary btn-sm" id="dirAddBtn">添加方向</button>';
    html += "</div></div>";
    return html;
  }

  /* ===== 事件绑定 ===== */
  function afterRender() {
    setupPomodoro();
    setupPlans();
    setupDirections();
    drawCharts();
  }

  function setupPomodoro() {
    var startBtn = document.getElementById("pomoStartBtn");
    var skipBtn = document.getElementById("pomoSkipBtn");
    var stopBtn = document.getElementById("pomoStopBtn");
    var autoBox = document.getElementById("pomoAuto");
    var workIn = document.getElementById("pomoWork");
    var breakIn = document.getElementById("pomoBreak");

    if (autoBox) autoBox.addEventListener("change", function () { pomo.autoNext = autoBox.checked; });

    if (workIn) workIn.addEventListener("change", function () {
      pomo.workMin = parseInt(workIn.value) || 25;
      MelodiDB.setSettings({ pomodoroWork: pomo.workMin });
      if (pomo.phase === "idle") { pomo.left = pomo.workMin * 60; paint(); }
    });
    if (breakIn) breakIn.addEventListener("change", function () {
      pomo.breakMin = parseInt(breakIn.value) || 5;
      MelodiDB.setSettings({ pomodoroBreak: pomo.breakMin });
    });

    if (startBtn) startBtn.addEventListener("click", function () {
      if (pomo.timer) { pause(); return; }
      if (pomo.phase === "idle") startWork();
      else resume();
    });

    if (skipBtn) skipBtn.addEventListener("click", function () {
      if (pomo.phase === "idle") return;
      finishPhase(false);
    });

    if (stopBtn) stopBtn.addEventListener("click", stopAll);
  }

  function currentPlanId() {
    var sel = document.getElementById("pomoPlan");
    return sel ? sel.value : "";
  }

  function startWork() {
    var settings = MelodiDB.getSettings();
    pomo.workMin = settings.pomodoroWork || 25;
    pomo.breakMin = settings.pomodoroBreak || 5;
    pomo.phase = "work";
    pomo.left = pomo.workMin * 60;
    tickStart();
    if (window.MelodiADHD) { MelodiADHD.play("tick"); MelodiADHD.toast("专注开始，加油 🎀", "info"); }
  }

  function startBreak() {
    pomo.phase = "break";
    pomo.left = pomo.breakMin * 60;
    tickStart();
    if (window.MelodiADHD) MelodiADHD.toast("休息 " + pomo.breakMin + " 分钟，起来走走", "info");
  }

  function tickStart() {
    if (pomo.timer) clearInterval(pomo.timer);
    pomo.timer = setInterval(function () {
      pomo.left--;
      paint();
      if (pomo.left <= 0) finishPhase(true);
    }, 1000);
    paint();
  }

  function pause() {
    if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = null; }
    var b = document.getElementById("pomoStartBtn");
    if (b) b.textContent = "继续";
  }

  function resume() {
    tickStart();
    var b = document.getElementById("pomoStartBtn");
    if (b) b.textContent = "暂停";
  }

  /* 一段结束：记录时长 → 自动进入下一段（连续专注模式） */
  function finishPhase(natural) {
    if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = null; }

    if (pomo.phase === "work") {
      var total = pomo.workMin * 60;
      var doneMin = Math.round(((total - Math.max(0, pomo.left)) / 60) * 10) / 10;
      if (doneMin > 0) {
        var planId = currentPlanId();
        var dirKey = "";
        if (planId) {
          var plan = getPlans().filter(function (p) { return p.id === planId; })[0];
          if (plan) {
            dirKey = plan.direction;
            MelodiDB.updateInList("studyPlans", planId, { minutes: (plan.minutes || 0) + doneMin });
          }
        }
        var d = addStudyMinutes(dirKey, doneMin);
        if (natural) {
          d.rounds = (d.rounds || 0) + 1;
          MelodiDB.setDayData("study", d);
          pomo.round++;
        }
      }
      if (natural && window.MelodiADHD) {
        MelodiADHD.celebrate("完成第 " + pomo.round + " 轮专注！", document.getElementById("pomoRing"));
      }
      if (pomo.autoNext && natural) { startBreak(); return; }
      pomo.phase = "idle";
      pomo.left = pomo.workMin * 60;
    } else if (pomo.phase === "break") {
      if (window.MelodiADHD) { MelodiADHD.play("alert"); MelodiADHD.buzz([60, 60, 60]); }
      if (pomo.autoNext && natural) { startWork(); return; }
      pomo.phase = "idle";
      pomo.left = pomo.workMin * 60;
    }
    paint();
    refreshStats();
  }

  function stopAll() {
    if (pomo.phase !== "idle") finishPhase(false);
    if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = null; }
    pomo.phase = "idle";
    pomo.left = pomo.workMin * 60;
    paint();
  }

  function paint() {
    var t = document.getElementById("pomoTime");
    var p = document.getElementById("pomoPhase");
    var r = document.getElementById("pomoRing");
    var rd = document.getElementById("pomoRounds");
    var b = document.getElementById("pomoStartBtn");
    if (t) t.textContent = fmt(pomo.left);
    if (p) p.textContent = phaseLabel();
    if (r) r.classList.toggle("break", pomo.phase === "break");
    if (r) r.classList.toggle("running", !!pomo.timer);
    if (rd) rd.innerHTML = roundDots();
    if (b) b.textContent = pomo.phase === "idle" ? "开始专注" : (pomo.timer ? "暂停" : "继续");
  }

  function refreshStats() {
    // 只刷新统计卡，避免整页重绘打断计时
    var d = todayStudy();
    var cards = document.querySelectorAll(".stat-grid .stat-value");
    if (cards.length >= 2) {
      cards[0].textContent = Math.round(d.minutes || 0) + " min";
      cards[1].textContent = (d.rounds || 0) + " 轮";
    }
  }

  function setupPlans() {
    var addBtn = document.getElementById("planAddBtn");
    var textIn = document.getElementById("planText");

    function add() {
      if (!textIn || !textIn.value.trim()) return;
      MelodiDB.addToList("studyPlans", {
        text: textIn.value.trim(),
        direction: (document.getElementById("planDir") || {}).value || "",
        priority: (document.getElementById("planPriority") || {}).value || "mid",
        due: (document.getElementById("planDue") || {}).value || "",
        minutes: 0,
        done: false,
        date: MelodiDB.todayKey(),
      });
      textIn.value = "";
      MelodiDB.clearDraft("studyPlanText");
      if (window.MelodiADHD) MelodiADHD.toast("计划已添加", "success");
      rerender();
    }

    if (addBtn) addBtn.addEventListener("click", add);
    if (textIn) {
      textIn.addEventListener("keydown", function (e) { if (e.key === "Enter") add(); });
      // 输入内容实时留存草稿，切页/刷新都不丢
      var draft = MelodiDB.getDraft("studyPlanText", "");
      if (draft && !textIn.value) textIn.value = draft;
      MelodiDB.registerDraft("studyPlanText", function () { return textIn.value; });
      textIn.addEventListener("input", function () { MelodiDB.saveDraft("studyPlanText", textIn.value); });
    }

    document.querySelectorAll("[data-plan-done]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-plan-done");
        MelodiDB.updateInList("studyPlans", id, { done: true, doneAt: new Date().toISOString() });
        if (window.MelodiADHD) MelodiADHD.celebrate(null, el);
        setTimeout(rerender, 420);
      });
    });

    document.querySelectorAll("[data-plan-del]").forEach(function (el) {
      el.addEventListener("click", function () {
        MelodiDB.removeFromList("studyPlans", el.getAttribute("data-plan-del"));
        rerender();
      });
    });

    // 5分钟启动：直接进专注模式
    document.querySelectorAll("[data-plan-start]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-plan-start");
        var plan = getPlans().filter(function (p) { return p.id === id; })[0];
        if (!plan || !window.MelodiADHD) return;
        MelodiADHD.quickStart(plan.text, function (min) {
          if (min > 0) {
            MelodiDB.updateInList("studyPlans", id, { minutes: (plan.minutes || 0) + min });
            addStudyMinutes(plan.direction, min);
            rerender();
          }
        });
      });
    });
  }

  function setupDirections() {
    var addBtn = document.getElementById("dirAddBtn");
    var input = document.getElementById("dirNew");
    if (addBtn) addBtn.addEventListener("click", function () {
      if (!input || !input.value.trim()) return;
      MelodiDB.addToList("studyDirections", { text: input.value.trim(), icon: "\uD83D\uDCDA" });
      input.value = "";
      rerender();
    });
    if (input) input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && addBtn) addBtn.click();
    });

    document.querySelectorAll("[data-dir-del]").forEach(function (el) {
      el.addEventListener("click", function () {
        var key = el.getAttribute("data-dir-del");
        if (el.getAttribute("data-custom") === "1") {
          MelodiDB.removeFromList("studyDirections", key);
        } else {
          var s = MelodiDB.getSettings();
          var hidden = s.hiddenDirections || [];
          if (hidden.indexOf(key) < 0) hidden.push(key);
          MelodiDB.setSettings({ hiddenDirections: hidden });
        }
        rerender();
      });
    });
  }

  function drawCharts() {
    if (typeof MelodiCharts === "undefined") return;

    var keys = MelodiDB.getLastNKeys(14);
    var labels = keys.map(function (k) { return k.slice(5); });
    var mins = keys.map(function (k) {
      var d = MelodiDB.getDayData("study", k);
      return d ? Math.round(d.minutes || 0) : 0;
    });
    MelodiCharts.barChart("studyTrendChart", labels, [{ label: "学习时长(分钟)", data: mins }]);

    // 本月各方向占比
    var month = MelodiDB.getMonthData("study");
    var byDir = {};
    Object.keys(month).forEach(function (k) {
      var bd = month[k].byDirection || {};
      Object.keys(bd).forEach(function (d) { byDir[d] = (byDir[d] || 0) + bd[d]; });
    });
    var dirs = getDirections();
    var pieLabels = [], pieData = [];
    Object.keys(byDir).forEach(function (k) {
      var d = dirs.filter(function (x) { return x.key === k; })[0];
      pieLabels.push(d ? d.label : k);
      pieData.push(Math.round(byDir[k]));
    });
    if (pieData.length === 0) { pieLabels = ["暂无数据"]; pieData = [1]; }
    MelodiCharts.doughnutChart("studyPieChart", pieLabels, pieData);
  }

  function rerender() {
    var content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = render();
    afterRender();
  }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  api.render = render;
  api.afterRender = afterRender;
  api.getPlans = getPlans;
  api.getDirections = getDirections;
  api.addStudyMinutes = addStudyMinutes;
  return api;
})();
