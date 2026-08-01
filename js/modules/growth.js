/* ============================================
   美乐蒂工作台 - 自我提升模块
   阅读打卡 · 练字打卡 · 单词背诵 · 计时 · 可视化
   ============================================ */

const GrowthModule = (function () {
  var studyState = {
    type: null,
    elapsed: 0,
    target: 0,
    running: false,
    intervalId: null,
  };

  var targets = {
    reading: 30,
    calligraphy: 15,
    words: 30,
  };

  var labels = {
    reading: "阅读",
    calligraphy: "练字",
    words: "单词",
  };

  function render() {
    var html = '<div class="tabs" id="growthTabs">';
    html += '<div class="tab active" data-tab="reading">阅读打卡</div>';
    html += '<div class="tab" data-tab="calligraphy">练字打卡</div>';
    html += '<div class="tab" data-tab="words">单词背诵</div>';
    html += "</div>";

    html += '<div class="tab-panel active" data-panel="reading">' + renderReadingTab() + "</div>";
    html += '<div class="tab-panel" data-panel="calligraphy">' + renderTimerTab("calligraphy") + "</div>";
    html += '<div class="tab-panel" data-panel="words">' + renderTimerTab("words") + "</div>";

    setTimeout(setupEvents, 0);
    return html;
  }

  /* ===== 阅读打卡 ===== */
  function renderReadingTab() {
    var growthData = MelodiDB.getDayData("growth") || {};
    var todayMin = growthData.readingMinutes || 0;
    var books = MelodiDB.getList("books");
    var readCount = books.filter(function (b) { return b.read; }).length;
    var target = targets.reading;
    var pct = Math.min(100, (todayMin / target) * 100);

    var html = "";

    // 今日阅读概览
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + todayMin + "min</div><div class=\"stat-label\">今日阅读</div></div>";
    html += '<div class="stat-card"><div class="stat-value">' + readCount + "/" + books.length + "</div><div class=\"stat-label\">书单完成</div></div>";
    html += '<div class="stat-card"><div class="stat-value">' + target + "min</div><div class=\"stat-label\">每日目标</div></div>";
    html += "</div>";

    // 计时器
    html += renderTimerCard("reading", target, todayMin, pct);

    // 阅读书单
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">阅读书单</div>';
    html += '<span style="font-size:var(--font-size-xs);color:var(--text-tertiary);">月度目标至少1本</span></div>';
    html += '<div class="form-row" style="margin-bottom:12px;align-items:flex-end;">';
    html += '<div class="form-group" style="flex:1;margin-bottom:0;"><input type="text" class="form-input" id="bookTitle" placeholder="书名..." /></div>';
    html += '<div class="form-group" style="flex:1;margin-bottom:0;"><input type="text" class="form-input" id="bookAuthor" placeholder="作者（可选）..." /></div>';
    html += '<button class="btn btn-primary" id="addBookBtn">添加</button>';
    html += "</div>";

    if (books.length === 0) {
      html += '<div class="empty-state" style="padding:20px;"><div class="empty-state-text">还没有书单，添加一本开始阅读吧</div></div>';
    } else {
      html += '<div id="bookList">';
      books.forEach(function (b) {
        html += '<div class="book-item' + (b.read ? " read" : "") + '" data-id="' + b.id + '">';
        html += '<div class="book-info">';
        html += '<div class="book-title">' + escapeHtml(b.title) + "</div>";
        if (b.author) html += '<div class="book-author">' + escapeHtml(b.author) + "</div>";
        html += "</div>";
        html += '<div class="book-actions">';
        html += '<button class="btn ' + (b.read ? "btn-ghost" : "btn-secondary") + ' btn-sm book-toggle-btn" data-id="' + b.id + '">' + (b.read ? "已读完" : "标记读完") + "</button>";
        html += '<button class="btn btn-ghost btn-sm book-delete-btn" data-id="' + b.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>';
        html += "</div></div>";
      });
      html += "</div>";
    }
    html += "</div>";

    // 月度阅读曲线
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">本月阅读时长</div></div>';
    html += '<div class="chart-canvas-wrap"><canvas id="readingChart"></canvas></div>';
    html += "</div>";

    return html;
  }

  /* ===== 通用计时标签页（练字/单词）===== */
  function renderTimerTab(type) {
    var growthData = MelodiDB.getDayData("growth") || {};
    var key = type + "Minutes";
    var todayMin = growthData[key] || 0;
    var target = targets[type];
    var pct = Math.min(100, (todayMin / target) * 100);

    var html = "";

    // 概览
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + todayMin + "min</div><div class=\"stat-label\">今日" + labels[type] + "</div></div>";
    html += '<div class="stat-card"><div class="stat-value">' + target + "min</div><div class=\"stat-label\">每日目标</div></div>";
    html += '<div class="stat-card"><div class="stat-value">' + (pct >= 100 ? "已达标" : Math.round(pct) + "%") + "</div><div class=\"stat-label\">完成进度</div></div>";
    html += "</div>";

    // 计时器
    html += renderTimerCard(type, target, todayMin, pct);

    // 月度曲线
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">本月' + labels[type] + "时长</div></div>";
    html += '<div class="chart-canvas-wrap"><canvas id="' + type + 'Chart"></canvas></div>';
    html += "</div>";

    if (type === "words") {
      html += '<div style="padding:12px 16px;background:var(--melodi-pink-50);border-radius:var(--radius-md);font-size:var(--font-size-xs);color:var(--melodi-pink-600);">数据与侧边栏「英语学习」板块互通</div>';
    }

    return html;
  }

  /* ===== 计时器卡片 ===== */
  function renderTimerCard(type, target, todayMin, pct) {
    var isRunning = studyState.running && studyState.type === type;
    var display = isRunning ? formatTime(studyState.elapsed) : "00:00";

    var html = '<div class="card" style="text-align:center;">';
    html += '<div class="card-header"><div class="card-title">' + labels[type] + "计时</div></div>";
    html += '<div class="study-timer-display' + (isRunning ? " running" : "") + '" id="' + type + 'TimerDisplay">' + display + "</div>";
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-top:4px;">目标 ' + target + " 分钟</div>";

    // 进度条
    html += '<div class="progress-bar" style="margin-top:12px;"><div class="progress-fill' + (pct >= 100 ? " complete" : "") + '" style="width:' + pct + '%"></div></div>';
    html += '<div class="progress-label"><span>今日 ' + todayMin + "min / " + target + "min</span><span>" + (pct >= 100 ? "已达标" : Math.round(pct) + "%") + "</span></div>";

    // 按钮
    html += '<div class="pomodoro-controls" style="margin-top:12px;">';
    html += '<button class="btn btn-primary btn-sm study-start-btn" data-type="' + type + '" data-target="' + target + '">' + (isRunning ? "暂停" : "开始") + "</button>";
    if (isRunning) {
      html += '<button class="btn btn-secondary btn-sm study-stop-btn" data-type="' + type + '">结束并保存</button>';
    }
    html += "</div></div>";
    return html;
  }

  /* ===== 事件绑定 ===== */
  function setupEvents() {
    // 标签切换
    document.querySelectorAll("#growthTabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll("#growthTabs .tab").forEach(function (t) { t.classList.remove("active"); });
        this.classList.add("active");
        document.querySelectorAll("[data-panel]").forEach(function (p) { p.classList.remove("active"); });
        document.querySelector('[data-panel="' + this.dataset.tab + '"]').classList.add("active");
        renderCharts();
      });
    });

    // 计时器
    document.querySelectorAll(".study-start-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var type = this.dataset.type;
        var target = parseInt(this.dataset.target);
        if (studyState.running && studyState.type === type) {
          pauseTimer();
        } else {
          startTimer(type, target);
        }
      });
    });
    document.querySelectorAll(".study-stop-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        stopTimer(false);
      });
    });

    // 书单
    setupBookEvents();

    // 图表
    renderCharts();
  }

  /* === 书单事件 === */
  function setupBookEvents() {
    var addBtn = document.getElementById("addBookBtn");
    var titleInput = document.getElementById("bookTitle");
    var authorInput = document.getElementById("bookAuthor");

    if (addBtn && titleInput) {
      var addBook = function () {
        var title = titleInput.value.trim();
        if (!title) return;
        var author = authorInput ? authorInput.value.trim() : "";
        MelodiDB.addToList("books", { title: title, author: author, read: false });
        titleInput.value = "";
        if (authorInput) authorInput.value = "";
        App.renderPage("growth");
        App.showReminder("已添加到书单", "success");
      };
      addBtn.addEventListener("click", addBook);
      if (titleInput) titleInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addBook(); });
    }

    document.querySelectorAll(".book-toggle-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.dataset.id;
        var book = MelodiDB.getList("books").find(function (b) { return b.id === id; });
        if (book) {
          MelodiDB.updateInList("books", id, { read: !book.read, finishedAt: !book.read ? new Date().toISOString() : null });
          App.renderPage("growth");
          App.showReminder(!book.read ? "恭喜读完一本！" : "已取消标记", "success");
        }
      });
    });

    document.querySelectorAll(".book-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        MelodiDB.removeFromList("books", this.dataset.id);
        App.renderPage("growth");
      });
    });
  }

  /* === 计时器逻辑 === */
  function startTimer(type, targetMinutes) {
    if (studyState.running) {
      stopTimer(false);
    }
    studyState.type = type;
    studyState.target = targetMinutes * 60;
    studyState.elapsed = 0;
    studyState.running = true;
    studyState.intervalId = setInterval(function () {
      studyState.elapsed++;
      updateTimerDisplay(type);
      if (studyState.elapsed >= studyState.target) {
        stopTimer(true);
      }
    }, 1000);
    App.renderPage("growth");
  }

  function pauseTimer() {
    if (studyState.intervalId) {
      clearInterval(studyState.intervalId);
      studyState.intervalId = null;
    }
    studyState.running = false;
    App.renderPage("growth");
  }

  function stopTimer(reachedTarget) {
    if (studyState.intervalId) {
      clearInterval(studyState.intervalId);
      studyState.intervalId = null;
    }
    studyState.running = false;

    if (studyState.elapsed > 0 && studyState.type) {
      var minutes = Math.max(1, Math.round(studyState.elapsed / 60));
      var key = studyState.type + "Minutes";
      var data = MelodiDB.getDayData("growth") || {};
      var existing = data[key] || 0;
      data[key] = existing + minutes;
      if (!data.checkins) data.checkins = {};
      data.checkins[studyState.type] = true;
      MelodiDB.setDayData("growth", data);

      var label = labels[studyState.type] || "";
      if (reachedTarget) {
        App.showReminder(label + "目标达成！+" + minutes + "分钟", "success");
      } else {
        App.showReminder("已保存 " + minutes + " 分钟" + label, "success");
      }
    }

    studyState.elapsed = 0;
    studyState.type = null;
    App.renderPage("growth");
  }

  function updateTimerDisplay(type) {
    var el = document.getElementById(type + "TimerDisplay");
    if (el) el.textContent = formatTime(studyState.elapsed);
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  /* ===== 图表渲染 ===== */
  function renderCharts() {
    var activeTab = document.querySelector("#growthTabs .tab.active");
    if (!activeTab) return;
    var tabName = activeTab.dataset.tab;

    var monthData = MelodiDB.getMonthData("growth");
    var now = new Date();
    var currentDay = now.getDate();
    var dateLabels = [];
    for (var i = 1; i <= currentDay; i++) {
      dateLabels.push((now.getMonth() + 1) + "/" + i);
    }

    var key = tabName + "Minutes";
    var data = dateLabels.map(function (_, i) {
      var day = i + 1;
      var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var d = monthData[dateKey];
      return d && d[key] ? d[key] : 0;
    });

    var canvasId = tabName === "reading" ? "readingChart" : tabName + "Chart";
    var color = tabName === "reading" ? MelodiCharts.colors.primary : tabName === "calligraphy" ? MelodiCharts.colors.purple : MelodiCharts.colors.blue;
    var bgColor = tabName === "reading" ? MelodiCharts.colors.primaryBg : tabName === "calligraphy" ? MelodiCharts.colors.purpleBg : MelodiCharts.colors.blueBg;

    MelodiCharts.lineChart(canvasId, dateLabels, [
      { label: labels[tabName] + "时长", data: data, color: color, fillColor: bgColor },
    ]);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  return { render: render, getState: function () { return studyState; } };
})();
