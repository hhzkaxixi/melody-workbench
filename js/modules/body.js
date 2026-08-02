/* ============================================
   美乐蒂工作台 - 保养护肤身材管理模块
   运动轮动 · 皮肤管理 · 养生习惯 · 休闲习惯
   ============================================ */

const BodyModule = (function () {
  var today = "";

  /* 运动轮动配置 */
  var rotationPlan = [
    { key: "shoulder_chest", label: "肩胸训练", icon: "\uD83D\uDCAA", color: "var(--melodi-pink-500)" },
    { key: "abs", label: "腰腹训练", icon: "\uD83D\uDD51", color: "var(--color-warning)" },
    { key: "glutes_legs", label: "臀腿训练", icon: "\uD83E\uDDB5", color: "var(--color-success)" },
    { key: "full_body", label: "全身循环", icon: "\uD83D\uDD25", color: "var(--color-info)" },
  ];

  function render() {
    today = MelodiDB.todayKey();
    var now = new Date();
    var dayOfWeek = now.getDay(); // 0=周日, 6=周六
    var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    var html = "";

    // 标签页
    html += '<div class="tabs" id="bodyTabs">';
    html += '<div class="tab active" data-tab="exercise">运动规划</div>';
    html += '<div class="tab" data-tab="skincare">皮肤管理</div>';
    html += '<div class="tab" data-tab="wellness">养生习惯</div>';
    html += '<div class="tab" data-tab="leisure">休闲习惯</div>';
    html += '<div class="tab" data-tab="weight">体重追踪</div>';
    html += "</div>";

    // 运动规划
    html += '<div class="tab-panel active" data-panel="exercise">';
    html += renderExerciseSection(isWeekend, now);
    html += "</div>";

    // 皮肤管理
    html += '<div class="tab-panel" data-panel="skincare">';
    html += renderSkincareSection();
    html += "</div>";

    // 养生习惯
    html += '<div class="tab-panel" data-panel="wellness">';
    html += renderWellnessSection();
    html += "</div>";

    // 休闲习惯
    html += '<div class="tab-panel" data-panel="leisure">';
    html += renderLeisureSection();
    html += "</div>";

    // 体重追踪
    html += '<div class="tab-panel" data-panel="weight">';
    html += renderWeightSection();
    html += "</div>";

    setTimeout(setupEvents, 0);
    return html;
  }

  function statCard(value, label, color) {
    var style = color ? ' style="color:' + color + '"' : "";
    return '<div class="stat-card"><div class="stat-value"' + style + ">" + value + '</div><div class="stat-label">' + label + "</div></div>";
  }

  /* ===== 运动规划 ===== */
  function renderExerciseSection(isWeekend, now) {
    var exerciseData = MelodiDB.getDayData("exercise") || {};
    var checkins = exerciseData.checkins || {};
    var todayDone = checkins.exercise;

    // 确定今日训练部位
    var todayPlan = getTodayPlan(now);
    var planLabel = isWeekend ? "休息日" : rotationPlan[todayPlan.index].label;
    var planIcon = isWeekend ? "\uD83D\uDE34" : rotationPlan[todayPlan.index].icon;

    var html = "";

    // 统计
    var monthData = MelodiDB.getMonthData("exercise");
    var monthCount = 0;
    var monthMinutes = 0;
    Object.keys(monthData).forEach(function (k) {
      var d = monthData[k];
      if (d && d.checkins && d.checkins.exercise) {
        monthCount++;
        monthMinutes += d.exerciseMinutes || 0;
      }
    });

    html += '<div class="stat-grid">';
    html += statCard(todayDone ? "已完成" : "未打卡", "今日运动", todayDone ? "var(--color-success)" : "var(--text-tertiary)");
    html += statCard(monthCount + "次", "本月运动");
    html += statCard(monthMinutes + "min", "本月时长");
    html += statCard(isWeekend ? "休息日" : "30-60min", "今日目标");
    html += "</div>";

    // 今日训练计划
    html += '<div class="card" style="background:linear-gradient(135deg,var(--melodi-pink-100),var(--melodi-pink-50));border:none;">';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<div style="font-size:36px;">' + planIcon + "</div>";
    html += '<div><div style="font-size:var(--font-size-lg);font-weight:600;color:var(--melodi-pink-700);">' + planLabel + "</div>";
    if (isWeekend) {
      html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);">周末休息日，让身体恢复一下</div>';
    } else {
      html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);">建议时长 30~60 分钟</div>';
    }
    html += "</div></div></div>";

    if (!isWeekend) {
      // 运动打卡区
      html += '<div class="card">';
      html += '<div class="card-header"><div class="card-title">运动打卡</div>';
      html += '<span style="font-size:var(--font-size-xs);color:' + (todayDone ? "var(--color-success)" : "var(--text-tertiary)") + ';">' + (todayDone ? "已打卡" : "待打卡") + "</span></div>";

      // 运动时长
      html += '<div class="form-row" style="margin-bottom:12px;align-items:flex-end;">';
      html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">运动时长 (分钟)</label>';
      html += '<input type="number" class="form-input" id="exerciseMinutes" value="' + (exerciseData.exerciseMinutes || 30) + '" min="30" max="60" step="5" style="width:100px;"></div>';
      html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">训练部位</label>';
      html += '<select class="form-select" id="exercisePart" style="width:120px;">';
      rotationPlan.forEach(function (p, i) {
        html += '<option value="' + p.key + '"' + (i === todayPlan.index ? " selected" : "") + ">" + p.label + "</option>";
      });
      html += "</select></div>";
      html += '<button class="btn btn-primary" id="exerciseCheckinBtn"' + (todayDone ? " disabled" : "") + ">" + (todayDone ? "已打卡" : "打卡") + "</button>";
      html += "</div>";

      // B站视频链接
      html += '<div class="form-group"><label class="form-label">B站健身视频链接</label>';
      html += '<input type="text" class="form-input" id="bilibiliLink" placeholder="https://www.bilibili.com/video/..." value="' + escapeHtml(exerciseData.bilibiliLink || "") + '"></div>';

      // 每日瑜伽跟练链接
      html += '<div class="form-group"><label class="form-label">每日瑜伽跟练指引</label>';
      html += '<input type="text" class="form-input" id="yogaLink" placeholder="https://..." value="' + escapeHtml(exerciseData.yogaLink || "") + '"></div>';

      // 保存链接
      html += '<button class="btn btn-secondary btn-sm" id="saveExerciseLinks" style="margin-top:4px;">保存链接</button>';

      html += "</div>";
    }

    // 运动记录列表
    html += renderExerciseRecords();

    // 运动月度图表
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">运动数据月度趋势</div></div>';
    html += '<div class="chart-title">每日运动时长 (分钟)</div>';
    html += '<div class="chart-canvas-wrap" style="margin-bottom:16px;"><canvas id="exerciseMinutesChart"></canvas></div>';
    html += '<div class="chart-title">训练部位分布</div>';
    html += '<div class="chart-canvas-wrap"><canvas id="exercisePartChart"></canvas></div>';
    html += "</div>";

    // 体重联动
    html += '<div class="card" style="background:var(--melodi-pink-50);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div><div style="font-weight:600;color:var(--melodi-pink-700);font-size:var(--font-size-sm);">体重联动</div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);">运动数据与体重板块联动生成身材变化曲线</div></div>';
    html += '<button class="btn btn-secondary btn-sm" id="gotoWeightBtn">查看体重</button></div>';
    html += "</div>";

    return html;
  }

  /* 确定今日训练计划在轮动中的索引 */
  function getTodayPlan(now) {
    // 查找本月工作日运动记录，确定下一步
    var monthData = MelodiDB.getMonthData("exercise");
    var sortedDates = Object.keys(monthData).filter(function (k) {
      var d = new Date(k);
      var dow = d.getDay();
      return dow !== 0 && dow !== 6 && monthData[k].checkins && monthData[k].checkins.exercise;
    }).sort();

    var lastPartIndex = 0;
    if (sortedDates.length > 0) {
      var lastDate = sortedDates[sortedDates.length - 1];
      var lastPart = monthData[lastDate].exercisePart;
      var foundIdx = rotationPlan.findIndex(function (p) { return p.key === lastPart; });
      if (foundIdx >= 0) lastPartIndex = foundIdx;
      return { index: (lastPartIndex + 1) % rotationPlan.length, total: sortedDates.length };
    }
    return { index: 0, total: 0 };
  }

  function renderExerciseRecords() {
    var monthData = MelodiDB.getMonthData("exercise");
    var records = Object.keys(monthData)
      .filter(function (k) { return monthData[k].checkins && monthData[k].checkins.exercise; })
      .sort()
      .reverse()
      .slice(0, 10);

    if (records.length === 0) {
      return '<div class="card"><div class="card-header"><div class="card-title">运动记录</div></div><div class="empty-state-text" style="padding:16px;text-align:center;">暂无运动记录</div></div>';
    }

    var html = '<div class="card"><div class="card-header"><div class="card-title">运动记录 (最近10条)</div></div>';
    records.forEach(function (k) {
      var d = monthData[k];
      var part = rotationPlan.find(function (p) { return p.key === d.exercisePart; });
      var partLabel = part ? part.label : (d.exercisePart || "未记录");
      var partIcon = part ? part.icon : "\uD83D\uDCAA";
      html += '<div class="record-item">';
      html += '<span style="font-size:20px;margin-right:8px;">' + partIcon + "</span>";
      html += '<div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + partLabel + " · " + (d.exerciseMinutes || 0) + "min</div>";
      html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + k + "</div></div>";
      if (d.bilibiliLink) {
        html += '<a href="' + escapeHtml(d.bilibiliLink) + '" target="_blank" style="font-size:var(--font-size-xs);color:var(--color-info);">B站</a>';
      }
      html += "</div>";
    });
    html += "</div>";
    return html;
  }

  /* ===== 皮肤管理 ===== */
  function renderSkincareSection() {
    var data = MelodiDB.getDayData("skincare") || {};
    var checkins = data.checkins || {};

    // 判断今天是否该敷面膜（隔天）
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayKey = MelodiDB.dateKey(yesterday);
    var yesterdayData = MelodiDB.getDayData("skincare", yesterdayKey);
    var yesterdayMask = yesterdayData && yesterdayData.checkins && yesterdayData.checkins.mask;
    var todayMaskDay = !yesterdayMask; // 昨天没敷，今天该敷

    // 本周清洁面膜是否已做
    var now = new Date();
    var weekStart = new Date(now);
    var dow = now.getDay();
    weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    var weekStartKey = MelodiDB.dateKey(weekStart);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    var weekEndKey = MelodiDB.dateKey(weekEnd);
    var weekData = MelodiDB.getRangeData("skincare", weekStartKey, weekEndKey);
    var weekCleanMaskDone = false;
    Object.keys(weekData).forEach(function (k) {
      if (weekData[k] && weekData[k].checkins && weekData[k].checkins.clean_mask) weekCleanMaskDone = true;
    });

    var html = "";

    // 统计
    var monthData = MelodiDB.getMonthData("skincare");
    var maskCount = 0;
    var cleanMaskCount = 0;
    Object.keys(monthData).forEach(function (k) {
      if (monthData[k] && monthData[k].checkins) {
        if (monthData[k].checkins.mask) maskCount++;
        if (monthData[k].checkins.clean_mask) cleanMaskCount++;
      }
    });

    html += '<div class="stat-grid">';
    html += statCard(maskCount + "次", "本月面膜");
    html += statCard(cleanMaskCount + "次", "本月清洁面膜");
    html += statCard(todayMaskDay ? "今日该敷" : "今日休息", "面膜状态", todayMaskDay ? "var(--melodi-pink-500)" : "var(--text-tertiary)");
    html += statCard(weekCleanMaskDone ? "已完成" : "待完成", "本周清洁面膜", weekCleanMaskDone ? "var(--color-success)" : "var(--color-warning)");
    html += "</div>";

    // 打卡区
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">护肤打卡</div></div>';

    // 面膜打卡
    html += '<div class="checkin-row' + (checkins.mask ? " checked" : "") + '" data-module="skincare" data-key="mask">';
    html += '<span class="checkin-row-icon">\uD83C\uDFAD</span>';
    html += '<div class="checkin-row-info"><div class="checkin-row-label">面膜打卡</div>';
    html += '<div class="checkin-row-desc">' + (todayMaskDay ? "今天该敷面膜了" : "昨天已敷，今天休息") + "</div></div>";
    html += '<div class="checkin-row-status">' + (checkins.mask ? "已打卡" : "打卡") + "</div>";
    html += "</div>";

    // 清洁面膜打卡
    html += '<div class="checkin-row' + (checkins.clean_mask ? " checked" : "") + '" data-module="skincare" data-key="clean_mask">';
    html += '<span class="checkin-row-icon">\u2728</span>';
    html += '<div class="checkin-row-info"><div class="checkin-row-label">清洁面膜 (每周1次)</div>';
    html += '<div class="checkin-row-desc">' + (weekCleanMaskDone ? "本周已完成" : "本周还未做") + "</div></div>";
    html += '<div class="checkin-row-status">' + (checkins.clean_mask ? "已打卡" : "打卡") + "</div>";
    html += "</div>";

    html += "</div>";

    // 月度图表
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">护肤月度完成率</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="skincareChart"></canvas></div>';
    html += "</div>";

    return html;
  }

  /* ===== 养生习惯 ===== */
  function renderWellnessSection() {
    var data = MelodiDB.getDayData("wellness") || {};
    var checkins = data.checkins || {};

    var wellnessItems = [
      { key: "supplement", label: "饭后保健品", icon: "\uD83D\uDC8A", desc: "饭后服用，补充营养" },
      { key: "ginseng", label: "早起红参元", icon: "\uD83E\uDED6", desc: "早起空腹饮用，补气养血" },
      { key: "footbath", label: "睡前泡脚", icon: "\uD83E\uDDB6", desc: "睡前20分钟，助眠暖身" },
    ];

    var html = "";

    // 统计
    var monthData = MelodiDB.getMonthData("wellness");
    var counts = { supplement: 0, ginseng: 0, footbath: 0 };
    Object.keys(monthData).forEach(function (k) {
      if (monthData[k] && monthData[k].checkins) {
        wellnessItems.forEach(function (w) {
          if (monthData[k].checkins[w.key]) counts[w.key]++;
        });
      }
    });

    html += '<div class="stat-grid">';
    wellnessItems.forEach(function (w) {
      html += statCard(counts[w.key] + "天", w.label.replace("饭后", "").replace("早起", "").replace("睡前", ""));
    });
    html += "</div>";

    // 打卡区
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">养生习惯打卡</div></div>';

    wellnessItems.forEach(function (w) {
      var checked = checkins[w.key];
      html += '<div class="checkin-row' + (checked ? " checked" : "") + '" data-module="wellness" data-key="' + w.key + '">';
      html += '<span class="checkin-row-icon">' + w.icon + "</span>";
      html += '<div class="checkin-row-info"><div class="checkin-row-label">' + w.label + "</div>";
      html += '<div class="checkin-row-desc">' + w.desc + "</div></div>";
      html += '<div class="checkin-row-status">' + (checked ? "已打卡" : "打卡") + "</div>";
      html += "</div>";
    });

    html += "</div>";

    // 月度图表
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">养生习惯月度完成率</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="wellnessChart"></canvas></div>';
    html += "</div>";

    return html;
  }

  /* ===== 休闲习惯 ===== */
  function renderLeisureSection() {
    var data = MelodiDB.getDayData("leisure") || {};
    var checkins = data.checkins || {};

    var leisureItems = [
      { key: "sub_podcast", label: "睡前sub/播客", icon: "\uD83C\uDFA7", desc: "睡前收听，放松身心" },
      { key: "movie", label: "观影/纪录片", icon: "\uD83C\uDFAC", desc: "每周至少1部，记录感悟" },
      { key: "perfume", label: "香水使用", icon: "\uD83C\uDFAD", desc: "今日喷了什么香？" },
      { key: "album_organize", label: "相册整理", icon: "\uD83D\uDCF7", desc: "整理手机相册，删除重复" },
      { key: "collection_organize", label: "收藏整理", icon: "\uD83D\uDDC2\uFE0F", desc: "整理抖音/小红书收藏" },
    ];

    var html = "";

    // 统计
    var monthData = MelodiDB.getMonthData("leisure");
    var counts = {};
    leisureItems.forEach(function (l) { counts[l.key] = 0; });
    Object.keys(monthData).forEach(function (k) {
      if (monthData[k] && monthData[k].checkins) {
        leisureItems.forEach(function (l) {
          if (monthData[k].checkins[l.key]) counts[l.key]++;
        });
      }
    });

    html += '<div class="stat-grid">';
    html += statCard(counts.sub_podcast + "天", "sub/播客");
    html += statCard(counts.movie + "部", "观影记录");
    html += statCard(counts.perfume + "天", "香水使用");
    html += statCard((counts.album_organize + counts.collection_organize) + "次", "整理收纳");
    html += "</div>";

    // 打卡区
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">休闲习惯打卡</div></div>';

    leisureItems.forEach(function (l) {
      var checked = checkins[l.key];
      html += '<div class="checkin-row' + (checked ? " checked" : "") + '" data-module="leisure" data-key="' + l.key + '">';
      html += '<span class="checkin-row-icon">' + l.icon + "</span>";
      html += '<div class="checkin-row-info"><div class="checkin-row-label">' + l.label + "</div>";
      html += '<div class="checkin-row-desc">' + l.desc + "</div></div>";
      html += '<div class="checkin-row-status">' + (checked ? "已打卡" : "打卡") + "</div>";
      html += "</div>";
    });

    html += "</div>";

    // 观影记录列表
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">观影记录</div>';
    html += '<button class="btn btn-secondary btn-sm" id="addMovieBtn">添加观影</button></div>';
    html += '<div id="movieList"></div>';
    html += "</div>";

    // 月度图表
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">休闲习惯月度完成率</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="leisureChart"></canvas></div>';
    html += "</div>";

    return html;
  }

  /* ===== 事件绑定 ===== */
  /* ===== 体重追踪 ===== */
  function renderWeightSection() {
    var weightData = MelodiDB.getList("weightRecords");
    var latest = weightData.length > 0 ? weightData[0] : null;
    var settings = MelodiDB.getSettings();
    var targetWeight = settings.targetWeight || 50;

    // 运动数据联动
    var exerciseMonthData = MelodiDB.getMonthData("exercise");
    var exerciseCount = 0;
    var exerciseMinutes = 0;
    Object.keys(exerciseMonthData).forEach(function (k) {
      if (exerciseMonthData[k] && exerciseMonthData[k].checkins && exerciseMonthData[k].checkins.exercise) {
        exerciseCount++;
        exerciseMinutes += exerciseMonthData[k].exerciseMinutes || 0;
      }
    });

    var html = '<div class="stat-grid">';
    html += statCard(latest ? latest.weight + "kg" : "--", "最新体重");
    html += statCard(targetWeight + "kg", "目标体重");
    html += statCard(latest && latest.weight ? (latest.weight - targetWeight).toFixed(1) + "kg" : "--", "距目标");
    html += statCard(exerciseCount + "次/" + exerciseMinutes + "min", "本月运动");
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">记录体重</div></div>';
    html += '<div class="form-row" style="align-items:flex-end;">';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">体重 (kg)</label><input type="number" class="form-input" id="weightInput" placeholder="如 52.5" step="0.1" style="width:120px;"></div>';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">设置目标</label><input type="number" class="form-input" id="targetWeightInput" value="' + targetWeight + '" step="0.5" style="width:100px;"></div>';
    html += '<button class="btn btn-primary" id="saveWeightBtn">记录</button>';
    html += "</div></div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">体重变化曲线</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="weightChart"></canvas></div></div>';

    // 身材线条变化曲线（体重+运动时长双轴）
    html += '<div class="card"><div class="card-header"><div class="card-title">身材变化趋势 (体重 + 运动时长)</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="bodyTrendChart"></canvas></div></div>';

    return html;
  }

  function setupEvents() {
    // 标签切换
    document.querySelectorAll("#bodyTabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll("#bodyTabs .tab").forEach(function (t) { t.classList.remove("active"); });
        this.classList.add("active");
        var target = this.dataset.tab;
        document.querySelectorAll("#bodyTabs ~ .tab-panel").forEach(function (p) {
          p.classList.toggle("active", p.dataset.panel === target);
        });
        renderActiveChart(target);
      });
    });

    // 打卡行点击
    document.querySelectorAll(".checkin-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var module = this.dataset.module;
        var key = this.dataset.key;
        var newState = MelodiDB.toggleCheckin(module, key);
        this.classList.toggle("checked", newState);
        var statusEl = this.querySelector(".checkin-row-status");
        if (statusEl) statusEl.textContent = newState ? "已打卡" : "打卡";
        App.showReminder(newState ? "打卡成功" : "已取消", newState ? "success" : "warning");
      });
    });

    // 运动打卡
    var exerciseBtn = document.getElementById("exerciseCheckinBtn");
    if (exerciseBtn) {
      exerciseBtn.addEventListener("click", function () {
        var minutes = parseInt(document.getElementById("exerciseMinutes").value) || 30;
        var part = document.getElementById("exercisePart").value;
        if (minutes < 30 || minutes > 60) {
          App.showReminder("运动时长需在30-60分钟之间", "warning");
          return;
        }
        var data = MelodiDB.getDayData("exercise") || {};
        if (!data.checkins) data.checkins = {};
        data.checkins.exercise = true;
        data.exerciseMinutes = minutes;
        data.exercisePart = part;
        MelodiDB.setDayData("exercise", data);
        App.showReminder("运动打卡成功！加油！", "success");
        refreshFitnessPanel("exercise");
      });
    }

    // 保存链接
    var saveLinksBtn = document.getElementById("saveExerciseLinks");
    if (saveLinksBtn) {
      saveLinksBtn.addEventListener("click", function () {
        var data = MelodiDB.getDayData("exercise") || {};
        data.bilibiliLink = document.getElementById("bilibiliLink").value;
        data.yogaLink = document.getElementById("yogaLink").value;
        MelodiDB.setDayData("exercise", data);
        App.showReminder("链接已保存", "success");
      });
    }

    // 跳转体重（切到体重 tab）
    var gotoWeightBtn = document.getElementById("gotoWeightBtn");
    if (gotoWeightBtn) {
      gotoWeightBtn.addEventListener("click", function () {
        document.querySelectorAll("#bodyTabs .tab").forEach(function (t) { t.classList.remove("active"); });
        var wt = document.querySelector("#bodyTabs .tab[data-tab='weight']");
        if (wt) wt.classList.add("active");
        document.querySelectorAll("#bodyTabs ~ .tab-panel").forEach(function (p) {
          p.classList.toggle("active", p.dataset.panel === "weight");
        });
        renderActiveChart("weight");
      });
    }

    // 记录体重
    var saveWeightBtn = document.getElementById("saveWeightBtn");
    if (saveWeightBtn) {
      saveWeightBtn.addEventListener("click", function () {
        var input = document.getElementById("weightInput");
        var targetInput = document.getElementById("targetWeightInput");
        var w = parseFloat(input.value);
        var tw = parseFloat(targetInput.value);
        if (tw && tw > 20 && tw < 200) {
          MelodiDB.setSettings({ targetWeight: tw });
        }
        if (!w || w < 20 || w > 200) {
          App.showReminder("请输入合理的体重", "warning");
          return;
        }
        MelodiDB.addToList("weightRecords", { weight: w, date: MelodiDB.todayKey() });
        App.showReminder("体重已记录", "success");
        refreshFitnessPanel("weight");
      });
    }

    // 添加观影
    var addMovieBtn = document.getElementById("addMovieBtn");
    if (addMovieBtn) {
      addMovieBtn.addEventListener("click", function () {
        var title = prompt("输入观影名称：");
        if (title && title.trim()) {
          MelodiDB.addToList("movies", { title: title.trim(), date: MelodiDB.todayKey(), rating: "" });
          App.showReminder("观影记录已添加", "success");
          renderMovieList();
        }
      });
    }

    // 初始化图表
    renderActiveChart("exercise");
  }

  /* 原地刷新某个 tab 的面板（不整页重渲染，避免跳顶） */
  function refreshFitnessPanel(tabKey) {
    var panel = document.querySelector('.tab-panel[data-panel="' + tabKey + '"]');
    if (!panel) { App.renderPage("fitness"); return; }
    if (tabKey === "exercise") {
      var now = new Date();
      var isWeekend = now.getDay() === 0 || now.getDay() === 6;
      panel.innerHTML = renderExerciseSection(isWeekend, now);
    } else if (tabKey === "weight") {
      panel.innerHTML = renderWeightSection();
    } else {
      App.renderPage("fitness");
      return;
    }
    bindPanel(tabKey);
    renderActiveChart(tabKey);
  }

  /* 仅重新绑定指定 panel 内的事件（refreshFitnessPanel 用） */
  function bindPanel(tabKey) {
    if (tabKey === "exercise") {
      var exerciseBtn = document.getElementById("exerciseCheckinBtn");
      if (exerciseBtn) {
        exerciseBtn.addEventListener("click", function () {
          var minutes = parseInt(document.getElementById("exerciseMinutes").value) || 30;
          var part = document.getElementById("exercisePart").value;
          if (minutes < 30 || minutes > 60) {
            App.showReminder("运动时长需在30-60分钟之间", "warning");
            return;
          }
          var data = MelodiDB.getDayData("exercise") || {};
          if (!data.checkins) data.checkins = {};
          data.checkins.exercise = true;
          data.exerciseMinutes = minutes;
          data.exercisePart = part;
          MelodiDB.setDayData("exercise", data);
          App.showReminder("运动打卡成功！加油！", "success");
          refreshFitnessPanel("exercise");
        });
      }
      var saveLinksBtn = document.getElementById("saveExerciseLinks");
      if (saveLinksBtn) {
        saveLinksBtn.addEventListener("click", function () {
          var data = MelodiDB.getDayData("exercise") || {};
          data.bilibiliLink = document.getElementById("bilibiliLink").value;
          data.yogaLink = document.getElementById("yogaLink").value;
          MelodiDB.setDayData("exercise", data);
          App.showReminder("链接已保存", "success");
        });
      }
      var gotoWeightBtn = document.getElementById("gotoWeightBtn");
      if (gotoWeightBtn) {
        gotoWeightBtn.addEventListener("click", function () {
          document.querySelectorAll("#bodyTabs .tab").forEach(function (t) { t.classList.remove("active"); });
          var wt = document.querySelector("#bodyTabs .tab[data-tab='weight']");
          if (wt) wt.classList.add("active");
          document.querySelectorAll("#bodyTabs ~ .tab-panel").forEach(function (p) {
            p.classList.toggle("active", p.dataset.panel === "weight");
          });
          renderActiveChart("weight");
        });
      }
    } else if (tabKey === "weight") {
      var saveWeightBtn = document.getElementById("saveWeightBtn");
      if (saveWeightBtn) {
        saveWeightBtn.addEventListener("click", function () {
          var input = document.getElementById("weightInput");
          var targetInput = document.getElementById("targetWeightInput");
          var w = parseFloat(input.value);
          var tw = parseFloat(targetInput.value);
          if (tw && tw > 20 && tw < 200) {
            MelodiDB.setSettings({ targetWeight: tw });
          }
          if (!w || w < 20 || w > 200) {
            App.showReminder("请输入合理的体重", "warning");
            return;
          }
          MelodiDB.addToList("weightRecords", { weight: w, date: MelodiDB.todayKey() });
          App.showReminder("体重已记录", "success");
          refreshFitnessPanel("weight");
        });
      }
    }
  }

  function renderActiveChart(tab) {
    if (tab === "exercise") renderExerciseCharts();
    else if (tab === "skincare") renderSkincareChart();
    else if (tab === "wellness") renderWellnessChart();
    else if (tab === "leisure") renderLeisureChart();
    else if (tab === "weight") renderWeightCharts();
  }

  function renderMovieList() {
    var container = document.getElementById("movieList");
    if (!container) return;
    var movies = MelodiDB.getList("movies").slice(0, 10);
    if (movies.length === 0) {
      container.innerHTML = '<div class="empty-state-text" style="padding:12px;text-align:center;">暂无观影记录</div>';
      return;
    }
    container.innerHTML = movies.map(function (m) {
      return '<div class="record-item">' +
        '<span style="font-size:20px;margin-right:8px;">\uD83C\uDFAC</span>' +
        '<div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + escapeHtml(m.title) + "</div>" +
        '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + (m.date || "") + "</div></div>" +
        '<div class="task-delete" data-id="' + m.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></div>' +
        "</div>";
    }).join("");

    container.querySelectorAll(".task-delete").forEach(function (del) {
      del.addEventListener("click", function () {
        MelodiDB.removeFromList("movies", this.dataset.id);
        renderMovieList();
      });
    });
  }

  /* ===== 图表渲染 ===== */
  function renderExerciseCharts() {
    var monthData = MelodiDB.getMonthData("exercise");
    var now = new Date();
    var currentDay = now.getDate();
    var labels = [];
    var minutesData = [];
    for (var i = 1; i <= currentDay; i++) {
      labels.push((now.getMonth() + 1) + "/" + i);
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
      var d = monthData[dateKey];
      minutesData.push(d && d.checkins && d.checkins.exercise ? (d.exerciseMinutes || 0) : 0);
    }

    MelodiCharts.barChart("exerciseMinutesChart", labels, [
      { label: "运动时长 (分钟)", data: minutesData, color: MelodiCharts.colors.primary },
    ]);

    // 训练部位分布
    var partCounts = rotationPlan.map(function () { return 0; });
    Object.keys(monthData).forEach(function (k) {
      var d = monthData[k];
      if (d && d.checkins && d.checkins.exercise && d.exercisePart) {
        var idx = rotationPlan.findIndex(function (p) { return p.key === d.exercisePart; });
        if (idx >= 0) partCounts[idx]++;
      }
    });

    MelodiCharts.doughnutChart(
      "exercisePartChart",
      rotationPlan.map(function (p) { return p.label; }),
      partCounts,
      [MelodiCharts.colors.primary, MelodiCharts.colors.yellow, MelodiCharts.colors.green, MelodiCharts.colors.blue]
    );
  }

  function renderSkincareChart() {
    var monthData = MelodiDB.getMonthData("skincare");
    var now = new Date();
    var currentDay = now.getDate();
    var labels = [];
    var maskData = [];
    var cleanMaskData = [];
    for (var i = 1; i <= currentDay; i++) {
      labels.push((now.getMonth() + 1) + "/" + i);
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
      var d = monthData[dateKey];
      maskData.push(d && d.checkins && d.checkins.mask ? 1 : 0);
      cleanMaskData.push(d && d.checkins && d.checkins.clean_mask ? 1 : 0);
    }

    MelodiCharts.barChart("skincareChart", labels, [
      { label: "面膜", data: maskData, color: MelodiCharts.colors.primary },
      { label: "清洁面膜", data: cleanMaskData, color: MelodiCharts.colors.purple },
    ]);
  }

  function renderWellnessChart() {
    var monthData = MelodiDB.getMonthData("wellness");
    var now = new Date();
    var currentDay = now.getDate();
    var labels = [];
    var supplementData = [];
    var ginsengData = [];
    var footbathData = [];
    for (var i = 1; i <= currentDay; i++) {
      labels.push((now.getMonth() + 1) + "/" + i);
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
      var d = monthData[dateKey];
      supplementData.push(d && d.checkins && d.checkins.supplement ? 1 : 0);
      ginsengData.push(d && d.checkins && d.checkins.ginseng ? 1 : 0);
      footbathData.push(d && d.checkins && d.checkins.footbath ? 1 : 0);
    }

    MelodiCharts.barChart("wellnessChart", labels, [
      { label: "保健品", data: supplementData, color: MelodiCharts.colors.primary },
      { label: "红参元", data: ginsengData, color: MelodiCharts.colors.orange },
      { label: "泡脚", data: footbathData, color: MelodiCharts.colors.purple },
    ]);
  }

  function renderLeisureChart() {
    var monthData = MelodiDB.getMonthData("leisure");
    var now = new Date();
    var currentDay = now.getDate();
    var labels = [];
    var subData = [];
    var movieData = [];
    var perfumeData = [];
    var organizeData = [];
    for (var i = 1; i <= currentDay; i++) {
      labels.push((now.getMonth() + 1) + "/" + i);
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
      var d = monthData[dateKey];
      subData.push(d && d.checkins && d.checkins.sub_podcast ? 1 : 0);
      movieData.push(d && d.checkins && d.checkins.movie ? 1 : 0);
      perfumeData.push(d && d.checkins && d.checkins.perfume ? 1 : 0);
      organizeData.push(d && d.checkins && (d.checkins.album_organize || d.checkins.collection_organize) ? 1 : 0);
    }

    MelodiCharts.barChart("leisureChart", labels, [
      { label: "sub/播客", data: subData, color: MelodiCharts.colors.primary },
      { label: "观影", data: movieData, color: MelodiCharts.colors.blue },
      { label: "香水", data: perfumeData, color: MelodiCharts.colors.purple },
      { label: "整理收纳", data: organizeData, color: MelodiCharts.colors.teal },
    ]);
  }

  function renderWeightCharts() {
    var settings = MelodiDB.getSettings();
    var targetWeight = settings.targetWeight || 50;
    var exerciseMonthData = MelodiDB.getMonthData("exercise");
    var weightData = MelodiDB.getList("weightRecords");
    var records = weightData.slice().reverse();

    // 体重曲线
    var wLabels = records.map(function (r) { return r.date ? r.date.substring(5) : ""; });
    var wData = records.map(function (r) { return r.weight; });
    MelodiCharts.lineChart("weightChart", wLabels, [
      { label: "体重", data: wData, color: MelodiCharts.colors.primary, fillColor: MelodiCharts.colors.primaryBg },
      { label: "目标", data: wLabels.map(function () { return targetWeight; }), color: MelodiCharts.colors.green, fill: false, borderWidth: 1, borderDash: [5, 5] },
    ]);

    // 身材变化趋势（本月每日体重 vs 运动时长）
    var now = new Date();
    var currentDay = now.getDate();
    var trendLabels = [];
    var trendWeight = [];
    var trendExercise = [];
    for (var i = 1; i <= currentDay; i++) {
      trendLabels.push((now.getMonth() + 1) + "/" + i);
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
      var wRec = records.find(function (r) { return r.date === dateKey; });
      trendWeight.push(wRec ? wRec.weight : null);
      var ex = exerciseMonthData[dateKey];
      trendExercise.push(ex && ex.checkins && ex.checkins.exercise ? (ex.exerciseMinutes || 0) : 0);
    }
    MelodiCharts.barChart("bodyTrendChart", trendLabels, [
      { label: "体重 (kg)", data: trendWeight, color: MelodiCharts.colors.primary },
      { label: "运动时长 (min)", data: trendExercise, color: MelodiCharts.colors.green },
    ]);
  }

  /* ===== 工具 ===== */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  return { render: render };
})();
