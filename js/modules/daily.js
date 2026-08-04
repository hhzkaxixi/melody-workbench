/* ============================================
   美乐蒂工作台 - 日常管理模块
   睡眠作息 · 饮食健康 · 饮水 · 今日任务 · 可视化
   ============================================ */

const DailyModule = (function () {
  var settings = null;
  var today = "";
  var activeTab = "sleep"; // 今日总览当前展开的分类

  // 默认饮品类型（参考《日常养成方案》每日饮品清单；仅作选择，份量自定义）
  var DEFAULT_DRINK_TYPES = [
    { key: "water", name: "温水", icon: "💧" },
    { key: "soymilk", name: "豆浆", icon: "🥛" },
    { key: "oolong", name: "荔枝乌龙", icon: "🍵" },
    { key: "jasmine", name: "茉莉绿茶", icon: "🌿" },
    { key: "oatmilk", name: "乌龙燕麦奶", icon: "🥤" },
    { key: "coffee", name: "黑咖啡", icon: "☕" },
    { key: "lemonoil", name: "橄榄油柠檬", icon: "🍋" }
  ];
  // 饮品类型 = 默认 + 用户自定义（持久化在 drinkTypes 列表里）
  function getDrinkTypes() {
    var custom = MelodiDB.getList("drinkTypes") || [];
    return DEFAULT_DRINK_TYPES.concat(custom);
  }
  var selectedDrinkKey = null;

  function render() {
    settings = MelodiDB.getSettings();
    today = MelodiDB.todayKey();
    var sleepData = MelodiDB.getDayData("sleep") || {};
    var waterAmount = sleepData.water || 0;
    var waterPct = Math.min(100, (waterAmount / settings.waterTarget) * 100);
    var tasks = MelodiDB.getList("tasks").filter(function (t) {
      return !t.date || t.date === today;
    });
    var doneCount = tasks.filter(function (t) { return t.done; }).length;
    var hour = new Date().getHours();
    var greeting = "你好，小涵";
    if (hour < 6) greeting = "夜深了，早些休息";
    else if (hour < 11) greeting = "早安，新的一天";
    else if (hour < 14) greeting = "中午好";
    else if (hour < 18) greeting = "下午好";
    else if (hour < 22) greeting = "晚上好";
    else greeting = "睡前别忘打卡";

    var weekday = ["日", "一", "二", "三", "四", "五", "六"][new Date().getDay()];

    var html = "";

    // 欢迎语
    html += '<div class="card" style="background:linear-gradient(135deg,var(--melodi-pink-100),var(--melodi-pink-50));border:none;">';
    html += '<div style="font-size:var(--font-size-xl);font-weight:600;color:var(--melodi-pink-700);">' + greeting + "</div>";
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-top:4px;">今天是 ' + today.replace(/-/g, "/") + " 星期" + weekday + "</div>";
    html += "</div>";

    // 统计概览
    var checkinCount = 0;
    ["wellness", "skincare", "growth", "exercise", "leisure"].forEach(function (m) {
      var c = MelodiDB.getCheckins(m, today);
      Object.keys(c).forEach(function (k) { if (c[k]) checkinCount++; });
    });
    var growthData = MelodiDB.getDayData("growth") || {};
    var totalStudyMin = (growthData.readingMinutes || 0) + (growthData.calligraphyMinutes || 0) + (growthData.wordsMinutes || 0);

    html += '<div class="stat-grid">';
    html += statCard(doneCount + "/" + tasks.length, "今日任务");
    html += '<div class="stat-card" id="statWater"><div class="stat-value">' + (waterAmount / 1000).toFixed(1) + 'L</div><div class="stat-label">饮水量</div></div>';
    html += '<div class="stat-card" id="statSleep"><div class="stat-value">' + (sleepData.duration ? sleepData.duration.toFixed(1) + "h" : "--") + '</div><div class="stat-label">睡眠</div></div>';
    html += statCard(totalStudyMin + "min", "学习时长");
    html += "</div>";

    // 分类切换（平行分类，点击展开对应板块，不再全部顺次滑下）
    html += '<div class="tabs" id="dailyTabs">';
    html += '<div class="tab' + (activeTab === "sleep" ? " active" : "") + '" data-tab="sleep">睡眠作息</div>';
    html += '<div class="tab' + (activeTab === "checkin" ? " active" : "") + '" data-tab="checkin">快速打卡</div>';
    html += '<div class="tab' + (activeTab === "water" ? " active" : "") + '" data-tab="water">饮水量</div>';
    html += '<div class="tab' + (activeTab === "diet" ? " active" : "") + '" data-tab="diet">饮食记录</div>';
    html += '<div class="tab' + (activeTab === "charts" ? " active" : "") + '" data-tab="charts">数据趋势</div>';
    html += "</div>";

    // 睡眠作息
    html += '<div class="tab-panel' + (activeTab === "sleep" ? " active" : "") + '" data-panel="sleep" id="panel-sleep"><div id="sleepSection">' + renderSleepSection(sleepData) + '</div></div>';

    // 快速打卡
    html += '<div class="tab-panel' + (activeTab === "checkin" ? " active" : "") + '" data-panel="checkin" id="panel-checkin">' + renderQuickCheckin() + '</div>';

    // 饮水进度
    var waterLogHtml = renderWaterLogHtml(sleepData.waterLog);
    html += '<div class="tab-panel' + (activeTab === "water" ? " active" : "") + '" data-panel="water" id="panel-water"><div class="card">';
    html += '<div class="card-header"><div class="card-title">饮水量</div>';
    html += '<div class="flex gap-sm">';
    html += '<button class="btn btn-secondary btn-sm" data-water="500">+500ml</button>';
    html += '<button class="btn btn-secondary btn-sm" data-water="1000">+1L</button>';
    html += '<button class="btn btn-ghost btn-sm" data-water="reset">重置</button>';
    html += "</div></div>";
    html += '<div class="water-chips-label">选择饮品（先点选，再填份量记录）</div>';
    html += '<div class="water-chips" id="drinkChips">' + renderDrinkChipsHtml() + '</div>';
    html += '<div class="water-add-row">';
    html += '<input class="water-vol-input" id="drinkVol" type="number" min="1" step="50" inputmode="numeric" placeholder="份量(ml)" />';
    html += '<button class="btn btn-primary btn-sm" id="drinkRecord">记录</button>';
    html += '</div>';
    html += '<div class="water-custom-label">自定义饮品</div>';
    html += '<div class="water-add-type">';
    html += '<input class="wtype-name" id="drinkName" type="text" maxlength="12" placeholder="饮品名" />';
    html += '<input class="wtype-icon" id="drinkIcon" type="text" maxlength="2" placeholder="🥤" />';
    html += '<button class="btn btn-ghost btn-sm" id="addDrinkType">添加</button>';
    html += '</div>';
    html += '<div class="wtype-emojis">';
    ["🥤", "🧋", "🍵", "☕", "🥛", "🧃", "🍶", "🫖", "🧉", "🍹", "🍺", "🍷", "🧊"].forEach(function (em) {
      html += '<button class="wtype-emoji" data-emoji="' + em + '" type="button">' + em + '</button>';
    });
    html += '</div>';
    html += '<div class="progress-bar"><div class="progress-fill' + (waterPct >= 100 ? " complete" : "") + '" id="waterFill" style="width:' + waterPct + '%"></div></div>';
    html += '<div class="progress-label" id="waterLabel"><span>' + (waterAmount / 1000).toFixed(2) + "L / " + (settings.waterTarget / 1000).toFixed(1) + "L</span><span>" + (waterPct >= 100 ? "已达标" : Math.round(waterPct) + "%") + "</span></div>";
    html += '<div id="waterLog" class="water-log">' + waterLogHtml + '</div>';
    html += '<div class="water-tip">💡 每天 ≥2000ml，茶咖为辅；睡前 1.5 小时少喝，避免起夜</div>';
    html += "</div></div>";

    // 饮食记录
    html += '<div class="tab-panel' + (activeTab === "diet" ? " active" : "") + '" data-panel="diet" id="panel-diet"><div id="dietSection">' + renderDietSection() + '</div></div>';

    // 月度图表
    html += '<div class="tab-panel' + (activeTab === "charts" ? " active" : "") + '" data-panel="charts" id="panel-charts">' + renderMonthlyCharts() + '</div>';

    setTimeout(setupEvents, 0);
    return html;
  }

  /* ===== 统计卡片 ===== */
  function statCard(value, label) {
    return '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + "</div></div>";
  }

  /* ===== 睡眠作息 ===== */
  function renderSleepSection(sleepData) {
    var target = settings.sleepTarget || 7.5;
    var duration = sleepData.duration || 0;
    var napDuration = sleepData.napDuration || 0;
    var isAdequate = duration >= target;
    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">睡眠作息</div>';
    html += '<span style="font-size:var(--font-size-xs);color:' + (duration > 0 ? (isAdequate ? "var(--color-success)" : "var(--color-danger)") : "var(--text-tertiary)") + ';">目标 ' + target + 'h</span></div>';
    html += '<div class="form-row" style="margin-bottom:12px;">';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">入睡时间</label><input type="time" class="form-input" id="sleepBedtime" value="' + (sleepData.bedtime || "") + '"></div>';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">起床时间</label><input type="time" class="form-input" id="sleepWaketime" value="' + (sleepData.waketime || "") + '"></div>';
    html += '<div class="form-group" style="margin-bottom:0;max-width:100px;"><label class="form-label">时长</label><div id="sleepDurationDisplay" style="padding:10px 0;font-size:var(--font-size-md);font-weight:600;color:' + (duration > 0 ? (isAdequate ? "var(--color-success)" : "var(--color-danger)") : "var(--text-tertiary)") + ';">' + (duration > 0 ? duration.toFixed(1) + "h" : "--") + "</div></div>";
    html += "</div>";
    if (duration > 0 && !isAdequate) {
      html += '<div id="sleepHint" style="padding:8px 12px;background:rgba(255,107,149,0.08);border-radius:var(--radius-md);font-size:var(--font-size-xs);color:var(--melodi-pink-600);margin-top:8px;">未达标，今晚提前 ' + ((target - duration) * 60).toFixed(0) + " 分钟入睡即可达标</div>";
    }
    // 午觉
    html += '<div class="section-divider" style="margin:14px 0 10px;"><span>午觉</span></div>';
    html += '<div class="form-row" style="margin-bottom:12px;">';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">开始</label><input type="time" class="form-input" id="napStart" value="' + (sleepData.napStart || "") + '"></div>';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">结束</label><input type="time" class="form-input" id="napEnd" value="' + (sleepData.napEnd || "") + '"></div>';
    html += '<div class="form-group" style="margin-bottom:0;max-width:100px;"><label class="form-label">午觉时长</label><div id="napDurationDisplay" style="padding:10px 0;font-size:var(--font-size-md);font-weight:600;color:' + (napDuration > 0 ? "var(--color-success)" : "var(--text-tertiary)") + ';">' + (napDuration > 0 ? napDuration.toFixed(1) + "h" : "--") + "</div></div>";
    html += "</div>";
    html += '<button class="btn btn-primary btn-sm" id="saveSleepBtn" style="margin-top:8px;">保存睡眠记录</button>';
    html += "</div>";
    return html;
  }

  /* ===== 快速打卡 ===== */
  function renderQuickCheckin() {
    var quickCheckins = [
      { key: "supplement", label: "保健品", icon: "\uD83D\uDC8A", module: "wellness" },
      { key: "ginseng", label: "红参元", icon: "\uD83E\uDED6", module: "wellness" },
      { key: "footbath", label: "泡脚", icon: "\uD83E\uDDB6", module: "wellness" },
      { key: "mask", label: "面膜", icon: "\uD83C\uDFAD", module: "skincare" },
      { key: "reading", label: "阅读", icon: "\uD83D\uDCD6", module: "growth" },
      { key: "calligraphy", label: "练字", icon: "\u270F\uFE0F", module: "growth" },
      { key: "words", label: "背词", icon: "\uD83D\uDD24", module: "growth" },
      { key: "exercise", label: "运动", icon: "\uD83D\uDCAA", module: "exercise" },
      { key: "sub_podcast", label: "sub/播客", icon: "\uD83C\uDFA7", module: "leisure" },
      { key: "perfume", label: "香水", icon: "\uD83D\uDC85", module: "leisure" },
    ];
    var todayCheckins = {};
    ["wellness", "skincare", "growth", "leisure"].forEach(function (m) {
      var data = MelodiDB.getDayData(m) || {};
      if (data.checkins) Object.assign(todayCheckins, data.checkins);
    });
    var exerciseCheckins = MelodiDB.getCheckins("exercise", today);
    if (exerciseCheckins.exercise) todayCheckins.exercise = true;

    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">快速打卡</div></div>';
    html += '<div class="checkin-grid">';
    quickCheckins.forEach(function (c) {
      var checked = todayCheckins[c.key];
      html += '<div class="checkin-item' + (checked ? " checked" : "") + '" data-module="' + c.module + '" data-key="' + c.key + '">';
      html += '<div class="checkin-icon">' + c.icon + "</div>";
      html += '<div class="checkin-label">' + c.label + "</div>";
      html += '<div class="checkin-check"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5l-1.4 1.4l4.9 4.9l11-11l-1.4-1.4z"/></svg></div>';
      html += "</div>";
    });
    html += "</div></div>";
    return html;
  }

  /* ===== 饮食记录 ===== */
  // 兼容旧数据：meal 可能是单个对象，也可能是对象数组。统一转成数组。
  function mealItems(meal) {
    if (!meal) return [];
    if (Array.isArray(meal)) return meal;
    return [meal];
  }

  // 渲染单条食物（含编辑/删除）
  function renderDietItem(it, mealKey, idx) {
    var html = '<div class="diet-item" data-meal="' + mealKey + '" data-idx="' + idx + '">';
    html += '<div class="diet-item-main">';
    html += '<div class="diet-meal-text">' + escapeHtml(it.text || "") + "</div>";
    if (it.protein || it.carbs || it.fat) {
      html += '<div class="nutri-row">';
      html += '<span class="nutri-tag p">蛋白 ' + (it.protein || 0) + "g</span>";
      html += '<span class="nutri-tag c">碳水 ' + (it.carbs || 0) + "g</span>";
      html += '<span class="nutri-tag f">脂肪 ' + (it.fat || 0) + "g</span>";
      html += "</div>";
    }
    if (it.photo) {
      html += '<img src="' + it.photo + '" class="diet-meal-photo" alt="食物照片">';
    }
    html += "</div>";
    html += '<div class="diet-item-actions">';
    html += '<button class="btn btn-ghost btn-sm diet-item-edit" data-meal="' + mealKey + '" data-idx="' + idx + '">编辑</button>';
    html += '<button class="btn btn-ghost btn-sm diet-item-del" data-meal="' + mealKey + '" data-idx="' + idx + '">删除</button>';
    html += "</div>";
    html += "</div>";
    return html;
  }

  function renderDietSection() {
    var dietData = MelodiDB.getDayData("diet") || {};
    var meals = dietData.meals || {};
    var mealTypes = [
      { key: "breakfast", label: "早餐", icon: "\uD83C\uDF5E", color: "var(--melodi-pink-400)" },
      { key: "lunch", label: "午餐", icon: "\uD83C\uDF5D", color: "var(--color-warning)" },
      { key: "dinner", label: "晚餐", icon: "\uD83C\uDF63", color: "var(--color-success)" },
      { key: "snack", label: "零食", icon: "\uD83C\uDF6B", color: "var(--color-info)" },
    ];

    var totalCount = 0;
    mealTypes.forEach(function (m) {
      mealItems(meals[m.key]).forEach(function (it) {
        totalCount++;
      });
    });

    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">饮食记录</div>';
    html += '<span style="font-size:var(--font-size-xs);color:var(--text-tertiary);">共 ' + totalCount + ' 项</span></div>';

    mealTypes.forEach(function (m) {
      var items = mealItems(meals[m.key]);

      html += '<div class="diet-meal-item">';
      html += '<div class="diet-meal-header">';
      html += '<span class="diet-meal-icon">' + m.icon + "</span>";
      html += '<span class="diet-meal-label">' + m.label + "</span>";
      if (items.length > 0) {
        html += '<span class="diet-meal-cal">' + items.length + ' 项</span>';
      }
      html += "</div>";

      // 已添加的食物列表
      html += '<div class="diet-meal-list">';
      items.forEach(function (it, idx) {
        html += renderDietItem(it, m.key, idx);
      });
      html += "</div>";

      // 常驻的「单独添加」输入框
      html += '<div class="diet-meal-input" data-meal="' + m.key + '">';
      html += '<input type="text" class="form-input diet-input-text" placeholder="添加' + m.label + '，比如：牛奶一杯" style="margin-bottom:6px;">';
      html += '<div class="food-suggest" data-meal="' + m.key + '"></div>';
      html += '<div class="flex gap-sm" style="align-items:flex-end;flex-wrap:wrap;">';
      html += '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">拍照识别';
      html += '<input type="file" accept="image/*" capture="environment" class="diet-input-photo" style="display:none;">';
      html += "</label>";
      html += '<button class="btn btn-primary btn-sm diet-add-btn">添加</button>';
      html += "</div>";
      html += '<div class="food-vision-result" data-meal="' + m.key + '"></div>';
      html += "</div>";
      html += "</div>";
    });

    // 今日营养成分汇总（不含热量）
    if (typeof MelodiFood !== "undefined") {
      var nutri = MelodiFood.getDayNutrition();
      if (nutri.protein > 0 || nutri.fat > 0 || nutri.carbs > 0) {
        html += '<div class="nutri-summary">';
        html += '<div class="nutri-sum-item"><b>' + nutri.protein + "</b><span>蛋白质 g</span></div>";
        html += '<div class="nutri-sum-item"><b>' + nutri.carbs + "</b><span>碳水 g</span></div>";
        html += '<div class="nutri-sum-item"><b>' + nutri.fat + "</b><span>脂肪 g</span></div>";
        html += "</div>";
      }
    }

    html += "</div>";
    return html;
  }

  /* ===== 今日任务 ===== */
  function renderTaskSection() {
    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">今日任务</div></div>';
    html += '<div class="task-add-row quad-add-row">';
    html += '<input type="text" class="form-input" id="taskInput" placeholder="添加任务，先选好象限…" />';
    html += '<div class="quad-select" id="quadSelect">';
    html += '<button type="button" class="quad-pick q1 active" data-q="q1">重要紧急</button>';
    html += '<button type="button" class="quad-pick q2" data-q="q2">重要不紧急</button>';
    html += '<button type="button" class="quad-pick q3" data-q="q3">紧急不重要</button>';
    html += '<button type="button" class="quad-pick q4" data-q="q4">不重要不紧急</button>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" id="addTaskBtn">添加</button>';
    html += "</div>";
    html += '<div id="quadrantGrid" class="quadrant-grid">';
    html += '<div class="quadrant q1"><div class="quadrant-head"><span>重要 · 紧急</span><small>立刻做</small></div><div class="quadrant-tasks" id="quad-q1"></div></div>';
    html += '<div class="quadrant q2"><div class="quadrant-head"><span>重要 · 不紧急</span><small>计划做</small></div><div class="quadrant-tasks" id="quad-q2"></div></div>';
    html += '<div class="quadrant q3"><div class="quadrant-head"><span>不重要 · 紧急</span><small>快速处理</small></div><div class="quadrant-tasks" id="quad-q3"></div></div>';
    html += '<div class="quadrant q4"><div class="quadrant-head"><span>不重要 · 不紧急</span><small>有空再做</small></div><div class="quadrant-tasks" id="quad-q4"></div></div>';
    html += '</div>';
    html += '<div class="task-tip">选好象限再添加 · 拖动 ⠿ 排序 · 点「先做5分钟」立刻进入专注</div>';
    html += '<div class="history-section" id="taskHistory"></div>';
    html += "</div>";
    return html;
  }

  /* ===== 月度图表 ===== */
  function renderMonthlyCharts() {
    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">本月数据趋势</div></div>';

    // 睡眠曲线
    html += '<div class="chart-title">睡眠时长 (小时)</div>';
    html += '<div class="chart-canvas-wrap" style="margin-bottom:16px;"><canvas id="sleepChart"></canvas></div>';

    // 饮水
    html += '<div class="chart-title">饮水量 (L)</div>';
    html += '<div class="chart-canvas-wrap"><canvas id="dietChart"></canvas></div>';

    html += "</div>";
    return html;
  }

  /* ===== 事件绑定 ===== */
  function setupEvents() {
    setupSleepEvents();
    setupCheckinEvents();
    setupWaterEvents();
    setupDietEvents();
    setupTabEvents();
    // 图表只在「数据趋势」标签展开时绘制（隐藏容器里 Chart.js 会画成 0 尺寸）
    if (activeTab === "charts") renderCharts();
  }

  /* === 分类切换（平行分类展开） === */
  function setupTabEvents() {
    var tabsBar = document.getElementById("dailyTabs");
    if (!tabsBar) return;
    tabsBar.addEventListener("click", function (e) {
      var tab = e.target.closest(".tab");
      if (!tab) return;
      var name = tab.dataset.tab;
      if (name === activeTab) return;
      activeTab = name;
      tabsBar.querySelectorAll(".tab").forEach(function (t) {
        t.classList.toggle("active", t === tab);
      });
      document.querySelectorAll(".tab-panel").forEach(function (p) {
        p.classList.toggle("active", p.dataset.panel === name);
      });
      if (name === "charts") renderCharts();
    });
  }

  /* === 睡眠事件 === */
  function setupSleepEvents() {
    var bedtimeEl = document.getElementById("sleepBedtime");
    var waketimeEl = document.getElementById("sleepWaketime");
    var napStartEl = document.getElementById("napStart");
    var napEndEl = document.getElementById("napEnd");
    var saveBtn = document.getElementById("saveSleepBtn");

    function calcDuration() {
      if (!bedtimeEl || !waketimeEl) return 0;
      if (!bedtimeEl.value || !waketimeEl.value) return 0;
      var bt = bedtimeEl.value.split(":");
      var wt = waketimeEl.value.split(":");
      var btMin = parseInt(bt[0]) * 60 + parseInt(bt[1]);
      var wtMin = parseInt(wt[0]) * 60 + parseInt(wt[1]);
      var diff = wtMin - btMin;
      if (diff < 0) diff += 24 * 60; // 跨天
      return diff / 60;
    }

    function calcNapDuration() {
      if (!napStartEl || !napEndEl) return 0;
      if (!napStartEl.value || !napEndEl.value) return 0;
      var st = napStartEl.value.split(":");
      var et = napEndEl.value.split(":");
      var stMin = parseInt(st[0]) * 60 + parseInt(st[1]);
      var etMin = parseInt(et[0]) * 60 + parseInt(et[1]);
      var diff = etMin - stMin;
      if (diff < 0) diff += 24 * 60; // 跨天（极少数情况）
      return diff / 60;
    }

    function updateSleepDuration() {
      var dur = calcDuration();
      var target = settings.sleepTarget || 7.5;
      var adequate = dur > 0 && dur >= target;
      var disp = document.getElementById("sleepDurationDisplay");
      if (disp) {
        disp.textContent = dur > 0 ? dur.toFixed(1) + "h" : "--";
        disp.style.color = dur > 0 ? (adequate ? "var(--color-success)" : "var(--color-danger)") : "var(--text-tertiary)";
      }
      var hint = document.getElementById("sleepHint");
      if (hint) {
        if (dur > 0 && !adequate) {
          hint.style.display = "";
          hint.textContent = "未达标，今晚提前 " + ((target - dur) * 60).toFixed(0) + " 分钟入睡即可达标";
        } else {
          hint.style.display = "none";
        }
      }
    }

    function updateNapDuration() {
      var dur = calcNapDuration();
      var disp = document.getElementById("napDurationDisplay");
      if (disp) {
        disp.textContent = dur > 0 ? dur.toFixed(1) + "h" : "--";
        disp.style.color = dur > 0 ? "var(--color-success)" : "var(--text-tertiary)";
      }
    }

    if (bedtimeEl) bedtimeEl.addEventListener("change", updateSleepDuration);
    if (waketimeEl) waketimeEl.addEventListener("change", updateSleepDuration);
    if (napStartEl) napStartEl.addEventListener("change", updateNapDuration);
    if (napEndEl) napEndEl.addEventListener("change", updateNapDuration);

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var duration = calcDuration();
        var napDuration = calcNapDuration();
        var data = MelodiDB.getDayData("sleep") || {};
        data.bedtime = bedtimeEl.value;
        data.waketime = waketimeEl.value;
        data.duration = duration;
        data.napStart = napStartEl ? napStartEl.value : "";
        data.napEnd = napEndEl ? napEndEl.value : "";
        data.napDuration = napStartEl && napEndEl && napStartEl.value && napEndEl.value ? napDuration : (data.napDuration || 0);
        data.water = data.water || 0;
        MelodiDB.setDayData("sleep", data);
        App.showReminder(duration >= (settings.sleepTarget || 7.5) ? "睡眠达标！" : "已记录，注意早睡", "success");
        refreshSleepSection();
      });
    }
  }

  function refreshSleepSection() {
    var box = document.getElementById("sleepSection");
    if (!box) { App.renderPage("dashboard"); return; }
    var sleepData = MelodiDB.getDayData("sleep") || {};
    box.innerHTML = renderSleepSection(sleepData);
    setupSleepEvents();
    var stat = document.getElementById("statSleep");
    if (stat) stat.textContent = sleepData.duration ? sleepData.duration.toFixed(1) + "h" : "--";
  }

  /* === 打卡事件 === */
  function setupCheckinEvents() {
    document.querySelectorAll(".checkin-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var module = this.dataset.module;
        var key = this.dataset.key;
        var newState = MelodiDB.toggleCheckin(module, key);
        this.classList.toggle("checked", newState);
        App.showReminder(newState ? "打卡成功" : "已取消", newState ? "success" : "warning");
      });
    });
  }

  /* === 饮水事件 === */
  function setupWaterEvents() {
    // 饮品 chips：事件委托在容器上（支持动态增删后仍有效）
    var chips = document.getElementById("drinkChips");
    if (chips) {
      chips.addEventListener("click", function (e) {
        var del = e.target.closest("[data-del-type]");
        if (del) {
          e.stopPropagation();
          removeDrinkType(del.dataset.delType);
          return;
        }
        var chip = e.target.closest("[data-drink]");
        if (chip) {
          selectedDrinkKey = chip.dataset.drink;
          chips.querySelectorAll("[data-drink]").forEach(function (b) {
            b.classList.toggle("selected", b === chip);
          });
          var input = document.getElementById("drinkVol");
          if (input && !input.value) input.focus();
        }
      });
    }
    // 记录选中饮品 + 自定义份量
    var recBtn = document.getElementById("drinkRecord");
    if (recBtn) recBtn.addEventListener("click", recordDrinkCustom);
    var volInput = document.getElementById("drinkVol");
    if (volInput) {
      volInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") recordDrinkCustom();
      });
    }
    // 添加自定义饮品
    var addBtn = document.getElementById("addDrinkType");
    if (addBtn) addBtn.addEventListener("click", addDrinkType);
    var nameInput = document.getElementById("drinkName");
    if (nameInput) {
      nameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") addDrinkType();
      });
    }
    // 快捷选图标 emoji
    var emojiRow = document.querySelector(".wtype-emojis");
    if (emojiRow) {
      emojiRow.addEventListener("click", function (e) {
        var em = e.target.closest("[data-emoji]");
        if (em) {
          var iconInput = document.getElementById("drinkIcon");
          if (iconInput) iconInput.value = em.dataset.emoji;
        }
      });
    }
    // 快捷加白水 / 重置
    document.querySelectorAll("[data-water]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = this.dataset.water;
        if (action === "reset") {
          resetWater();
        } else {
          addWater(parseInt(action, 10));
        }
      });
    });
    // 删除某条饮水记录（事件委托，容器持久）
    var logContainer = document.getElementById("waterLog");
    if (logContainer) {
      logContainer.addEventListener("click", function (e) {
        var rm = e.target.closest("[data-rm-drink]");
        if (rm) removeDrink(parseInt(rm.dataset.rmDrink, 10));
      });
    }
  }

  function renderDrinkChipsHtml() {
    var types = getDrinkTypes();
    return types.map(function (d) {
      var del = d.custom ? '<span class="dc-del" data-del-type="' + d.id + '" title="删除">✕</span>' : "";
      return '<button class="drink-chip" data-drink="' + d.key + '" type="button"><span class="dc-icon">' + d.icon + '</span><span class="dc-name">' + d.name + '</span>' + del + '</button>';
    }).join("");
  }

  function addDrinkType() {
    var nameEl = document.getElementById("drinkName");
    var iconEl = document.getElementById("drinkIcon");
    var name = nameEl ? nameEl.value.trim() : "";
    var icon = iconEl ? iconEl.value.trim() : "";
    if (!name) {
      App.showReminder("请输入饮品名称", "warning");
      if (nameEl) nameEl.focus();
      return;
    }
    var key = "custom_" + Date.now().toString(36);
    MelodiDB.addToList("drinkTypes", { key: key, name: name, icon: icon || "🥤", custom: true });
    if (nameEl) nameEl.value = "";
    if (iconEl) iconEl.value = "";
    var chips = document.getElementById("drinkChips");
    if (chips) chips.innerHTML = renderDrinkChipsHtml();
    App.showReminder("已添加 " + (icon || "🥤") + " " + name, "success");
  }

  function removeDrinkType(id) {
    MelodiDB.removeFromList("drinkTypes", id);
    if (selectedDrinkKey && selectedDrinkKey.indexOf("custom_") === 0) {
      // 若删掉的是当前选中项，重新取 key 判断
      var still = getDrinkTypes().some(function (d) { return d.key === selectedDrinkKey; });
      if (!still) selectedDrinkKey = null;
    }
    var chips = document.getElementById("drinkChips");
    if (chips) chips.innerHTML = renderDrinkChipsHtml();
  }

  function recordDrinkCustom() {
    var input = document.getElementById("drinkVol");
    var vol = input ? parseInt(input.value, 10) : 0;
    if (!vol || vol <= 0) {
      App.showReminder("请输入份量(ml)", "warning");
      if (input) input.focus();
      return;
    }
    var def = null;
    if (selectedDrinkKey) {
      var types = getDrinkTypes();
      for (var i = 0; i < types.length; i++) {
        if (types[i].key === selectedDrinkKey) { def = types[i]; break; }
      }
    }
    addWater(vol, def);
    if (input) input.value = "";
  }

  function addWater(vol, def) {
    var data = MelodiDB.getDayData("sleep") || {};
    data.water = (data.water || 0) + vol;
    if (!data.waterLog) data.waterLog = [];
    data.waterLog.push({
      type: def ? def.key : "water",
      name: def ? def.name : "白水",
      icon: def ? def.icon : "💧",
      vol: vol,
      ts: Date.now()
    });
    MelodiDB.setDayData("sleep", data);
    updateWaterUI();
  }

  function removeDrink(idx) {
    var data = MelodiDB.getDayData("sleep") || {};
    if (!data.waterLog || !data.waterLog[idx]) return;
    data.water -= data.waterLog[idx].vol;
    if (data.water < 0) data.water = 0;
    data.waterLog.splice(idx, 1);
    MelodiDB.setDayData("sleep", data);
    updateWaterUI();
  }

  function resetWater() {
    var data = MelodiDB.getDayData("sleep") || {};
    data.water = 0;
    data.waterLog = [];
    MelodiDB.setDayData("sleep", data);
    updateWaterUI();
    App.showReminder("饮水量已重置", "warning");
  }

  function renderWaterLogHtml(log) {
    if (!log || !log.length) {
      return '<div class="water-log-empty">还没有记录，点上面的饮品开始打卡 💧</div>';
    }
    var h = '<div class="water-log-list">';
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      h += '<div class="water-log-item"><span class="water-log-icon">' + e.icon + '</span>'
        + '<span class="water-log-name">' + e.name + '</span>'
        + '<span class="water-log-vol">+' + e.vol + 'ml</span>'
        + '<button class="water-log-rm" data-rm-drink="' + i + '" title="删除">✕</button></div>';
    }
    h += '</div>';
    var total = 0;
    for (var j = 0; j < log.length; j++) total += log[j].vol;
    h += '<div class="water-log-sum">已记录 ' + log.length + ' 次，合计 ' + (total / 1000).toFixed(2) + 'L</div>';
    return h;
  }

  function updateWaterUI() {
    var data = MelodiDB.getDayData("sleep") || {};
    var waterAmount = data.water || 0;
    var waterPct = Math.min(100, (waterAmount / settings.waterTarget) * 100);
    var fill = document.getElementById("waterFill");
    if (fill) {
      fill.style.width = waterPct + "%";
      fill.classList.toggle("complete", waterPct >= 100);
    }
    var label = document.getElementById("waterLabel");
    if (label) {
      label.innerHTML = "<span>" + (waterAmount / 1000).toFixed(2) + "L / " + (settings.waterTarget / 1000).toFixed(1) + "L</span><span>" + (waterPct >= 100 ? "已达标" : Math.round(waterPct) + "%") + "</span>";
    }
    var stat = document.getElementById("statWater");
    if (stat) {
      var v = stat.querySelector(".stat-value");
      if (v) v.textContent = (waterAmount / 1000).toFixed(1) + "L";
    }
    var logEl = document.getElementById("waterLog");
    if (logEl) {
      logEl.innerHTML = renderWaterLogHtml(data.waterLog);
    }
  }

  /* 单独添加一条食物到对应餐别（点击「添加」或输入框回车都触发） */
  function handleAddMeal(wrapper) {
    if (!wrapper) return;
    var mealKey = wrapper.dataset.meal;
    var text = wrapper.querySelector(".diet-input-text").value.trim();
    var photoInput = wrapper.querySelector(".diet-input-photo");

    if (!text && !(photoInput && photoInput.files[0])) {
      App.showReminder("请填写食物详情或拍照", "warning");
      return;
    }

    function addMeal(photoData) {
      var dietData = MelodiDB.getDayData("diet") || {};
      if (!dietData.meals) dietData.meals = {};
      // 兼容旧数据：若该餐别原为单个对象，先转成数组
      if (!Array.isArray(dietData.meals[mealKey])) {
        dietData.meals[mealKey] = mealItems(dietData.meals[mealKey]);
      }
      // 用食物库自动带出营养成分（蛋白/脂肪/碳水）
      var nutri = { calories: 0, protein: 0, fat: 0, carbs: 0 };
      if (typeof MelodiFood !== "undefined" && text) {
        var parsed = MelodiFood.parseText(text);
        if (parsed.items.length > 0) {
          nutri.protein = parsed.total.protein;
          nutri.fat = parsed.total.fat;
          nutri.carbs = parsed.total.carbs;
        }
      }
      dietData.meals[mealKey].push({
        text: text,
        calories: nutri.calories,
        protein: nutri.protein,
        fat: nutri.fat,
        carbs: nutri.carbs,
        photo: photoData || null,
      });
      MelodiDB.setDayData("diet", dietData);
      if (window.MelodiADHD) MelodiADHD.toast("已添加", "success");
      refreshDietSection();
    }

    if (photoInput && photoInput.files[0]) {
      compressImage(photoInput.files[0], 400, function (base64) {
        addMeal(base64);
      });
    } else {
      addMeal(null);
    }
  }

  /* === 饮食事件 === */
  function setupDietEvents() {
    // 每餐独立添加：按钮点击 + 输入框回车
    document.querySelectorAll(".diet-meal-input").forEach(function (wrapper) {
      var btn = wrapper.querySelector(".diet-add-btn");
      if (btn) btn.addEventListener("click", function () { handleAddMeal(wrapper); });
      var textInput = wrapper.querySelector(".diet-input-text");
      if (textInput) {
        textInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); handleAddMeal(wrapper); }
        });
      }
    });

    setupFoodRecognition();

    // 删除单条食物
    document.querySelectorAll(".diet-item-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mealKey = this.dataset.meal;
        var idx = parseInt(this.dataset.idx);
        var dietData = MelodiDB.getDayData("diet") || {};
        if (!dietData.meals) dietData.meals = {};
        var arr = mealItems(dietData.meals[mealKey]);
        if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);
        dietData.meals[mealKey] = arr;
        MelodiDB.setDayData("diet", dietData);
        refreshDietSection();
      });
    });

    // 行内编辑单条食物
    document.querySelectorAll(".diet-item-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mealKey = this.dataset.meal;
        var idx = parseInt(this.dataset.idx);
        var dietData = MelodiDB.getDayData("diet") || {};
        var arr = mealItems(dietData.meals ? dietData.meals[mealKey] : null);
        var it = arr[idx];
        if (!it) return;
        var row = document.querySelector('.diet-item[data-meal="' + mealKey + '"][data-idx="' + idx + '"]');
        if (!row) return;
        row.innerHTML =
          '<div class="diet-item-edit-form">' +
          '<input type="text" class="form-input diet-edit-text" value="' + escapeHtml(it.text || "") + '" style="margin-bottom:6px;">' +
          '<div class="flex gap-sm" style="align-items:flex-end;flex-wrap:wrap;">' +
          '<button class="btn btn-primary btn-sm diet-edit-save" data-meal="' + mealKey + '" data-idx="' + idx + '">保存</button>' +
          '<button class="btn btn-ghost btn-sm diet-edit-cancel">取消</button>' +
          "</div></div>";
        var saveBtn = row.querySelector(".diet-edit-save");
        var cancelBtn = row.querySelector(".diet-edit-cancel");
        saveBtn.addEventListener("click", function () {
          var newText = row.querySelector(".diet-edit-text").value.trim();
          var nutri = { calories: 0, protein: it.protein || 0, fat: it.fat || 0, carbs: it.carbs || 0 };
          if (typeof MelodiFood !== "undefined" && newText) {
            var parsed = MelodiFood.parseText(newText);
            if (parsed.items.length > 0) {
              nutri.protein = parsed.total.protein;
              nutri.fat = parsed.total.fat;
              nutri.carbs = parsed.total.carbs;
            }
          }
          arr[idx] = {
            text: newText,
            calories: nutri.calories,
            protein: nutri.protein,
            fat: nutri.fat,
            carbs: nutri.carbs,
            photo: it.photo || null,
          };
          var d2 = MelodiDB.getDayData("diet") || {};
          if (!d2.meals) d2.meals = {};
          d2.meals[mealKey] = arr;
          MelodiDB.setDayData("diet", d2);
          refreshDietSection();
        });
        cancelBtn.addEventListener("click", function () { refreshDietSection(); });
      });
    });
  }

  /* === 原地刷新饮食卡片（避免整页重渲染跳顶）=== */
  function refreshDietSection() {
    var box = document.getElementById("dietSection");
    if (!box) { App.renderPage("dashboard"); return; }
    box.innerHTML = renderDietSection();
    setupDietEvents();
  }

  /* === 食物识别：输入联想 + 拍照估算 === */
  function setupFoodRecognition() {
    if (typeof MelodiFood === "undefined") return;

    // 输入时实时联想食物（仅用于快速填入名称，不再估算热量）
    document.querySelectorAll(".diet-input-text").forEach(function (input) {
      var wrapper = input.closest(".diet-meal-input");
      if (!wrapper) return;
      var box = wrapper.querySelector(".food-suggest");

      input.addEventListener("input", function () {
        var val = input.value.trim();
        // 只对最后一个词做联想，方便连续输入多样食物
        var lastWord = val.split(/[,，、\s\+和]+/).pop();
        if (!box) return;
        if (!lastWord) { box.innerHTML = ""; return; }

        var hits = MelodiFood.match(lastWord);
        if (hits.length === 0) { box.innerHTML = ""; }
        else {
          box.innerHTML = hits.slice(0, 6).map(function (f) {
            return '<span class="food-chip" data-food="' + escapeHtml(f.n) + '">' +
              escapeHtml(f.n) + "</span>";
          }).join("");
          box.querySelectorAll(".food-chip").forEach(function (chip) {
            chip.addEventListener("click", function () {
              var name = chip.getAttribute("data-food");
              var parts = input.value.split(/([,，、\s\+和]+)/);
              parts[parts.length - 1] = name;
              input.value = parts.join("");
              box.innerHTML = "";
              input.focus();
            });
          });
        }
      });
    });

    // 拍照识别
    document.querySelectorAll(".diet-input-photo").forEach(function (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files[0];
        if (!file) return;
        var wrapper = fileInput.closest(".diet-meal-input");
        if (!wrapper) return;
        var result = wrapper.querySelector(".food-vision-result");
        var textInput = wrapper.querySelector(".diet-input-text");

        if (result) result.innerHTML = '<div class="vision-loading">正在识别照片里的食物…</div>';

        compressImage(file, 500, function (base64) {
          MelodiFood.analyzePhoto(base64, function (err, res) {
            if (!result) return;
            if (!res) { result.innerHTML = '<div class="vision-note">识别失败，手动填写即可</div>'; return; }

            if (res.source === "ai" && res.items.length > 0) {
              // AI 真识别成功，直接回填名称
              var names = res.items.map(function (i) { return i.name + i.grams + "g"; }).join("、");
              if (textInput && !textInput.value.trim()) textInput.value = names;
              result.innerHTML = '<div class="vision-est">AI 识别：' +
                "　蛋白 " + res.total.protein + "g　碳水 " + res.total.carbs + "g　脂肪 " + res.total.fat + "g" +
                '<span class="vision-note">（' + names + "，可手动改）</span></div>";
            } else {
              // 本地估算：给出候选，点一下就填
              var h = '<div class="vision-note">' + (res.hint || "从下面挑出最接近的食物") + "</div>";
              h += '<div class="food-suggest">';
              h += res.candidates.map(function (f) {
                return '<span class="food-chip" data-food="' + escapeHtml(f.n) + '">' +
                  escapeHtml(f.n) + "</span>";
              }).join("");
              h += "</div>";
              result.innerHTML = h;
              result.querySelectorAll(".food-chip").forEach(function (chip) {
                chip.addEventListener("click", function () {
                  var name = chip.getAttribute("data-food");
                  if (textInput) {
                    textInput.value = textInput.value.trim()
                      ? textInput.value.trim() + " " + name : name;
                  }
                  if (window.MelodiADHD) MelodiADHD.play("tick");
                });
              });
            }
          });
        });
      });
    });
  }

  /* 每日交接：把非今天的任务归档到 taskArchive（按日期分桶），保持今日列表干净（每日更新） */
  function archiveYesterdayTasks() {
    var todayKey = MelodiDB.todayKey();
    var lastArchive = MelodiDB.get("taskArchiveDate", null);
    if (lastArchive === todayKey) return; // 今天已归档过
    var all = MelodiDB.getList("tasks");
    if (all.length === 0) { MelodiDB.set("taskArchiveDate", todayKey); return; }
    var archive = MelodiDB.get("taskArchive", {});
    var moved = false;
    all.forEach(function (t) {
      var d = t.date || todayKey;
      if (d !== todayKey) {
        if (!archive[d]) archive[d] = [];
        archive[d].push(t);
        moved = true;
      }
    });
    if (moved) MelodiDB.set("taskArchive", archive);
    // 今日列表只保留今天的任务
    var active = all.filter(function (t) { return (t.date || todayKey) === todayKey; });
    MelodiDB.set("list:tasks", active);
    MelodiDB.set("taskArchiveDate", todayKey);
  }

  /* === 任务事件 === */
  /* 任务管理事件绑定（被人生规划「每日」面板复用，故抽出来） */
  function bindTaskManager() {
    var addBtn = document.getElementById("addTaskBtn");
    var taskInput = document.getElementById("taskInput");
    if (addBtn && taskInput) {
      var addTask = function () {
        var text = taskInput.value.trim();
        if (!text) return;
        var qEl = document.querySelector("#quadSelect .quad-pick.active");
        var quad = qEl ? qEl.dataset.q : "q1";
        // 新任务排到当前列表最前，order 越小越靠前
        var minOrder = 0;
        MelodiDB.getList("tasks").forEach(function (t) {
          if (typeof t.order === "number" && t.order < minOrder) minOrder = t.order;
        });
        MelodiDB.addToList("tasks", {
          text: text,
          quadrant: quad,
          status: "todo",
          order: minOrder - 1,
          done: false,
          date: MelodiDB.todayKey(),
        });
        taskInput.value = "";
        MelodiDB.clearDraft("taskInput");
        refreshQuadrant(quad);
      };
      addBtn.addEventListener("click", addTask);
      taskInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addTask(); });
      // 输入草稿自动留存，切页刷新都不丢
      var draft = MelodiDB.getDraft("taskInput", "");
      if (draft && !taskInput.value) taskInput.value = draft;
      MelodiDB.registerDraft("taskInput", function () { return taskInput.value; });
      taskInput.addEventListener("input", function () { MelodiDB.saveDraft("taskInput", taskInput.value); });
    }

    document.querySelectorAll("#quadSelect .quad-pick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("#quadSelect .quad-pick").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
      });
    });

    renderQuadrants();
    renderTaskHistory();
  }

  var QUAD_LABEL = { q1: "重要紧急", q2: "重要不紧急", q3: "紧急不重要", q4: "不重要不紧急" };

  /* 排序：进行中优先 → 手动拖拽顺序 */
  function sortTasks(list) {
    list.sort(function (a, b) {
      var da = a.status === "doing" ? 0 : 1;
      var db = b.status === "doing" ? 0 : 1;
      if (da !== db) return da - db;
      var oa = typeof a.order === "number" ? a.order : 0;
      var ob = typeof b.order === "number" ? b.order : 0;
      return oa - ob;
    });
    return list;
  }

  /* 只重绘某一个象限（受影响的那一格），不碰其它格 */
  function refreshQuadrant(q) {
    var c = document.getElementById("quad-" + q);
    if (!c) return;
    var todayKey = MelodiDB.todayKey();
    var list = MelodiDB.getList("tasks").filter(function (t) {
      return (!t.date || t.date === todayKey) && !t.done && (t.quadrant || "q2") === q;
    });
    sortTasks(list);
    if (list.length === 0) {
      c.innerHTML = '<div class="quad-empty">—</div>';
    } else {
      c.innerHTML = list.map(renderTaskItem).join("");
    }
    bindTaskEvents(c);
    bindTaskDrag(c);
  }

  /* 按四象限分区渲染今日未完成任务（初始渲染用，逐格刷新） */
  function renderQuadrants() {
    ["q1", "q2", "q3", "q4"].forEach(refreshQuadrant);
  }

  /* 单个任务卡片（按象限简化：去掉能量/优先级/预计时长显示） */
  function renderTaskItem(t) {
    var doing = t.status === "doing";
    var h = '<div class="task-item' + (doing ? " doing" : "") + '" data-id="' + t.id + '" draggable="true">';
    h += '<span class="task-drag" title="拖动排序">⠿</span>';
    h += '<div class="task-checkbox" data-id="' + t.id + '"></div>';
    h += '<div class="task-main">';
    h += '<span class="task-text">' + escapeHtml(t.text) + "</span>";
    h += '<div class="task-meta">';
    if (doing) h += '<span class="status-badge doing">进行中</span>';
    h += "</div></div>";
    h += '<div class="task-ops">';
    h += '<button class="task-op" data-toggle="' + t.id + '" title="' + (doing ? "标记为待办" : "标记为进行中") + '">' + (doing ? "⏸" : "▶") + "</button>";
    h += '<button class="task-op task-delete" data-id="' + t.id + '" title="删除">×</button>';
    h += "</div></div>";
    return h;
  }

  function bindTaskEvents(container) {
    // 完成任务：即时反馈 + 撒花奖励，只移除这一条（不重绘整格）
    container.querySelectorAll(".task-checkbox").forEach(function (cb) {
      cb.addEventListener("click", function () {
        var id = this.dataset.id;
        var item = this.closest(".task-item");
        var task = MelodiDB.getList("tasks").filter(function (t) { return t.id === id; })[0];
        var q = task ? (task.quadrant || "q2") : null;
        MelodiDB.updateInList("tasks", id, {
          done: true, status: "done", completedAt: new Date().toISOString(),
        });
        if (window.MelodiADHD) {
          MelodiADHD.stopCountdown("task_" + id);
          if (item) item.classList.add("pop-done");
          MelodiADHD.celebrate(null, item || this);
        }
        setTimeout(function () {
          // 只动这一条：从 DOM 移除，并在整格清空时补占位符
          if (item && item.parentNode) item.remove();
          var c = q ? document.getElementById("quad-" + q) : null;
          if (c && c.querySelectorAll(".task-item").length === 0) {
            c.innerHTML = '<div class="quad-empty">—</div>';
          }
          renderTaskHistory();
        }, 400);
      });
    });

    // 三态切换：待办 ⇄ 进行中，只更新这一条
    container.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.getAttribute("data-toggle");
        var task = MelodiDB.getList("tasks").filter(function (t) { return t.id === id; })[0];
        if (!task) return;
        var next = task.status === "doing" ? "todo" : "doing";
        MelodiDB.updateInList("tasks", id, { status: next });
        if (next === "doing" && window.MelodiADHD) MelodiADHD.play("tick");
        // 原地刷新这一条：状态样式、按钮图标、徽标
        var item = this.closest(".task-item");
        if (item) {
          item.classList.toggle("doing", next === "doing");
          this.textContent = next === "doing" ? "⏸" : "▶";
          this.title = next === "doing" ? "标记为待办" : "标记为进行中";
          var meta = item.querySelector(".task-meta");
          if (meta) {
            var badge = meta.querySelector(".status-badge");
            if (next === "doing" && !badge) {
              var b = document.createElement("span");
              b.className = "status-badge doing";
              b.textContent = "进行中";
              meta.appendChild(b);
            } else if (next === "todo" && badge) {
              badge.remove();
            }
          }
        }
      });
    });

    // 任务倒计时：按预计时长在角落跑
    container.querySelectorAll("[data-timer]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.getAttribute("data-timer");
        var task = MelodiDB.getList("tasks").filter(function (t) { return t.id === id; })[0];
        if (!task || !window.MelodiADHD) return;
        MelodiDB.updateInList("tasks", id, { status: "doing" });
        MelodiADHD.startCountdown("task_" + id, task.text, task.estMin || 25, function () {
          MelodiADHD.toast("「" + task.text + "」预计时间到，收个尾吧", "warning");
        });
        MelodiADHD.toast("倒计时开始：" + (task.estMin || 25) + " 分钟", "info");
        refreshQuadrant(task.quadrant || "q2");
      });
    });

    container.querySelectorAll(".task-delete").forEach(function (del) {
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = this.dataset.id;
        var item = this.closest(".task-item");
        if (window.MelodiADHD) MelodiADHD.stopCountdown("task_" + id);
        MelodiDB.removeFromList("tasks", id);
        // 只移这一条，整格清空时补占位符
        var parent = item ? item.parentNode : null;
        if (item) item.remove();
        if (parent && parent.classList.contains("quadrant-tasks") && parent.querySelectorAll(".task-item").length === 0) {
          parent.innerHTML = '<div class="quad-empty">—</div>';
        }
        renderTaskHistory();
      });
    });
  }

  /* ===== 拖拽排序 ===== */
  function bindTaskDrag(container) {
    var dragging = null;

    container.querySelectorAll(".task-item").forEach(function (item) {
      item.addEventListener("dragstart", function (e) {
        dragging = item;
        item.classList.add("dragging");
        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.dataset.id); } catch (err) { }
      });

      item.addEventListener("dragend", function () {
        item.classList.remove("dragging");
        container.querySelectorAll(".task-item").forEach(function (i) { i.classList.remove("drag-over"); });
        dragging = null;
        persistOrder(container);
        // 只重绘拖拽所在的那一格
        refreshQuadrant(container.id.replace("quad-", ""));
      });

      item.addEventListener("dragover", function (e) {
        e.preventDefault();
        if (!dragging || dragging === item) return;
        var rect = item.getBoundingClientRect();
        var after = (e.clientY - rect.top) > rect.height / 2;
        item.classList.add("drag-over");
        if (after) {
          if (item.nextSibling !== dragging) container.insertBefore(dragging, item.nextSibling);
        } else {
          if (item.previousSibling !== dragging) container.insertBefore(dragging, item);
        }
      });

      item.addEventListener("dragleave", function () { item.classList.remove("drag-over"); });
      item.addEventListener("drop", function (e) { e.preventDefault(); });
    });
  }

  /* 把当前 DOM 顺序写回存储 */
  function persistOrder(container) {
    var ids = [];
    container.querySelectorAll(".task-item").forEach(function (i) { ids.push(i.dataset.id); });
    ids.forEach(function (id, idx) {
      MelodiDB.updateInList("tasks", id, { order: idx });
    });
  }

  function renderTaskHistory() {
    var container = document.getElementById("taskHistory");
    if (!container) return;
    var todayKey = MelodiDB.todayKey();
    var allTasks = MelodiDB.getList("tasks");
    var doneToday = allTasks.filter(function (t) { return t.done && (!t.date || t.date === todayKey); });

    // 归档里的往日任务（含未完成，按日期分组展示）
    var archive = MelodiDB.get("taskArchive", {});
    var archiveDates = Object.keys(archive).sort().reverse().slice(0, 14);

    var html = "";
    if (doneToday.length > 0) {
      html += '<div class="history-header open" id="todayHistoryHeader"><span class="history-arrow">&#9658;</span> 今日已完成 (' + doneToday.length + ")</div>";
      html += '<div class="history-content open" id="todayHistoryContent">';
      html += doneToday.map(function (t) { return renderDoneHistoryItem(t, false); }).join("");
      html += "</div>";
    }
    if (archiveDates.length > 0) {
      html += '<div class="history-header" id="archiveHistoryHeader"><span class="history-arrow">&#9658;</span> 往日归档 (' + archiveDates.length + " 天)</div>";
      html += '<div class="history-content" id="archiveHistoryContent">';
      archiveDates.forEach(function (d) {
        var items = archive[d] || [];
        html += '<div class="archive-day-label">' + escapeHtml(d) + "</div>";
        html += items.map(function (t) { return renderDoneHistoryItem(t, true); }).join("");
      });
      html += "</div>";
    }
    if (doneToday.length === 0 && archiveDates.length === 0) {
      container.innerHTML = "";
      return;
    }
    html = '<div style="margin-bottom:8px;"><button class="btn btn-ghost btn-sm" id="toggleHistoryBtn">收起已完成项</button></div>' + html;
    container.innerHTML = html;

    ["todayHistoryHeader", "archiveHistoryHeader"].forEach(function (id) {
      var header = document.getElementById(id);
      if (header) {
        header.addEventListener("click", function () {
          this.classList.toggle("open");
          var content = this.nextElementSibling;
          if (content) content.classList.toggle("open");
        });
      }
    });

    var toggleBtn = document.getElementById("toggleHistoryBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        var collapsed = container.classList.toggle("history-collapsed");
        this.textContent = collapsed ? "展开已完成项" : "收起已完成项";
      });
    }
  }

  /* 历史/归档里的单条任务：完成划线，未完成的归档项正常显示 */
  function renderDoneHistoryItem(t, isArchive) {
    var done = !!t.done;
    var cls = "task-item" + (done ? " done" : "");
    var cb = done
      ? '<div class="task-checkbox checked"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5l-1.4 1.4l4.9 4.9l11-11l-1.4-1.4z" fill="white"/></svg></div>'
      : '<div class="task-checkbox"></div>';
    var dateTag = (isArchive && t.date) ? '<span class="text-muted" style="font-size:var(--font-size-xs);">' + escapeHtml(t.date) + "</span>" : "";
    return '<div class="' + cls + '">' + cb + '<span class="task-text">' + escapeHtml(t.text) + "</span>" + dateTag + "</div>";
  }

  /* ===== 图表渲染 ===== */
  function renderCharts() {
    // 睡眠月度曲线
    var monthData = MelodiDB.getMonthData("sleep");
    var monthLabels = MelodiCharts.getMonthDayLabels();
    var now = new Date();
    var currentDay = now.getDate();
    var sleepLabels = monthLabels.slice(0, currentDay);
    var sleepData = sleepLabels.map(function (_, i) {
      var day = i + 1;
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var d = monthData[dateKey];
      return d && d.duration ? parseFloat(d.duration.toFixed(1)) : null;
    });
    var napData = sleepLabels.map(function (_, i) {
      var day = i + 1;
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var d = monthData[dateKey];
      return d && d.napDuration ? parseFloat(d.napDuration.toFixed(1)) : null;
    });

    MelodiCharts.lineChart("sleepChart", sleepLabels, [
      {
        label: "睡眠时长",
        data: sleepData,
        color: MelodiCharts.colors.primary,
        fillColor: MelodiCharts.colors.primaryBg,
      },
      {
        label: "午觉时长",
        data: napData,
        color: MelodiCharts.colors.orange,
        fillColor: "rgba(0,0,0,0)",
        fill: false,
      },
      {
        label: "目标 7.5h",
        data: sleepLabels.map(function () { return 7.5; }),
        color: MelodiCharts.colors.green,
        fillColor: "rgba(0,0,0,0)",
        fill: false,
        borderWidth: 1,
        borderDash: [5, 5],
      },
    ]);

    // 饮水
    var sleepMonthData = MelodiDB.getMonthData("sleep");
    var waterData = sleepLabels.map(function (_, i) {
      var day = i + 1;
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var s = sleepMonthData[dateKey];
      return s && s.water ? parseFloat((s.water / 1000).toFixed(2)) : 0;
    });

    MelodiCharts.barChart("dietChart", sleepLabels, [
      { label: "饮水 (L)", data: waterData, color: MelodiCharts.colors.blue },
    ]);
  }

  /* ===== 工具函数 ===== */
  function energyLabel(e) {
    return e === "high" ? "高" : e === "low" ? "低" : "中";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function compressImage(file, maxSize, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        var width = img.width;
        var height = img.height;
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  return { render: render, archiveYesterdayTasks: archiveYesterdayTasks, renderTaskManager: renderTaskSection, bindTaskManager: bindTaskManager };
})();
