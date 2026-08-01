/* ============================================
   美乐蒂工作台 - 日常管理模块
   睡眠作息 · 饮食健康 · 饮水 · 今日任务 · 可视化
   ============================================ */

const DailyModule = (function () {
  var settings = null;
  var today = "";

  // 饮品类型（参考《日常养成方案》每日饮品清单；仅作选择，份量自定义）
  var DRINK_TYPES = [
    { key: "water", name: "温水", icon: "💧" },
    { key: "soymilk", name: "豆浆", icon: "🥛" },
    { key: "oolong", name: "荔枝乌龙", icon: "🍵" },
    { key: "jasmine", name: "茉莉绿茶", icon: "🌿" },
    { key: "oatmilk", name: "乌龙燕麦奶", icon: "🥤" },
    { key: "coffee", name: "黑咖啡", icon: "☕" },
    { key: "lemonoil", name: "橄榄油柠檬", icon: "🍋" }
  ];
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
    html += statCard(sleepData.duration ? sleepData.duration.toFixed(1) + "h" : "--", "睡眠");
    html += statCard(totalStudyMin + "min", "学习时长");
    html += "</div>";

    // 睡眠作息
    html += renderSleepSection(sleepData);

    // 快速打卡
    html += renderQuickCheckin();

    // 饮水进度
    var waterLogHtml = renderWaterLogHtml(sleepData.waterLog);
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">饮水量</div>';
    html += '<div class="flex gap-sm">';
    html += '<button class="btn btn-secondary btn-sm" data-water="500">+500ml</button>';
    html += '<button class="btn btn-secondary btn-sm" data-water="1000">+1L</button>';
    html += '<button class="btn btn-ghost btn-sm" data-water="reset">重置</button>';
    html += "</div></div>";
    html += '<div class="water-chips-label">选择饮品（先点选，再填份量记录）</div>';
    html += '<div class="water-chips" id="drinkChips">';
    DRINK_TYPES.forEach(function (d) {
      html += '<button class="drink-chip" data-drink="' + d.key + '" type="button"><span class="dc-icon">' + d.icon + '</span><span class="dc-name">' + d.name + '</span></button>';
    });
    html += '</div>';
    html += '<div class="water-add-row">';
    html += '<input class="water-vol-input" id="drinkVol" type="number" min="1" step="50" inputmode="numeric" placeholder="份量(ml)" />';
    html += '<button class="btn btn-primary btn-sm" id="drinkRecord">记录</button>';
    html += '</div>';
    html += '<div class="progress-bar"><div class="progress-fill' + (waterPct >= 100 ? " complete" : "") + '" id="waterFill" style="width:' + waterPct + '%"></div></div>';
    html += '<div class="progress-label" id="waterLabel"><span>' + (waterAmount / 1000).toFixed(2) + "L / " + (settings.waterTarget / 1000).toFixed(1) + "L</span><span>" + (waterPct >= 100 ? "已达标" : Math.round(waterPct) + "%") + "</span></div>";
    html += '<div id="waterLog" class="water-log">' + waterLogHtml + '</div>';
    html += '<div class="water-tip">💡 每天 ≥2000ml，茶咖为辅；睡前 1.5 小时少喝，避免起夜</div>';
    html += "</div>";

    // 饮食记录
    html += renderDietSection();

    // 今日任务
    html += renderTaskSection();

    // 月度图表
    html += renderMonthlyCharts();

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
      { key: "perfume", label: "香水", icon: "\uD83C\uDFAD", module: "leisure" },
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
  function renderDietSection() {
    var dietData = MelodiDB.getDayData("diet") || {};
    var meals = dietData.meals || {};
    var mealTypes = [
      { key: "breakfast", label: "早餐", icon: "\uD83C\uDF5E", color: "var(--melodi-pink-400)" },
      { key: "lunch", label: "午餐", icon: "\uD83C\uDF5D", color: "var(--color-warning)" },
      { key: "dinner", label: "晚餐", icon: "\uD83C\uDF63", color: "var(--color-success)" },
      { key: "snack", label: "零食", icon: "\uD83C\uDF6B", color: "var(--color-info)" },
    ];

    var html = '<div class="card">';
    html += '<div class="card-header"><div class="card-title">饮食记录</div>';
    var totalCal = 0;
    mealTypes.forEach(function (m) {
      var meal = meals[m.key];
      if (meal && meal.calories) totalCal += parseInt(meal.calories) || 0;
    });
    html += '<span style="font-size:var(--font-size-xs);color:var(--text-tertiary);">今日热量 ' + totalCal + ' kcal</span></div>';

    mealTypes.forEach(function (m) {
      var meal = meals[m.key] || {};
      html += '<div class="diet-meal-item">';
      html += '<div class="diet-meal-header">';
      html += '<span class="diet-meal-icon">' + m.icon + "</span>";
      html += '<span class="diet-meal-label">' + m.label + "</span>";
      if (meal.text) {
        html += '<span class="diet-meal-cal">' + (meal.calories || 0) + " kcal</span>";
      }
      html += "</div>";
      if (meal.text) {
        html += '<div class="diet-meal-text">' + escapeHtml(meal.text) + "</div>";
        if (meal.protein || meal.carbs || meal.fat) {
          html += '<div class="nutri-row">';
          html += '<span class="nutri-tag p">蛋白 ' + (meal.protein || 0) + "g</span>";
          html += '<span class="nutri-tag c">碳水 ' + (meal.carbs || 0) + "g</span>";
          html += '<span class="nutri-tag f">脂肪 ' + (meal.fat || 0) + "g</span>";
          html += "</div>";
        }
        if (meal.photo) {
          html += '<img src="' + meal.photo + '" class="diet-meal-photo" alt="食物照片">';
        }
        html += '<button class="btn btn-ghost btn-sm diet-meal-edit" data-meal="' + m.key + '">编辑</button>';
      } else {
        html += '<div class="diet-meal-input" data-meal="' + m.key + '">';
        html += '<input type="text" class="form-input diet-input-text" placeholder="输入食物名，热量自动算，比如：米饭一碗 番茄炒蛋" style="margin-bottom:6px;">';
        html += '<div class="food-suggest" data-meal="' + m.key + '"></div>';
        html += '<div class="flex gap-sm" style="align-items:flex-end;flex-wrap:wrap;">';
        html += '<input type="number" class="form-input diet-input-cal" placeholder="热量" style="width:78px;">';
        html += '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">拍照识别';
        html += '<input type="file" accept="image/*" capture="environment" class="diet-input-photo" style="display:none;">';
        html += "</label>";
        html += '<button class="btn btn-primary btn-sm diet-save-btn">保存</button>';
        html += "</div>";
        html += '<div class="food-vision-result" data-meal="' + m.key + '"></div>';
        html += "</div>";
      }
      html += "</div>";
    });

    // 今日营养成分汇总
    if (typeof MelodiFood !== "undefined") {
      var nutri = MelodiFood.getDayNutrition();
      if (nutri.calories > 0) {
        html += '<div class="nutri-summary">';
        html += '<div class="nutri-sum-item"><b>' + nutri.calories + "</b><span>总热量 kcal</span></div>";
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

    // 饮水 + 热量
    html += '<div class="chart-title">饮水量 (L) 与热量 (kcal)</div>';
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
    setupTaskEvents();
    renderCharts();
  }

  /* === 睡眠事件 === */
  function setupSleepEvents() {
    var bedtimeEl = document.getElementById("sleepBedtime");
    var waketimeEl = document.getElementById("sleepWaketime");
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

    if (bedtimeEl) bedtimeEl.addEventListener("change", updateSleepDuration);
    if (waketimeEl) waketimeEl.addEventListener("change", updateSleepDuration);

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var duration = calcDuration();
        var data = MelodiDB.getDayData("sleep") || {};
        data.bedtime = bedtimeEl.value;
        data.waketime = waketimeEl.value;
        data.duration = duration;
        data.water = data.water || 0;
        MelodiDB.setDayData("sleep", data);
        App.showReminder(duration >= (settings.sleepTarget || 7.5) ? "睡眠达标！" : "已记录，注意早睡", "success");
        App.renderPage("dashboard");
      });
    }
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
    // 饮品先点选（不自动记录，仅选中高亮）
    document.querySelectorAll("[data-drink]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedDrinkKey = this.dataset.drink;
        document.querySelectorAll("[data-drink]").forEach(function (b) {
          b.classList.toggle("selected", b === btn);
        });
        var input = document.getElementById("drinkVol");
        if (input && !input.value) input.focus();
      });
    });
    // 记录选中饮品 + 自定义份量
    var recBtn = document.getElementById("drinkRecord");
    if (recBtn) recBtn.addEventListener("click", recordDrinkCustom);
    var volInput = document.getElementById("drinkVol");
    if (volInput) {
      volInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") recordDrinkCustom();
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
      for (var i = 0; i < DRINK_TYPES.length; i++) {
        if (DRINK_TYPES[i].key === selectedDrinkKey) { def = DRINK_TYPES[i]; break; }
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

  /* === 饮食事件 === */
  function setupDietEvents() {
    // 保存按钮
    document.querySelectorAll(".diet-save-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wrapper = this.closest(".diet-meal-input");
        if (!wrapper) return;
        var mealKey = wrapper.dataset.meal;
        var text = wrapper.querySelector(".diet-input-text").value.trim();
        var cal = wrapper.querySelector(".diet-input-cal").value;
        var photoInput = wrapper.querySelector(".diet-input-photo");

        if (!text && !photoInput.files[0]) {
          App.showReminder("请填写食物详情或拍照", "warning");
          return;
        }

        function saveMeal(photoData) {
          var dietData = MelodiDB.getDayData("diet") || {};
          if (!dietData.meals) dietData.meals = {};
          // 没手填热量就用食物库自动估算，顺带带出营养成分
          var nutri = { calories: parseInt(cal) || 0, protein: 0, fat: 0, carbs: 0 };
          if (typeof MelodiFood !== "undefined" && text) {
            var parsed = MelodiFood.parseText(text);
            if (parsed.items.length > 0) {
              if (!cal) nutri.calories = parsed.total.calories;
              nutri.protein = parsed.total.protein;
              nutri.fat = parsed.total.fat;
              nutri.carbs = parsed.total.carbs;
            }
          }
          dietData.meals[mealKey] = {
            text: text,
            calories: nutri.calories,
            protein: nutri.protein,
            fat: nutri.fat,
            carbs: nutri.carbs,
            photo: photoData || null,
          };
          MelodiDB.setDayData("diet", dietData);
          if (window.MelodiADHD) MelodiADHD.toast("已记录 " + nutri.calories + " kcal", "success");
          App.renderPage("dashboard");
        }

        if (photoInput.files[0]) {
          compressImage(photoInput.files[0], 400, function (base64) {
            saveMeal(base64);
          });
        } else {
          saveMeal(null);
        }
      });
    });

    setupFoodRecognition();

    // 编辑按钮（重新填写这一餐）
    document.querySelectorAll(".diet-meal-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mealKey = this.dataset.meal;
        var dietData = MelodiDB.getDayData("diet") || {};
        if (dietData.meals) delete dietData.meals[mealKey];
        MelodiDB.setDayData("diet", dietData);
        App.renderPage("dashboard");
      });
    });
  }

  /* === 食物识别：输入联想 + 拍照估算 === */
  function setupFoodRecognition() {
    if (typeof MelodiFood === "undefined") return;

    // 输入时实时联想食物，点一下自动填热量
    document.querySelectorAll(".diet-input-text").forEach(function (input) {
      var wrapper = input.closest(".diet-meal-input");
      if (!wrapper) return;
      var box = wrapper.querySelector(".food-suggest");
      var calInput = wrapper.querySelector(".diet-input-cal");

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
              escapeHtml(f.n) + ' <i>' + Math.round(f.c * f.u / 100) + "kcal</i></span>";
          }).join("");
          box.querySelectorAll(".food-chip").forEach(function (chip) {
            chip.addEventListener("click", function () {
              var name = chip.getAttribute("data-food");
              var parts = input.value.split(/([,，、\s\+和]+)/);
              parts[parts.length - 1] = name;
              input.value = parts.join("");
              box.innerHTML = "";
              updateEstimate();
              input.focus();
            });
          });
        }
        updateEstimate();
      });

      // 实时把整句解析成热量填进去
      function updateEstimate() {
        var parsed = MelodiFood.parseText(input.value);
        var result = wrapper.querySelector(".food-vision-result");
        if (parsed.items.length > 0) {
          if (calInput) calInput.value = parsed.total.calories;
          if (result) {
            result.innerHTML = '<div class="vision-est">估算 <b>' + parsed.total.calories + " kcal</b>" +
              "　蛋白 " + parsed.total.protein + "g　碳水 " + parsed.total.carbs + "g　脂肪 " + parsed.total.fat + "g" +
              '<span class="vision-note">（识别到：' + parsed.items.map(function (i) { return i.name + i.grams + "g"; }).join("、") + "，可手动改）</span></div>";
          }
        } else if (result) {
          result.innerHTML = "";
        }
      }
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
        var calInput = wrapper.querySelector(".diet-input-cal");

        if (result) result.innerHTML = '<div class="vision-loading">正在识别照片里的食物…</div>';

        compressImage(file, 500, function (base64) {
          MelodiFood.analyzePhoto(base64, function (err, res) {
            if (!result) return;
            if (!res) { result.innerHTML = '<div class="vision-note">识别失败，手动填写即可</div>'; return; }

            if (res.source === "ai" && res.items.length > 0) {
              // AI 真识别成功，直接回填
              var names = res.items.map(function (i) { return i.name + i.grams + "g"; }).join("、");
              if (textInput && !textInput.value.trim()) textInput.value = names;
              if (calInput) calInput.value = res.total.calories;
              result.innerHTML = '<div class="vision-est">AI 识别：<b>' + res.total.calories + " kcal</b>" +
                "　蛋白 " + res.total.protein + "g　碳水 " + res.total.carbs + "g　脂肪 " + res.total.fat + "g" +
                '<span class="vision-note">（' + names + "，可手动改）</span></div>";
            } else {
              // 本地估算：给出候选，点一下就填
              var h = '<div class="vision-note">' + (res.hint || "从下面挑出最接近的食物") + "</div>";
              h += '<div class="food-suggest">';
              h += res.candidates.map(function (f) {
                return '<span class="food-chip" data-food="' + escapeHtml(f.n) + '">' +
                  escapeHtml(f.n) + ' <i>' + Math.round(f.c * f.u / 100) + "kcal</i></span>";
              }).join("");
              h += "</div>";
              result.innerHTML = h;
              result.querySelectorAll(".food-chip").forEach(function (chip) {
                chip.addEventListener("click", function () {
                  var name = chip.getAttribute("data-food");
                  if (textInput) {
                    textInput.value = textInput.value.trim()
                      ? textInput.value.trim() + " " + name : name;
                    var parsed = MelodiFood.parseText(textInput.value);
                    if (calInput) calInput.value = parsed.total.calories;
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

  /* === 任务事件 === */
  function setupTaskEvents() {
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
        renderQuadrants();
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

  /* 按四象限分区渲染今日未完成任务 */
  function renderQuadrants() {
    var grid = document.getElementById("quadrantGrid");
    if (!grid) return;
    var todayKey = MelodiDB.todayKey();
    var tasks = MelodiDB.getList("tasks").filter(function (t) {
      return (!t.date || t.date === todayKey) && !t.done;
    });
    var groups = { q1: [], q2: [], q3: [], q4: [] };
    tasks.forEach(function (t) {
      var q = t.quadrant || "q2";
      if (!groups[q]) q = "q2";
      groups[q].push(t);
    });
    ["q1", "q2", "q3", "q4"].forEach(function (q) {
      var list = groups[q];
      // 排序：进行中优先 → 手动拖拽顺序
      list.sort(function (a, b) {
        var da = a.status === "doing" ? 0 : 1;
        var db = b.status === "doing" ? 0 : 1;
        if (da !== db) return da - db;
        var oa = typeof a.order === "number" ? a.order : 0;
        var ob = typeof b.order === "number" ? b.order : 0;
        return oa - ob;
      });
      var c = document.getElementById("quad-" + q);
      if (!c) return;
      if (list.length === 0) {
        c.innerHTML = '<div class="quad-empty">—</div>';
      } else {
        c.innerHTML = list.map(renderTaskItem).join("");
      }
      bindTaskEvents(c);
      bindTaskDrag(c);
    });
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
    h += '<button class="btn-quickstart" data-quick="' + t.id + '">先做5分钟</button>';
    h += '<button class="task-op" data-toggle="' + t.id + '" title="' + (doing ? "标记为待办" : "标记为进行中") + '">' + (doing ? "⏸" : "▶") + "</button>";
    h += '<button class="task-op task-delete" data-id="' + t.id + '" title="删除">×</button>';
    h += "</div></div>";
    return h;
  }

  function bindTaskEvents(container) {
    // 完成任务：即时反馈 + 撒花奖励
    container.querySelectorAll(".task-checkbox").forEach(function (cb) {
      cb.addEventListener("click", function () {
        var id = this.dataset.id;
        var item = this.closest(".task-item");
        MelodiDB.updateInList("tasks", id, {
          done: true, status: "done", completedAt: new Date().toISOString(),
        });
        if (window.MelodiADHD) {
          MelodiADHD.stopCountdown("task_" + id);
          if (item) item.classList.add("pop-done");
          MelodiADHD.celebrate(null, item || this);
        }
        setTimeout(function () {
          renderQuadrants();
          renderTaskHistory();
        }, 400);
      });
    });

    // 三态切换：待办 ⇄ 进行中
    container.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.getAttribute("data-toggle");
        var task = MelodiDB.getList("tasks").filter(function (t) { return t.id === id; })[0];
        if (!task) return;
        var next = task.status === "doing" ? "todo" : "doing";
        MelodiDB.updateInList("tasks", id, { status: next });
        if (next === "doing" && window.MelodiADHD) MelodiADHD.play("tick");
        renderQuadrants();
      });
    });

    // 5分钟启动：直接进专注模式
    container.querySelectorAll("[data-quick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.getAttribute("data-quick");
        var task = MelodiDB.getList("tasks").filter(function (t) { return t.id === id; })[0];
        if (!task || !window.MelodiADHD) return;
        MelodiDB.updateInList("tasks", id, { status: "doing" });
        MelodiADHD.quickStart(task.text, function (min, completed) {
          var cur = MelodiDB.getList("tasks").filter(function (t) { return t.id === id; })[0];
          if (cur) MelodiDB.updateInList("tasks", id, { spentMin: (cur.spentMin || 0) + min });
          renderQuadrants();
        });
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
        renderQuadrants();
      });
    });

    container.querySelectorAll(".task-delete").forEach(function (del) {
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = this.dataset.id;
        if (window.MelodiADHD) MelodiADHD.stopCountdown("task_" + id);
        MelodiDB.removeFromList("tasks", id);
        renderQuadrants();
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
        renderQuadrants();
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
    var donePast = allTasks.filter(function (t) { return t.done && t.date && t.date !== todayKey; });

    var html = "";
    if (doneToday.length > 0) {
      html += '<div class="history-header" id="todayHistoryHeader"><span class="history-arrow">&#9658;</span> 今日已完成 (' + doneToday.length + ")</div>";
      html += '<div class="history-content" id="todayHistoryContent">';
      html += doneToday.map(function (t) {
        return '<div class="task-item done"><div class="task-checkbox checked"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5l-1.4 1.4l4.9 4.9l11-11l-1.4-1.4z" fill="white"/></svg></div><span class="task-text">' + escapeHtml(t.text) + "</span></div>";
      }).join("");
      html += "</div>";
    }
    if (donePast.length > 0) {
      html += '<div class="history-header" id="pastHistoryHeader"><span class="history-arrow">&#9658;</span> 往期已完成 (' + donePast.length + ")</div>";
      html += '<div class="history-content" id="pastHistoryContent">';
      html += donePast.map(function (t) {
        return '<div class="task-item done"><div class="task-checkbox checked"><svg viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5l-1.4 1.4l4.9 4.9l11-11l-1.4-1.4z" fill="white"/></svg></div><span class="task-text">' + escapeHtml(t.text) + '</span><span class="text-muted" style="font-size:var(--font-size-xs);">' + (t.date || "") + "</span></div>";
      }).join("");
      html += "</div>";
    }
    if (doneToday.length === 0 && donePast.length === 0) {
      container.innerHTML = "";
      return;
    }
    html = '<div style="margin-bottom:8px;"><button class="btn btn-ghost btn-sm" id="hideHistoryBtn">批量隐藏已完成项</button></div>' + html;
    container.innerHTML = html;

    ["todayHistoryHeader", "pastHistoryHeader"].forEach(function (id) {
      var header = document.getElementById(id);
      if (header) {
        header.addEventListener("click", function () {
          this.classList.toggle("open");
          var content = this.nextElementSibling;
          if (content) content.classList.toggle("open");
        });
      }
    });

    var hideBtn = document.getElementById("hideHistoryBtn");
    if (hideBtn) {
      hideBtn.addEventListener("click", function () {
        var allTasks = MelodiDB.getList("tasks");
        var undone = allTasks.filter(function (t) { return !t.done; });
        MelodiDB.set("list:tasks", undone);
        renderQuadrants();
        renderTaskHistory();
        App.showReminder("已清空已完成项", "success");
      });
    }
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

    MelodiCharts.lineChart("sleepChart", sleepLabels, [
      {
        label: "睡眠时长",
        data: sleepData,
        color: MelodiCharts.colors.primary,
        fillColor: MelodiCharts.colors.primaryBg,
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

    // 饮水 + 热量
    var dietMonthData = MelodiDB.getMonthData("diet");
    var sleepMonthData = MelodiDB.getMonthData("sleep");
    var waterData = sleepLabels.map(function (_, i) {
      var day = i + 1;
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var s = sleepMonthData[dateKey];
      return s && s.water ? parseFloat((s.water / 1000).toFixed(2)) : 0;
    });
    var calorieData = sleepLabels.map(function (_, i) {
      var day = i + 1;
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var d = dietMonthData[dateKey];
      if (!d || !d.meals) return 0;
      var total = 0;
      Object.keys(d.meals).forEach(function (k) {
        total += parseInt(d.meals[k].calories) || 0;
      });
      return total;
    });

    MelodiCharts.barChart("dietChart", sleepLabels, [
      { label: "饮水 (L)", data: waterData, color: MelodiCharts.colors.blue },
      { label: "热量 (x100 kcal)", data: calorieData.map(function (c) { return c / 100; }), color: MelodiCharts.colors.orange },
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

  return { render: render };
})();
