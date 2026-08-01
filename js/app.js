/* ============================================
   美乐蒂工作台 - 主应用逻辑
   路由 · 人生规划 · 运势 · 体重 · 提醒 · 番茄钟 · 灵感
   ============================================ */

const App = (function () {
  var pomodoroTimer = null;
  var pomodoroRemaining = 0;
  var pomodoroRunning = false;

  /* ===== 页面渲染器 ===== */
  var pageRenderers = {
    dashboard: function () { return DailyModule.render(); },
    growth: function () { return GrowthModule.render(); },
    study: function () { return StudyModule.render(); },
    calendar: function () { return MelodiCalendar.render(); },
    export: function () { return MelodiExport.render(); },
    planning: renderPlanning,
    exercise: function () { return BodyModule.render(); },
    fortune: renderFortune,
    finance: renderFinance,
    savings: renderSavings,
    english: renderEnglish,
    invest: renderInvest,
    news: renderNews,
    exam: renderExam,
    weight: renderWeight,
    language: renderLanguage,
    settings: renderSettings,
  };

  /* ===== 通用：占位页面 ===== */
  function renderPlaceholder(title, desc, icon) {
    return (
      '<div class="empty-state">' +
      '<div class="empty-state-icon">' + (icon || "M") + "</div>" +
      '<div style="font-size:var(--font-size-lg);font-weight:600;color:var(--melodi-pink-600);margin-bottom:8px;">' + title + "</div>" +
      '<div class="empty-state-text">' + desc + "</div>" +
      '<div style="margin-top:16px;padding:12px 20px;background:var(--melodi-pink-100);border-radius:var(--radius-md);font-size:var(--font-size-xs);color:var(--melodi-pink-700);">' +
      "详细功能将在下一批次填充" +
      "</div>" +
      "</div>"
    );
  }

  function statCard(value, label) {
    return '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + "</div></div>";
  }

  /* ===== 人生规划 ===== */
  function renderPlanning() {
    var levels = [
      { key: "year", label: "年度总目标", placeholder: "写下今年的核心目标..." },
      { key: "month", label: "月度计划", placeholder: "本月拆分计划..." },
      { key: "week", label: "本周细分", placeholder: "本周具体任务..." },
      { key: "day", label: "今日落地", placeholder: "今天要做的具体事..." },
    ];

    var html = '<div class="card" style="background:linear-gradient(135deg,var(--melodi-pink-100),var(--melodi-pink-50));border:none;margin-bottom:var(--space-md);">';
    html += '<div style="font-size:var(--font-size-md);font-weight:600;color:var(--melodi-pink-700);">四级时间规划闭环</div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:4px;">年度总目标 → 月度拆分 → 每周细分 → 每日落地，数据互通联动</div>';
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">规划详情</div></div>';
    html += '<div class="tabs" id="planningTabs">';
    levels.forEach(function (l, i) {
      html += '<div class="tab' + (i === 0 ? " active" : "") + '" data-level="' + l.key + '">' + l.label + "</div>";
    });
    html += "</div>";

    levels.forEach(function (l, i) {
      var saved = MelodiDB.getDayData("planning_" + l.key) || {};
      html += '<div class="tab-panel' + (i === 0 ? " active" : "") + '" data-panel="plan_' + l.key + '">';
      html += '<div class="form-group"><label class="form-label">' + l.label + "内容</label>";
      html += '<textarea class="form-textarea" id="plan_' + l.key + '" rows="6" placeholder="' + l.placeholder + '">' + escapeHtml(saved.content || "") + "</textarea></div>";
      html += '<div class="form-group"><label class="form-label">复盘备注</label>';
      html += '<input type="text" class="form-input" id="plan_note_' + l.key + '" placeholder="写下复盘思考..." value="' + escapeHtml(saved.note || "") + '" /></div>';
      html += '<div class="flex gap-sm"><button class="btn btn-primary btn-sm" data-save="' + l.key + '">保存</button>';
      html += '<button class="btn btn-ghost btn-sm" data-view-history="' + l.key + '">查看往期</button></div>';
      html += '<div id="history_' + l.key + '" style="margin-top:12px;"></div>';
      html += "</div>";
    });
    html += "</div>";

    setTimeout(setupPlanningEvents, 0);
    return html;
  }

  function setupPlanningEvents() {
    document.querySelectorAll("#planningTabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll("#planningTabs .tab").forEach(function (t) { t.classList.remove("active"); });
        this.classList.add("active");
        document.querySelectorAll('[data-panel^="plan_"]').forEach(function (p) { p.classList.remove("active"); });
        document.querySelector('[data-panel="plan_' + this.dataset.level + '"]').classList.add("active");
      });
    });

    document.querySelectorAll("[data-save]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var level = this.dataset.save;
        var content = document.getElementById("plan_" + level).value;
        var note = document.getElementById("plan_note_" + level).value;
        MelodiDB.setDayData("planning_" + level, { content: content, note: note });
        App.showReminder("已保存" + level + "规划", "success");
      });
    });

    document.querySelectorAll("[data-view-history]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var level = this.dataset.viewHistory;
        var container = document.getElementById("history_" + level);
        if (!container) return;
        if (container.innerHTML) {
          container.innerHTML = "";
          return;
        }
        var allData = MelodiDB.get("daily:planning_" + level, {});
        var today = MelodiDB.todayKey();
        var dates = Object.keys(allData).filter(function (d) { return d !== today && allData[d] && allData[d].content; }).sort().reverse().slice(0, 7);
        if (dates.length === 0) {
          container.innerHTML = '<div class="empty-state-text" style="padding:8px;">暂无往期记录</div>';
          return;
        }
        var html = "";
        dates.forEach(function (d) {
          var data = allData[d];
          html += '<div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:6px;">';
          html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:4px;">' + d + "</div>";
          html += '<div style="font-size:var(--font-size-sm);color:var(--text-primary);white-space:pre-wrap;">' + escapeHtml(data.content) + "</div>";
          if (data.note) html += '<div style="font-size:var(--font-size-xs);color:var(--melodi-pink-600);margin-top:4px;">备注：' + escapeHtml(data.note) + "</div>";
          html += "</div>";
        });
        container.innerHTML = html;
      });
    });
  }

  /* ===== 运动锻炼已移至 BodyModule ===== */

  /* ===== 运势分析 ===== */
  function renderFortune() {
    var settings = MelodiDB.getSettings();
    var birthday = settings.birthday || "2000-10-22";
    var today = MelodiDB.todayKey();
    var fortunes = generateFortune(birthday, today);

    var html = '<div class="card" style="background:linear-gradient(135deg,var(--melodi-pink-100),var(--melodi-pink-50));border:none;">';
    html += '<div style="text-align:center;padding:8px 0;">';
    html += '<div style="font-size:var(--font-size-xl);font-weight:600;color:var(--melodi-pink-700);">今日运势</div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:4px;">生日：' + birthday + " · " + today + "</div>";
    html += "</div></div>";

    html += '<div class="stat-grid">';
    html += statCard(fortunes.luckyScore + "/100", "综合运势");
    html += statCard(fortunes.luckyColor, "幸运颜色");
    html += statCard(fortunes.luckyNumber, "幸运数字");
    html += statCard(fortunes.luckyDirection, "幸运方位");
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">今日提示</div></div>';
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.8;">' + fortunes.tip + "</div></div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">每日励志</div></div>';
    html += '<div style="font-size:var(--font-size-md);color:var(--melodi-pink-600);font-weight:500;">' + fortunes.quote.cn + "</div>";
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-tertiary);margin-top:8px;font-style:italic;">' + fortunes.quote.en + "</div></div>";

    return html;
  }

  function generateFortune(birthday, dateStr) {
    var seed = hashStr(birthday + dateStr);
    var luckyScore = 60 + (seed % 40);
    var colors = ["粉色", "白色", "浅蓝", "薄荷绿", "鹅黄", "薰衣草紫", "珊瑚橙"];
    var directions = ["东方", "南方", "西方", "北方", "东南", "西南", "西北", "东北"];
    var tips = [
      "今天适合整理收纳，清理掉不必要的物品和思绪，轻装上阵。",
      "保持节奏，不必追求完美，完成比完美更重要。",
      "多喝水，多走动，身体舒服了心情自然好。",
      "今天可以尝试一件小事，哪怕只做5分钟也好。",
      "给自己一个拥抱，你已经做得很好了。",
      "今天适合安静阅读，减少社交媒体的时间。",
      "主动跟朋友聊聊天，能量会在交流中流动。",
      "今天财运不错，可以看看理财相关的内容。",
      "适合运动，哪怕是拉伸10分钟也好。",
    ];
    var quotes = [
      { cn: "每一个微小的坚持，都是给未来自己的礼物。", en: "Every small persistence is a gift to your future self." },
      { cn: "不必着急，按照自己的节奏来。", en: "No need to rush, go at your own pace." },
      { cn: "今天的选择，决定明天的模样。", en: "Today's choices shape tomorrow's silhouette." },
      { cn: "温柔且有力量地活着。", en: "Live gently but with strength." },
      { cn: "小步前进，也是一种前进。", en: "Small steps forward are still steps forward." },
      { cn: "你值得拥有美好的一切。", en: "You deserve all the beautiful things." },
      { cn: "专注当下，未来自会明朗。", en: "Focus on the present, the future will become clear." },
    ];
    return {
      luckyScore: luckyScore,
      luckyColor: colors[seed % colors.length],
      luckyNumber: (seed % 9) + 1,
      luckyDirection: directions[(seed >> 3) % directions.length],
      tip: tips[(seed >> 2) % tips.length],
      quote: quotes[(seed >> 4) % quotes.length],
    };
  }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /* ===== 英语学习（与单词板块数据互通）===== */
  function renderEnglish() {
    var growthData = MelodiDB.getDayData("growth") || {};
    var todayMin = growthData.wordsMinutes || 0;
    var monthData = MelodiDB.getMonthData("growth");
    var now = new Date();
    var currentDay = now.getDate();
    var totalMin = 0;
    var labels = [];
    var dataArr = [];
    for (var i = 1; i <= currentDay; i++) {
      labels.push((now.getMonth() + 1) + "/" + i);
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
      var d = monthData[dateKey];
      var min = d && d.wordsMinutes ? d.wordsMinutes : 0;
      dataArr.push(min);
      totalMin += min;
    }

    var html = '<div class="stat-grid">';
    html += statCard(todayMin + "min", "今日背词");
    html += statCard(totalMin + "min", "本月累计");
    html += statCard(Math.round(totalMin / 30) + "min", "日均");
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">背单词时长趋势</div>';
    html += '<button class="btn btn-secondary btn-sm" id="gotoGrowthBtn">去打卡</button></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="englishChart"></canvas></div></div>';

    setTimeout(function () {
      MelodiCharts.lineChart("englishChart", labels, [
        { label: "背词时长", data: dataArr, color: MelodiCharts.colors.blue, fillColor: MelodiCharts.colors.blueBg },
      ]);
      var btn = document.getElementById("gotoGrowthBtn");
      if (btn) btn.addEventListener("click", function () { window.location.hash = "#growth"; });
    }, 0);

    return html;
  }

  /* ===== 体重追踪（联动运动板块）===== */
  function renderWeight() {
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

    setTimeout(function () {
      var btn = document.getElementById("saveWeightBtn");
      if (btn) {
        btn.addEventListener("click", function () {
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
          App.renderPage("weight");
        });
      }

      // 体重曲线
      var records = MelodiDB.getList("weightRecords").slice().reverse();
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
    }, 0);

    return html;
  }

  /* ===== 理财学习 ===== */
  function renderFinance() {
    var today = MelodiDB.todayKey();
    var data = MelodiDB.getDayData("finance") || {};
    var notes = data.notes || "";
    var monthData = MelodiDB.getMonthData("finance");
    var studyDays = 0;
    Object.keys(monthData).forEach(function (k) {
      if (monthData[k] && monthData[k].notes && monthData[k].notes.trim()) studyDays++;
    });

    var html = '<div class="stat-grid">';
    html += statCard(studyDays + "天", "本月学习");
    html += statCard(MelodiDB.getList("financeLinks").length + "条", "收藏资源");
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">今日理财笔记</div></div>';
    html += '<textarea class="form-textarea" id="financeNotes" rows="6" placeholder="记录今日理财学习心得、知识点...">' + escapeHtml(notes) + "</textarea>";
    html += '<button class="btn btn-primary btn-sm" id="saveFinanceNotes" style="margin-top:8px;">保存笔记</button>';
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">学习资源收藏</div>';
    html += '<button class="btn btn-secondary btn-sm" id="addFinanceLink">添加</button></div>';
    html += '<div id="financeLinkList"></div></div>';

    setTimeout(function () {
      var saveBtn = document.getElementById("saveFinanceNotes");
      if (saveBtn) saveBtn.addEventListener("click", function () {
        var val = document.getElementById("financeNotes").value;
        MelodiDB.updateDayData("finance", { notes: val });
        App.showReminder("笔记已保存", "success");
      });
      var addBtn = document.getElementById("addFinanceLink");
      if (addBtn) addBtn.addEventListener("click", function () {
        var title = prompt("资源名称：");
        if (!title || !title.trim()) return;
        var url = prompt("链接地址：");
        MelodiDB.addToList("financeLinks", { title: title.trim(), url: url || "" });
        renderFinanceLinks();
      });
      renderFinanceLinks();
    }, 0);
    return html;
  }

  function renderFinanceLinks() {
    var container = document.getElementById("financeLinkList");
    if (!container) return;
    var links = MelodiDB.getList("financeLinks").slice(0, 20);
    if (links.length === 0) {
      container.innerHTML = '<div class="empty-state-text" style="padding:12px;text-align:center;">暂无收藏资源</div>';
      return;
    }
    container.innerHTML = links.map(function (l) {
      var html = '<div class="record-item">';
      html += '<div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + escapeHtml(l.title) + "</div>";
      if (l.url) html += '<a href="' + escapeHtml(l.url) + '" target="_blank" style="font-size:var(--font-size-xs);color:var(--color-info);">' + escapeHtml(l.url) + "</a>";
      html += "</div>";
      html += '<div class="task-delete" data-id="' + l.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></div>';
      html += "</div>";
      return html;
    }).join("");
    container.querySelectorAll(".task-delete").forEach(function (del) {
      del.addEventListener("click", function () {
        MelodiDB.removeFromList("financeLinks", this.dataset.id);
        renderFinanceLinks();
      });
    });
  }

  /* ===== 攒钱变富 ===== */
  function renderSavings() {
    var settings = MelodiDB.getSettings();
    var monthTarget = settings.savingsMonthTarget || 2000;
    var yearTarget = settings.savingsYearTarget || 24000;
    var records = MelodiDB.getList("savingsRecords");
    var now = new Date();
    var monthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    var monthTotal = records.filter(function (r) { return r.date && r.date.startsWith(monthKey); }).reduce(function (s, r) { return s + (r.amount || 0); }, 0);
    var yearTotal = records.filter(function (r) { return r.date && r.date.startsWith(String(now.getFullYear())); }).reduce(function (s, r) { return s + (r.amount || 0); }, 0);

    var html = '<div class="stat-grid">';
    html += statCard("\u00A5" + monthTotal, "本月存入");
    html += statCard("\u00A5" + yearTotal, "本年存入");
    html += statCard("\u00A5" + monthTarget, "月度目标");
    html += statCard(Math.min(100, Math.round(monthTotal / monthTarget * 100)) + "%", "月度进度");
    html += "</div>";

    // 进度条
    var monthPercent = Math.min(100, Math.round(monthTotal / monthTarget * 100));
    html += '<div class="card"><div class="card-header"><div class="card-title">月度存钱进度</div></div>';
    html += '<div class="water-progress"><div class="water-progress-fill" style="width:' + monthPercent + '%;"></div>';
    html += '<span class="water-progress-text">' + monthTotal + " / " + monthTarget + " \u5143</span></div></div>";

    // 存钱记录
    html += '<div class="card"><div class="card-header"><div class="card-title">存钱记录</div></div>';
    html += '<div class="form-row" style="align-items:flex-end;">';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">金额</label><input type="number" class="form-input" id="savingsAmount" placeholder="如 100" step="0.01" style="width:120px;"></div>';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">备注</label><input type="text" class="form-input" id="savingsNote" placeholder="如 零食省下" style="width:180px;"></div>';
    html += '<button class="btn btn-primary" id="saveSavingsBtn">记录</button>';
    html += "</div></div>";

    // 目标设置
    html += '<div class="card"><div class="card-header"><div class="card-title">目标设置</div></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label class="form-label">月度目标</label><input type="number" class="form-input" id="savingsMonthTarget" value="' + monthTarget + '" step="100"></div>';
    html += '<div class="form-group"><label class="form-label">年度目标</label><input type="number" class="form-input" id="savingsYearTarget" value="' + yearTarget + '" step="1000"></div>';
    html += '<button class="btn btn-secondary btn-sm" id="saveSavingsTarget">保存目标</button>';
    html += "</div></div>";

    // 月度趋势图
    html += '<div class="card"><div class="card-header"><div class="card-title">存钱月度趋势</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="savingsChart"></canvas></div></div>';

    setTimeout(function () {
      var saveBtn = document.getElementById("saveSavingsBtn");
      if (saveBtn) saveBtn.addEventListener("click", function () {
        var amt = parseFloat(document.getElementById("savingsAmount").value);
        var note = document.getElementById("savingsNote").value;
        if (!amt || amt <= 0) { App.showReminder("请输入有效金额", "warning"); return; }
        MelodiDB.addToList("savingsRecords", { amount: amt, note: note, date: MelodiDB.todayKey() });
        App.showReminder("存钱已记录 +\u00A5" + amt, "success");
        App.renderPage("savings");
      });
      var targetBtn = document.getElementById("saveSavingsTarget");
      if (targetBtn) targetBtn.addEventListener("click", function () {
        var mt = parseFloat(document.getElementById("savingsMonthTarget").value) || 2000;
        var yt = parseFloat(document.getElementById("savingsYearTarget").value) || 24000;
        MelodiDB.setSettings({ savingsMonthTarget: mt, savingsYearTarget: yt });
        App.showReminder("目标已更新", "success");
        App.renderPage("savings");
      });

      // 图表：近6个月存钱趋势
      var labels = [];
      var dataArr = [];
      for (var i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var mk = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        var total = records.filter(function (r) { return r.date && r.date.startsWith(mk); }).reduce(function (s, r) { return s + (r.amount || 0); }, 0);
        labels.push((d.getMonth() + 1) + "\u6708");
        dataArr.push(total);
      }
      MelodiCharts.barChart("savingsChart", labels, [
        { label: "\u5B58\u94B1\u91D1\u989D", data: dataArr, color: MelodiCharts.colors.primary },
      ]);
    }, 0);
    return html;
  }

  /* ===== 定投计划 ===== */
  function renderInvest() {
    var plans = MelodiDB.getList("investPlans");
    var records = MelodiDB.getList("investRecords");
    var now = new Date();
    var monthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    var monthInvest = records.filter(function (r) { return r.date && r.date.startsWith(monthKey); }).reduce(function (s, r) { return s + (r.amount || 0); }, 0);

    var html = '<div class="stat-grid">';
    html += statCard(plans.length + "个", "定投计划");
    html += statCard("\u00A5" + monthInvest, "本月投入");
    html += statCard("\u00A5" + records.reduce(function (s, r) { return s + (r.amount || 0); }, 0), "累计投入");
    html += "</div>";

    // 定投计划管理
    html += '<div class="card"><div class="card-header"><div class="card-title">定投计划</div>';
    html += '<button class="btn btn-secondary btn-sm" id="addInvestPlan">添加</button></div>';
    if (plans.length === 0) {
      html += '<div class="empty-state-text" style="padding:12px;text-align:center;">暂无定投计划</div>';
    } else {
      plans.forEach(function (p) {
        html += '<div class="record-item">';
        html += '<div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + escapeHtml(p.name) + "</div>";
        html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">¥' + p.amount + " / " + (p.frequency || "每月") + "</div></div>";
        html += '<button class="btn btn-primary btn-sm invest-record-btn" data-plan="' + p.id + '" data-name="' + escapeHtml(p.name) + '" data-amount="' + p.amount + '">记一笔</button>';
        html += '<div class="task-delete" data-id="' + p.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></div>';
        html += "</div>";
      });
    }
    html += "</div>";

    // 定投记录
    html += '<div class="card"><div class="card-header"><div class="card-title">定投记录 (最近10条)</div></div>';
    var recent = records.slice(0, 10);
    if (recent.length === 0) {
      html += '<div class="empty-state-text" style="padding:12px;text-align:center;">暂无定投记录</div>';
    } else {
      recent.forEach(function (r) {
        html += '<div class="record-item">';
        html += '<div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + escapeHtml(r.planName || "\u5B9A\u6295") + " \u00A5" + r.amount + "</div>";
        html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + (r.date || "") + "</div></div>";
        html += "</div>";
      });
    }
    html += "</div>";

    // 月度图表
    html += '<div class="card"><div class="card-header"><div class="card-title">定投月度趋势</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="investChart"></canvas></div></div>';

    setTimeout(function () {
      var addBtn = document.getElementById("addInvestPlan");
      if (addBtn) addBtn.addEventListener("click", function () {
        var name = prompt("基金/标的名称：");
        if (!name || !name.trim()) return;
        var amount = prompt("每期金额：");
        var freq = prompt("频率（如 每周/每两周/每月）：", "每月");
        MelodiDB.addToList("investPlans", { name: name.trim(), amount: parseFloat(amount) || 0, frequency: freq || "每月" });
        App.showReminder("定投计划已添加", "success");
        App.renderPage("invest");
      });

      document.querySelectorAll(".invest-record-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var name = this.dataset.name;
          var amount = parseFloat(this.dataset.amount);
          MelodiDB.addToList("investRecords", { planName: name, amount: amount, date: MelodiDB.todayKey() });
          App.showReminder(name + " 定投已记录 \u00A5" + amount, "success");
          App.renderPage("invest");
        });
      });

      document.querySelectorAll("#investPlans .task-delete, .record-item .task-delete").forEach(function (del) {
        del.addEventListener("click", function () {
          MelodiDB.removeFromList("investPlans", this.dataset.id);
          App.renderPage("invest");
        });
      });

      // 图表
      var labels = [];
      var dataArr = [];
      for (var i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var mk = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        var total = records.filter(function (r) { return r.date && r.date.startsWith(mk); }).reduce(function (s, r) { return s + (r.amount || 0); }, 0);
        labels.push((d.getMonth() + 1) + "\u6708");
        dataArr.push(total);
      }
      MelodiCharts.lineChart("investChart", labels, [
        { label: "\u5B9A\u6295\u91D1\u989D", data: dataArr, color: MelodiCharts.colors.green, fillColor: MelodiCharts.colors.greenBg },
      ]);
    }, 0);
    return html;
  }

  /* ===== 时政热点 ===== */
  function renderNews() {
    var data = MelodiDB.getDayData("news") || {};
    var notes = data.notes || "";
    var monthData = MelodiDB.getMonthData("news");
    var noteDays = Object.keys(monthData).filter(function (k) { return monthData[k] && monthData[k].notes && monthData[k].notes.trim(); }).length;

    var html = '<div class="stat-grid">';
    html += statCard(noteDays + "天", "本月记录");
    html += statCard(MelodiDB.getList("newsHighlights").length + "条", "重要事件");
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">今日时政笔记</div></div>';
    html += '<textarea class="form-textarea" id="newsNotes" rows="8" placeholder="记录今日重要时政热点、政策变化、国际动态...">' + escapeHtml(notes) + "</textarea>";
    html += '<button class="btn btn-primary btn-sm" id="saveNewsNotes" style="margin-top:8px;">保存</button>';
    html += "</div>";

    html += '<div class="card"><div class="card-header"><div class="card-title">重要事件标记</div>';
    html += '<button class="btn btn-secondary btn-sm" id="addNewsHighlight">添加</button></div>';
    html += '<div id="newsHighlightList"></div></div>';

    setTimeout(function () {
      var saveBtn = document.getElementById("saveNewsNotes");
      if (saveBtn) saveBtn.addEventListener("click", function () {
        MelodiDB.updateDayData("news", { notes: document.getElementById("newsNotes").value });
        App.showReminder("已保存", "success");
      });
      var addBtn = document.getElementById("addNewsHighlight");
      if (addBtn) addBtn.addEventListener("click", function () {
        var title = prompt("事件标题：");
        if (!title || !title.trim()) return;
        var cat = prompt("分类（如 政策/经济/国际/科技）：", "政策");
        MelodiDB.addToList("newsHighlights", { title: title.trim(), category: cat || "其他", date: MelodiDB.todayKey() });
        renderNewsHighlights();
      });
      renderNewsHighlights();
    }, 0);
    return html;
  }

  function renderNewsHighlights() {
    var container = document.getElementById("newsHighlightList");
    if (!container) return;
    var items = MelodiDB.getList("newsHighlights").slice(0, 20);
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state-text" style="padding:12px;text-align:center;">暂无重要事件</div>';
      return;
    }
    container.innerHTML = items.map(function (h) {
      return '<div class="record-item">' +
        '<span style="font-size:var(--font-size-xs);padding:2px 8px;background:var(--melodi-pink-100);color:var(--melodi-pink-700);border-radius:var(--radius-sm);margin-right:8px;">' + escapeHtml(h.category || "其他") + "</span>" +
        '<div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + escapeHtml(h.title) + "</div>" +
        '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + (h.date || "") + "</div></div>" +
        '<div class="task-delete" data-id="' + h.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></div>' +
        "</div>";
    }).join("");
    container.querySelectorAll(".task-delete").forEach(function (del) {
      del.addEventListener("click", function () {
        MelodiDB.removeFromList("newsHighlights", this.dataset.id);
        renderNewsHighlights();
      });
    });
  }

  /* ===== 考公上岸 ===== */
  function renderExam() {
    var settings = MelodiDB.getSettings();
    var examDate = settings.examDate || "";
    var subjects = MelodiDB.getList("examSubjects");
    var todayData = MelodiDB.getDayData("exam") || {};
    var todayMin = todayData.studyMinutes || 0;

    // 倒计时
    var countdown = "";
    if (examDate) {
      var diff = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
      countdown = diff > 0 ? diff + "天" : diff === 0 ? "今天" : "已过";
    }

    var html = '<div class="stat-grid">';
    html += statCard(countdown || "未设置", "距考试");
    html += statCard(todayMin + "min", "今日学习");
    html += statCard(subjects.length + "科", "备考科目");
    html += "</div>";

    // 考试日期设置
    html += '<div class="card"><div class="card-header"><div class="card-title">考试日期</div></div>';
    html += '<div class="form-row">';
    html += '<input type="date" class="form-input" id="examDateInput" value="' + examDate + '">';
    html += '<button class="btn btn-primary btn-sm" id="saveExamDate">设置</button>';
    html += "</div></div>";

    // 今日学习打卡
    html += '<div class="card"><div class="card-header"><div class="card-title">今日学习打卡</div></div>';
    html += '<div class="form-row" style="align-items:flex-end;">';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">学习时长 (分钟)</label>';
    html += '<input type="number" class="form-input" id="examMinutes" value="' + todayMin + '" min="0" step="15" style="width:100px;"></div>';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">科目</label>';
    html += '<select class="form-select" id="examSubject" style="width:140px;">';
    if (subjects.length === 0) {
      html += '<option value="">\u8BF7\u5148\u6DFB\u52A0\u79D1\u76EE</option>';
    } else {
      subjects.forEach(function (s) { html += '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + "</option>"; });
    }
    html += "</select></div>";
    html += '<button class="btn btn-primary" id="saveExamStudy">记录</button>';
    html += "</div></div>";

    // 科目管理
    html += '<div class="card"><div class="card-header"><div class="card-title">备考科目</div>';
    html += '<button class="btn btn-secondary btn-sm" id="addExamSubject">添加</button></div>';
    if (subjects.length === 0) {
      html += '<div class="empty-state-text" style="padding:12px;text-align:center;">暂无科目</div>';
    } else {
      subjects.forEach(function (s) {
        html += '<div class="record-item"><div style="flex:1;"><div style="font-size:var(--font-size-sm);font-weight:500;">' + escapeHtml(s.name) + "</div>";
        html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + (s.note || "") + "</div></div>";
        html += '<div class="task-delete" data-id="' + s.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></div></div>';
      });
    }
    html += "</div>";

    // 学习时长趋势
    html += '<div class="card"><div class="card-header"><div class="card-title">学习时长趋势</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="examChart"></canvas></div></div>';

    setTimeout(function () {
      var dateBtn = document.getElementById("saveExamDate");
      if (dateBtn) dateBtn.addEventListener("click", function () {
        MelodiDB.setSettings({ examDate: document.getElementById("examDateInput").value });
        App.showReminder("考试日期已设置", "success");
        App.renderPage("exam");
      });
      var studyBtn = document.getElementById("saveExamStudy");
      if (studyBtn) studyBtn.addEventListener("click", function () {
        var min = parseInt(document.getElementById("examMinutes").value) || 0;
        var subj = document.getElementById("examSubject").value;
        var d = MelodiDB.getDayData("exam") || {};
        d.studyMinutes = min;
        if (subj) d.lastSubject = subj;
        MelodiDB.setDayData("exam", d);
        App.showReminder("学习记录已保存", "success");
        App.renderPage("exam");
      });
      var addSubjBtn = document.getElementById("addExamSubject");
      if (addSubjBtn) addSubjBtn.addEventListener("click", function () {
        var name = prompt("科目名称：");
        if (!name || !name.trim()) return;
        var note = prompt("备注（可选）：");
        MelodiDB.addToList("examSubjects", { name: name.trim(), note: note || "" });
        App.renderPage("exam");
      });
      document.querySelectorAll("#exam .task-delete, .record-item .task-delete").forEach(function (del) {
        del.addEventListener("click", function () {
          MelodiDB.removeFromList("examSubjects", this.dataset.id);
          App.renderPage("exam");
        });
      });

      // 图表
      var monthData = MelodiDB.getMonthData("exam");
      var now = new Date();
      var labels = [];
      var dataArr = [];
      for (var i = 1; i <= now.getDate(); i++) {
        labels.push(i + "\u65E5");
        var dk = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
        var d = monthData[dk];
        dataArr.push(d && d.studyMinutes ? d.studyMinutes : 0);
      }
      MelodiCharts.lineChart("examChart", labels, [
        { label: "\u5B66\u4E60\u65F6\u957F", data: dataArr, color: MelodiCharts.colors.purple, fillColor: MelodiCharts.colors.purpleBg },
      ]);
    }, 0);
    return html;
  }

  /* ===== 语言学习 ===== */
  function renderLanguage() {
    var settings = MelodiDB.getSettings();
    var lang = settings.currentLang || "日语";
    var todayData = MelodiDB.getDayData("language_" + lang) || {};
    var todayMin = todayData.studyMinutes || 0;
    var monthData = MelodiDB.getMonthData("language_" + lang);

    var langs = ["日语", "韩语", "法语", "德语", "西班牙语", "其他"];
    var totalMin = 0;
    Object.keys(monthData).forEach(function (k) {
      if (monthData[k] && monthData[k].studyMinutes) totalMin += monthData[k].studyMinutes;
    });

    var html = '<div class="stat-grid">';
    html += statCard(lang, "当前语言");
    html += statCard(todayMin + "min", "今日学习");
    html += statCard(totalMin + "min", "本月累计");
    html += statCard(Math.round(totalMin / 30) + "min", "日均");
    html += "</div>";

    // 语言选择
    html += '<div class="card"><div class="card-header"><div class="card-title">选择语言</div></div>';
    html += '<div class="form-row">';
    html += '<select class="form-select" id="langSelect" style="flex:1;">';
    langs.forEach(function (l) {
      html += '<option value="' + l + '"' + (l === lang ? " selected" : "") + ">" + l + "</option>";
    });
    html += "</select>";
    html += '<button class="btn btn-primary btn-sm" id="switchLang">切换</button>';
    html += "</div></div>";

    // 学习打卡
    html += '<div class="card"><div class="card-header"><div class="card-title">今日学习打卡</div></div>';
    html += '<div class="form-row" style="align-items:flex-end;">';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">学习时长 (分钟)</label>';
    html += '<input type="number" class="form-input" id="langMinutes" value="' + todayMin + '" min="0" step="5" style="width:100px;"></div>';
    html += '<div class="form-group" style="margin-bottom:0;"><label class="form-label">学习内容</label>';
    html += '<input type="text" class="form-input" id="langContent" placeholder="如 语法练习/听力/单词" value="' + escapeHtml(todayData.content || "") + '" style="width:200px;"></div>';
    html += '<button class="btn btn-primary" id="saveLangStudy">记录</button>';
    html += "</div></div>";

    // 趋势图
    html += '<div class="card"><div class="card-header"><div class="card-title">' + lang + '学习时长趋势</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="languageChart"></canvas></div></div>';

    setTimeout(function () {
      var switchBtn = document.getElementById("switchLang");
      if (switchBtn) switchBtn.addEventListener("click", function () {
        var newLang = document.getElementById("langSelect").value;
        MelodiDB.setSettings({ currentLang: newLang });
        App.showReminder("已切换到" + newLang, "success");
        App.renderPage("language");
      });
      var saveBtn = document.getElementById("saveLangStudy");
      if (saveBtn) saveBtn.addEventListener("click", function () {
        var min = parseInt(document.getElementById("langMinutes").value) || 0;
        var content = document.getElementById("langContent").value;
        MelodiDB.setDayData("language_" + lang, { studyMinutes: min, content: content });
        App.showReminder("学习记录已保存", "success");
        App.renderPage("language");
      });

      // 图表
      var now = new Date();
      var labels = [];
      var dataArr = [];
      for (var i = 1; i <= now.getDate(); i++) {
        labels.push((now.getMonth() + 1) + "/" + i);
        var dk = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0");
        var d = monthData[dk];
        dataArr.push(d && d.studyMinutes ? d.studyMinutes : 0);
      }
      MelodiCharts.lineChart("languageChart", labels, [
        { label: lang + "\u5B66\u4E60\u65F6\u957F", data: dataArr, color: MelodiCharts.colors.teal, fillColor: MelodiCharts.colors.tealBg },
      ]);
    }, 0);
    return html;
  }

  /* ===== 设置页面 ===== */
  function renderSettings() {
    var settings = MelodiDB.getSettings();
    var syncInfo = MelodiDB.getSyncStatus();
    var storageSize = MelodiDB.getStorageSize();

    var html = "";

    // 云端同步状态
    html += '<div class="card" style="background:linear-gradient(135deg,var(--melodi-pink-100),var(--melodi-pink-50));border:none;">';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    var statusColor = syncInfo.status === "online" ? "var(--color-success)" : syncInfo.status === "syncing" ? "var(--color-warning)" : "var(--text-tertiary)";
    html += '<div style="width:12px;height:12px;border-radius:50%;background:' + statusColor + ';"></div>';
    html += '<div><div style="font-size:var(--font-size-md);font-weight:600;color:var(--melodi-pink-700);">云端同步状态</div>';
    var statusText = { local: "本地存储中（未连接云端）", online: "云端已连接", offline: "离线模式", syncing: "同步中..." };
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);">' + (statusText[syncInfo.status] || "未知") + "</div></div></div>";
    if (syncInfo.lastSync) {
      html += '<div style="margin-top:8px;font-size:var(--font-size-xs);color:var(--text-tertiary);">上次同步：' + new Date(syncInfo.lastSync).toLocaleString("zh-CN") + "</div>";
    }
    html += '<div style="margin-top:4px;font-size:var(--font-size-xs);color:var(--text-tertiary);">设备ID：' + syncInfo.deviceId + "</div>";
    html += "</div>";

    // Supabase 配置
    html += '<div class="card"><div class="card-header"><div class="card-title">Supabase 云端配置</div></div>';
    html += '<div class="form-group"><label class="form-label">Supabase URL</label>';
    html += '<input type="text" class="form-input" id="supabaseUrlInput" placeholder="https://xxxxx.supabase.co" value="' + escapeHtml(settings.supabaseUrl || "") + '"></div>';
    html += '<div class="form-group"><label class="form-label">Supabase Anon Key</label>';
    html += '<input type="password" class="form-input" id="supabaseKeyInput" placeholder="eyJhbGciOi..." value="' + escapeHtml(settings.supabaseKey || "") + '"></div>';
    html += '<div class="flex gap-sm" style="margin-top:8px;">';
    html += '<button class="btn btn-primary btn-sm" id="connectSupabaseBtn">' + (syncInfo.connected ? "重新连接" : "连接云端") + "</button>";
    if (syncInfo.connected) {
      html += '<button class="btn btn-secondary btn-sm" id="syncNowBtn">立即同步</button>';
      html += '<button class="btn btn-ghost btn-sm" id="disconnectSupabaseBtn">断开</button>';
    }
    html += "</div>";
    html += '<div style="margin-top:8px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius-md);font-size:var(--font-size-xs);color:var(--text-secondary);line-height:1.6;">';
    html += "<b>\u914D\u7F6E\u6B65\u9AA4\uFF1A</b><br>1. \u524D\u5F80 supabase.com \u6CE8\u518C\u514D\u8D39\u8D26\u53F7<br>2. \u521B\u5EFA\u65B0\u9879\u76EE\uFF0C\u5728 SQL Editor \u4E2D\u6267\u884C\u5EFA\u8868 SQL\uFF08\u89C1\u90E8\u7F72\u6559\u7A0B\uFF09<br>3. \u5728 Settings > API \u4E2D\u590D\u5236 Project URL \u548C anon key<br>4. \u7C98\u8D34\u5230\u4E0A\u65B9\u8F93\u5165\u6846\uFF0C\u70B9\u51FB\u8FDE\u63A5";
    html += "</div></div>";

    // 数据管理
    html += '<div class="card"><div class="card-header"><div class="card-title">数据管理</div></div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="btn btn-secondary btn-sm" id="exportDataBtn">导出全部数据</button>';
    html += '<button class="btn btn-secondary btn-sm" id="importDataBtn">导入数据</button>';
    html += '<button class="btn btn-ghost btn-sm" id="clearDataBtn" style="color:var(--color-danger);">清空所有数据</button>';
    html += "</div>";
    html += '<div style="margin-top:12px;font-size:var(--font-size-xs);color:var(--text-tertiary);">本地存储占用：' + storageSize + " KB</div>";
    html += "</div>";

    // 个人信息
    html += '<div class="card"><div class="card-header"><div class="card-title">个人信息</div></div>';
    html += '<div class="form-group"><label class="form-label">生日（运势分析用）</label>';
    html += '<input type="date" class="form-input" id="birthdayInput" value="' + (settings.birthday || "2000-10-22") + '"></div>';
    html += '<div class="form-group"><label class="form-label">睡眠目标 (小时)</label>';
    html += '<input type="number" class="form-input" id="sleepTargetInput" value="' + (settings.sleepTarget || 7.5) + '" step="0.5" style="width:100px;"></div>';
    html += '<div class="form-group"><label class="form-label">饮水目标 (ml)</label>';
    html += '<input type="number" class="form-input" id="waterTargetInput" value="' + (settings.waterTarget || 2000) + '" step="100" style="width:120px;"></div>';
    html += '<button class="btn btn-primary btn-sm" id="savePersonalBtn">保存</button>';
    html += "</div>";

    // 关于
    html += '<div class="card" style="text-align:center;padding:24px;">';
    html += '<div style="font-size:var(--font-size-lg);font-weight:600;color:var(--melodi-pink-600);">\u7F8E\u4E50\u8482\u5DE5\u4F5C\u53F0</div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-top:4px;">v1.0 \u00B7 \u5927\u5973\u4E3B\u81EA\u6211\u7BA1\u7406\u7CFB\u7EDF</div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-top:8px;">\u9002\u914D ADHD \u00B7 \u624B\u673A+PC\u53CC\u7AEF \u00B7 PWA \u79BB\u7EBF\u53EF\u7528</div>';
    html += "</div>";

    setTimeout(function () {
      // Supabase 连接
      var connectBtn = document.getElementById("connectSupabaseBtn");
      if (connectBtn) connectBtn.addEventListener("click", function () {
        var url = document.getElementById("supabaseUrlInput").value.trim();
        var key = document.getElementById("supabaseKeyInput").value.trim();
        if (!url || !key) { App.showReminder("请填写 URL 和 Key", "warning"); return; }
        App.showReminder("正在连接...", "");
        var ok = MelodiDB.initSupabase(url, key);
        if (ok) {
          App.showReminder("云端连接成功", "success");
          setTimeout(function () { App.renderPage("settings"); }, 1000);
        } else {
          App.showReminder("连接失败，请检查配置", "warning");
        }
      });

      // 立即同步
      var syncBtn = document.getElementById("syncNowBtn");
      if (syncBtn) syncBtn.addEventListener("click", function () {
        App.showReminder("开始全量同步...", "");
        MelodiDB.fullSync().then(function (result) {
          App.showReminder(result.message, result.success ? "success" : "warning");
          if (result.success) App.renderPage("settings");
        });
      });

      // 断开
      var discBtn = document.getElementById("disconnectSupabaseBtn");
      if (discBtn) discBtn.addEventListener("click", function () {
        if (!confirm("确定断开云端连接吗？本地数据不会丢失。")) return;
        MelodiDB.disconnectSupabase();
        App.showReminder("已断开云端连接", "success");
        App.renderPage("settings");
      });

      // 导出
      var exportBtn = document.getElementById("exportDataBtn");
      if (exportBtn) exportBtn.addEventListener("click", function () {
        var data = MelodiDB.exportAll();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "melodi-backup-" + MelodiDB.todayKey() + ".json";
        a.click();
        URL.revokeObjectURL(url);
        App.showReminder("数据已导出", "success");
      });

      // 导入
      var importBtn = document.getElementById("importDataBtn");
      if (importBtn) importBtn.addEventListener("click", function () {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.addEventListener("change", function (e) {
          var file = e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function (ev) {
            try {
              var data = JSON.parse(ev.target.result);
              MelodiDB.importAll(data);
              App.showReminder("数据导入成功", "success");
              setTimeout(function () { location.reload(); }, 1000);
            } catch (err) {
              App.showReminder("导入失败：文件格式错误", "warning");
            }
          };
          reader.readAsText(file);
        });
        input.click();
      });

      // 清空
      var clearBtn = document.getElementById("clearDataBtn");
      if (clearBtn) clearBtn.addEventListener("click", function () {
        if (!confirm("\u26A0\uFE0F \u6B64\u64CD\u4F5C\u5C06\u6E05\u7A7A\u6240\u6709\u672C\u5730\u6570\u636E\uFF0C\u4E14\u4E0D\u53EF\u6062\u590D\uFF01\u786E\u5B9A\u5417\uFF1F")) return;
        if (!confirm("\u518D\u6B21\u786E\u8BA4\uFF1A\u6E05\u7A7A\u540E\u6240\u6709\u8BB0\u5F55\u3001\u6253\u5361\u3001\u4EFB\u52A1\u90FD\u5C06\u4E22\u5931\uFF01")) return;
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var k = localStorage.key(i);
          if (k && k.startsWith("melodi:")) localStorage.removeItem(k);
        }
        App.showReminder("所有数据已清空", "success");
        setTimeout(function () { location.reload(); }, 1000);
      });

      // 保存个人信息
      var savePersonalBtn = document.getElementById("savePersonalBtn");
      if (savePersonalBtn) savePersonalBtn.addEventListener("click", function () {
        MelodiDB.setSettings({
          birthday: document.getElementById("birthdayInput").value,
          sleepTarget: parseFloat(document.getElementById("sleepTargetInput").value) || 7.5,
          waterTarget: parseInt(document.getElementById("waterTargetInput").value) || 2000,
        });
        App.showReminder("个人信息已保存", "success");
      });
    }, 0);
    return html;
  }

  /* ===== 页面渲染入口 ===== */
  function renderPage(route) {
    var content = document.getElementById("content");
    if (!content) return;
    MelodiCharts.destroyAll();

    if (route.startsWith("custom_")) {
      content.innerHTML = renderCustomPage(route);
      setupCustomPageEvents(route);
      content.scrollTop = 0;
      return;
    }

    var renderer = pageRenderers[route] || function () { return DailyModule.render(); };
    content.innerHTML = renderer();
    content.scrollTop = 0;
  }

  function renderCustomPage(route) {
    var items = Sidebar.getNavItems();
    var item = items.find(function (i) { return i.route === route; });
    var label = item ? item.label : "自定义";
    var data = MelodiDB.getDayData("custom:" + route) || { content: "" };
    var html = '<div class="card"><div class="card-header"><div class="card-title">' + label + "</div></div>";
    html += '<textarea class="form-textarea" id="customContent" rows="15" placeholder="在这里记录...">' + escapeHtml(data.content || "") + "</textarea>";
    html += '<button class="btn btn-primary" id="saveCustomBtn" style="margin-top:8px;">保存</button>';
    html += "</div>";
    return html;
  }

  function setupCustomPageEvents(route) {
    var saveBtn = document.getElementById("saveCustomBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var content = document.getElementById("customContent").value;
        MelodiDB.setDayData("custom:" + route, { content: content });
        App.showReminder("已保存", "success");
      });
    }
  }

  /* ===== 灵感收纳 ===== */
  function setupInspiration() {
    var fab = document.getElementById("inspirationFab");
    var panel = document.getElementById("inspirationPanel");
    var saveBtn = document.getElementById("saveInspirationBtn");
    var input = document.getElementById("inspirationInput");

    if (fab) {
      fab.addEventListener("click", function () {
        panel.classList.toggle("show");
        if (panel.classList.contains("show")) {
          input.focus();
          renderInspirationList();
        }
      });
    }
    if (saveBtn && input) {
      var save = function () {
        var text = input.value.trim();
        if (!text) return;
        MelodiDB.addToList("inspirations", { text: text });
        input.value = "";
        renderInspirationList();
        App.showReminder("灵感已收纳", "success");
      };
      saveBtn.addEventListener("click", save);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.ctrlKey) save(); });
    }
  }

  function renderInspirationList() {
    var container = document.getElementById("inspirationList");
    if (!container) return;
    var items = MelodiDB.getList("inspirations").slice(0, 10);
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state-text" style="padding:8px;">还没有灵感记录</div>';
      return;
    }
    container.innerHTML = items.map(function (i) {
      var time = new Date(i.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      return '<div class="inspiration-entry"><span>' + escapeHtml(i.text) + '</span><span class="inspiration-time">' + time + "</span></div>";
    }).join("");
  }

  /* ===== 番茄钟 ===== */
  function setupPomodoro() {
    var fab = document.getElementById("pomodoroFab");
    var panel = document.getElementById("pomodoroPanel");
    var startBtn = document.getElementById("pomodoroStartBtn");
    var resetBtn = document.getElementById("pomodoroResetBtn");
    var durationInput = document.getElementById("pomodoroDuration");
    var settings = MelodiDB.getSettings();

    if (durationInput) durationInput.value = settings.pomodoroDuration || 25;
    if (fab) fab.addEventListener("click", function () { panel.classList.toggle("show"); });
    if (durationInput) {
      durationInput.addEventListener("change", function () {
        if (!pomodoroRunning) {
          var min = parseInt(durationInput.value) || 25;
          pomodoroRemaining = min * 60;
          updatePomodoroDisplay();
          MelodiDB.setSettings({ pomodoroDuration: min });
        }
      });
    }
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        if (pomodoroRunning) {
          clearInterval(pomodoroTimer);
          pomodoroRunning = false;
          startBtn.textContent = "继续";
          document.getElementById("pomodoroStatus").textContent = "已暂停";
        } else {
          if (pomodoroRemaining <= 0) {
            var min = parseInt(durationInput.value) || 25;
            pomodoroRemaining = min * 60;
          }
          pomodoroRunning = true;
          startBtn.textContent = "暂停";
          document.getElementById("pomodoroStatus").textContent = "专注中...";
          pomodoroTimer = setInterval(function () {
            pomodoroRemaining--;
            if (pomodoroRemaining <= 0) {
              clearInterval(pomodoroTimer);
              pomodoroRunning = false;
              startBtn.textContent = "开始";
              document.getElementById("pomodoroStatus").textContent = "专注完成！";
              App.showReminder("番茄钟完成", "success");
              pomodoroRemaining = (parseInt(durationInput.value) || 25) * 60;
            }
            updatePomodoroDisplay();
          }, 1000);
        }
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        clearInterval(pomodoroTimer);
        pomodoroRunning = false;
        var min = parseInt(durationInput.value) || 25;
        pomodoroRemaining = min * 60;
        startBtn.textContent = "开始";
        document.getElementById("pomodoroStatus").textContent = "设置时长开始专注";
        updatePomodoroDisplay();
      });
    }
    pomodoroRemaining = (settings.pomodoroDuration || 25) * 60;
    updatePomodoroDisplay();
  }

  function updatePomodoroDisplay() {
    var el = document.getElementById("pomodoroTime");
    if (!el) return;
    var m = Math.floor(pomodoroRemaining / 60);
    var s = pomodoroRemaining % 60;
    el.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  /* ===== 时钟 ===== */
  function startClock() {
    function update() {
      var now = new Date();
      var timeEl = document.getElementById("currentTime");
      var dateEl = document.getElementById("currentDate");
      if (timeEl) timeEl.textContent = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
      if (dateEl) {
        var weekdays = ["日", "一", "二", "三", "四", "五", "六"];
        dateEl.textContent = (now.getMonth() + 1) + "月" + now.getDate() + "日 周" + weekdays[now.getDay()];
      }
    }
    update();
    setInterval(update, 1000);
  }

  /* ===== 弹窗提醒 ===== */
  function showReminder(text, type) {
    var existing = document.querySelector(".reminder-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.className = "reminder-toast " + (type || "");
    toast.innerHTML = '<span class="reminder-icon">' + (type === "success" ? "&#10003;" : type === "warning" ? "!" : "&#9658;") + '</span><span class="reminder-text">' + text + "</span>";
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add("show"); }, 10);
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.remove(); }, 300);
    }, 2800);
  }

  /* ===== 提醒系统 ===== */
  var reminders = [
    { time: "07:30", message: "早起好！别忘了喝红参元", key: "ginseng" },
    { time: "09:00", message: "该喝水啦，第一杯水！", key: "water1" },
    { time: "11:00", message: "再喝一杯水", key: "water2" },
    { time: "12:30", message: "饭后别忘了吃保健品", key: "supplement" },
    { time: "14:00", message: "下午好，别忘了喝水", key: "water3" },
    { time: "16:00", message: "来一杯水，保持水分", key: "water4" },
    { time: "17:30", message: "运动时间到！今日训练打卡30-60分钟", key: "exercise" },
    { time: "19:00", message: "该背单词啦，30分钟打卡", key: "words" },
    { time: "19:30", message: "饭后别忘了吃保健品", key: "supplement2" },
    { time: "20:00", message: "晚间喝水打卡", key: "water5" },
    { time: "20:30", message: "练字时间到，15分钟打卡", key: "calligraphy" },
    { time: "21:00", message: "阅读时间到，30分钟打卡", key: "reading" },
    { time: "21:15", message: "今晚该敷面膜了", key: "mask" },
    { time: "21:30", message: "该泡脚了", key: "footbath" },
    { time: "22:00", message: "该准备休息了，今晚目标7.5小时", key: "sleep" },
    { time: "22:30", message: "睡前别忘了护肤打卡", key: "skincare" },
    { time: "22:45", message: "睡前可以听听sub或播客放松", key: "sub" },
  ];
  var lastReminderCheck = "";
  var firedReminders = {};

  function checkReminders() {
    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    if (timeStr === lastReminderCheck) return;
    lastReminderCheck = timeStr;
    var today = MelodiDB.todayKey();
    var reminderKey = today + "_" + timeStr;
    reminders.forEach(function (r) {
      if (r.time === timeStr && !firedReminders[reminderKey + "_" + r.key]) {
        firedReminders[reminderKey + "_" + r.key] = true;
        showReminder(r.message, "warning");
      }
    });

    // 睡眠不足多轮提醒
    var sleepData = MelodiDB.getDayData("sleep");
    if (sleepData && sleepData.duration && sleepData.duration < 7.5) {
      if (["20:00", "21:00", "21:30", "22:00"].includes(timeStr)) {
        var rKey = today + "_sleepwarn_" + timeStr;
        if (!firedReminders[rKey]) {
          firedReminders[rKey] = true;
          showReminder("昨晚睡眠仅 " + sleepData.duration.toFixed(1) + "h，今晚早点休息", "warning");
        }
      }
    }
  }

  /* ===== 工具 ===== */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* ===== 初始化 ===== */
  function init() {
    Sidebar.init();
    startClock();
    setupInspiration();
    setupPomodoro();
    // ADHD 专项支持：初始化音效解锁、专注浮层等
    if (window.MelodiADHD) MelodiADHD.init();
    // 自动初始化 Supabase（如果已配置）
    MelodiDB.autoInitSupabase();
    MelodiDB.updateSyncIndicator();
    var route = Sidebar.getCurrentRoute();
    renderPage(route);
    Sidebar.syncTitle(route); // 刷新后根据当前路由校正顶部标题
    setInterval(checkReminders, 60000);
    // 在线/离线状态监听
    window.addEventListener("online", function () {
      if (MelodiDB.isSupabaseConnected()) {
        MelodiDB.pullFromCloud();
      }
      App.showReminder("网络已恢复", "success");
    });
    window.addEventListener("offline", function () {
      App.showReminder("网络已断开，数据保存在本地", "warning");
    });
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(function (e) {
        console.warn("[App] SW 注册失败:", e);
      });
    }
  }

  return {
    init: init,
    renderPage: renderPage,
    showReminder: showReminder,
  };
})();

// 挂到 window，供 sidebar.js 通过 window.App 调用（const 声明不会自动挂 window）
window.App = App;

document.addEventListener("DOMContentLoaded", App.init);
