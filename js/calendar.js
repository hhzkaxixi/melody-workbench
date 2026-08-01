/* ============================================
   美乐蒂工作台 - 打卡日历 & 成长统计
   月历热力图 / 连续打卡天数 / 各项完成率
   ============================================ */

const MelodiCalendar = (function () {
  "use strict";

  /* 全站打卡项注册表：日历、完成率、连续天数都以此为准 */
  var CHECK_ITEMS = [
    { key: "reading", label: "阅读", icon: "\uD83D\uDCD6", module: "growth", freq: "daily" },
    { key: "calligraphy", label: "练字", icon: "\u270F\uFE0F", module: "growth", freq: "daily" },
    { key: "words", label: "背单词", icon: "\uD83D\uDD24", module: "growth", freq: "daily" },
    { key: "exercise", label: "运动", icon: "\uD83D\uDCAA", module: "exercise", freq: "daily" },
    { key: "supplement", label: "保健品", icon: "\uD83D\uDC8A", module: "wellness", freq: "daily" },
    { key: "ginseng", label: "红参元", icon: "\uD83E\uDED6", module: "wellness", freq: "daily" },
    { key: "footbath", label: "泡脚", icon: "\uD83E\uDDB6", module: "wellness", freq: "daily" },
    { key: "mask", label: "面膜", icon: "\uD83C\uDFAD", module: "skincare", freq: "alt" },
    { key: "clean_mask", label: "清洁护理", icon: "\uD83E\uDDF4", module: "skincare", freq: "weekly" },
    { key: "sub_podcast", label: "sub/播客", icon: "\uD83C\uDFA7", module: "leisure", freq: "daily" },
    { key: "perfume", label: "香水", icon: "\uD83C\uDF38", module: "leisure", freq: "daily" },
    { key: "movie", label: "观影", icon: "\uD83C\uDFAC", module: "leisure", freq: "weekly" },
    { key: "collection", label: "整理收藏", icon: "\uD83D\uDDC2\uFE0F", module: "leisure", freq: "weekly" },
  ];

  var MODULES = ["growth", "exercise", "wellness", "skincare", "leisure"];

  var viewYear = new Date().getFullYear();
  var viewMonth = new Date().getMonth(); // 0-11

  /* ===== 取某天的全部打卡状态（跨模块合并） ===== */
  function getDayCheckins(dateStr) {
    var merged = {};
    MODULES.forEach(function (m) {
      var d = MelodiDB.getDayData(m, dateStr);
      if (d && d.checkins) {
        Object.keys(d.checkins).forEach(function (k) {
          if (d.checkins[k]) merged[k] = true;
        });
      }
    });
    return merged;
  }

  /* 某天完成了几项（只统计每日项，避免周更项拉低数据） */
  function getDayScore(dateStr) {
    var c = getDayCheckins(dateStr);
    var dailyItems = CHECK_ITEMS.filter(function (i) { return i.freq === "daily"; });
    var done = 0;
    dailyItems.forEach(function (i) { if (c[i.key]) done++; });
    return { done: done, total: dailyItems.length, all: c };
  }

  /* ===== 连续打卡统计 ===== */
  /* 判定"这天算打卡"：至少完成 1 项 */
  function isActiveDay(dateStr) {
    return getDayScore(dateStr).done > 0;
  }

  function calcStreak() {
    var today = new Date();
    var current = 0;
    var cursor = new Date(today);

    // 今天没打卡不立刻断掉，从昨天继续往前数（今天还有机会）
    if (!isActiveDay(MelodiDB.dateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    // 往前连续数，最多回溯两年
    for (var i = 0; i < 730; i++) {
      if (isActiveDay(MelodiDB.dateKey(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    // 总天数 + 历史最长连续
    var total = 0, longest = 0, run = 0;
    var scan = new Date(today);
    scan.setDate(scan.getDate() - 729);
    for (var j = 0; j < 730; j++) {
      var k = MelodiDB.dateKey(scan);
      if (isActiveDay(k)) {
        total++;
        run++;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
      scan.setDate(scan.getDate() + 1);
    }

    return { current: current, longest: Math.max(longest, current), total: total };
  }

  /* ===== 各项完成率（本月） ===== */
  function calcRates(year, month) {
    var y = year !== undefined ? year : viewYear;
    var m = month !== undefined ? month : viewMonth;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var today = new Date();
    // 当月只统计到今天为止，未来的日子不算未完成
    var limit = (y === today.getFullYear() && m === today.getMonth())
      ? today.getDate() : daysInMonth;

    var stats = CHECK_ITEMS.map(function (item) {
      var done = 0;
      for (var d = 1; d <= limit; d++) {
        var key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        if (getDayCheckins(key)[item.key]) done++;
      }
      // 按频次折算应完成次数
      var expect = limit;
      if (item.freq === "alt") expect = Math.ceil(limit / 2);
      if (item.freq === "weekly") expect = Math.max(1, Math.ceil(limit / 7));
      var rate = expect > 0 ? Math.min(100, Math.round((done / expect) * 100)) : 0;
      return { key: item.key, label: item.label, icon: item.icon, done: done, expect: expect, rate: rate };
    });
    return stats;
  }

  /* ===== 渲染月历热力图 ===== */
  function renderGrid() {
    var y = viewYear, m = viewMonth;
    var firstDay = new Date(y, m, 1).getDay(); // 0=周日
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var todayStr = MelodiDB.todayKey();

    var html = '<div class="cal-weekdays">';
    ["日", "一", "二", "三", "四", "五", "六"].forEach(function (w) {
      html += '<div class="cal-weekday">' + w + "</div>";
    });
    html += "</div>";

    html += '<div class="cal-grid">';
    // 月初空格
    for (var i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

    for (var d = 1; d <= daysInMonth; d++) {
      var key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var score = getDayScore(key);
      var pct = score.total > 0 ? score.done / score.total : 0;
      // 5 档热力：完成越多颜色越深
      var level = 0;
      if (pct > 0) level = 1;
      if (pct >= 0.25) level = 2;
      if (pct >= 0.5) level = 3;
      if (pct >= 0.75) level = 4;
      if (pct >= 1) level = 5;

      var cls = "cal-cell lv" + level;
      if (key === todayStr) cls += " today";
      if (key > todayStr) cls += " future";

      html += '<div class="' + cls + '" data-date="' + key + '" title="' + key + " · 完成 " + score.done + "/" + score.total + '">';
      html += '<span class="cal-day">' + d + "</span>";
      if (score.done > 0) html += '<span class="cal-dot">' + score.done + "</span>";
      html += "</div>";
    }
    html += "</div>";
    return html;
  }

  /* ===== 完整页面 ===== */
  function render() {
    var streak = calcStreak();
    var rates = calcRates();
    var monthLabel = viewYear + " 年 " + (viewMonth + 1) + " 月";

    var html = "";

    // 连续打卡三大指标
    html += '<div class="card streak-card">';
    html += '<div class="streak-row">';
    html += '<div class="streak-item"><div class="streak-num">' + streak.current + '</div><div class="streak-label">当前连续</div></div>';
    html += '<div class="streak-item"><div class="streak-num">' + streak.longest + '</div><div class="streak-label">最长连续</div></div>';
    html += '<div class="streak-item"><div class="streak-num">' + streak.total + '</div><div class="streak-label">累计打卡</div></div>';
    html += "</div>";
    var encourage = streak.current === 0
      ? "今天打个卡，重新开始连击 🎀"
      : streak.current < 3
        ? "已经连续 " + streak.current + " 天，继续保持"
        : streak.current < 7
          ? "连续 " + streak.current + " 天，习惯正在成形"
          : "连续 " + streak.current + " 天，你很了不起 ✨";
    html += '<div class="streak-encourage">' + encourage + "</div>";
    html += "</div>";

    // 月历
    html += '<div class="card">';
    html += '<div class="card-header">';
    html += '<div class="card-title">打卡日历</div>';
    html += '<div class="cal-nav">';
    html += '<button class="btn btn-ghost btn-sm" id="calPrev">‹</button>';
    html += '<span class="cal-month">' + monthLabel + "</span>";
    html += '<button class="btn btn-ghost btn-sm" id="calNext">›</button>';
    html += "</div>";
    html += "</div>";
    html += renderGrid();
    html += '<div class="cal-legend"><span>少</span>';
    for (var l = 1; l <= 5; l++) html += '<i class="cal-legend-box lv' + l + '"></i>';
    html += "<span>多</span></div>";
    html += '<div class="cal-detail" id="calDetail">点击日期查看当天完成的项目</div>';
    html += "</div>";

    // 各项完成率
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">本月各项完成率</div></div>';
    html += '<div class="rate-list">';
    rates.forEach(function (r) {
      var barCls = r.rate >= 80 ? "high" : r.rate >= 50 ? "mid" : "low";
      html += '<div class="rate-row">';
      html += '<div class="rate-name">' + r.icon + " " + r.label + "</div>";
      html += '<div class="rate-bar"><div class="rate-bar-fill ' + barCls + '" style="width:' + r.rate + '%"></div></div>';
      html += '<div class="rate-val">' + r.rate + "%</div>";
      html += '<div class="rate-sub">' + r.done + "/" + r.expect + "</div>";
      html += "</div>";
    });
    html += "</div></div>";

    // 近 30 天完成趋势
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">近 30 天完成项数趋势</div></div>';
    html += '<div class="chart-box"><canvas id="calTrendChart"></canvas></div>';
    html += "</div>";

    setTimeout(afterRender, 0);
    return html;
  }

  function afterRender() {
    var prev = document.getElementById("calPrev");
    var next = document.getElementById("calNext");
    if (prev) prev.addEventListener("click", function () {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      rerender();
    });
    if (next) next.addEventListener("click", function () {
      var now = new Date();
      // 不允许翻到未来月份
      if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return;
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      rerender();
    });

    // 点击日期看当天明细
    var cells = document.querySelectorAll(".cal-cell[data-date]");
    Array.prototype.forEach.call(cells, function (cell) {
      cell.addEventListener("click", function () {
        var date = cell.getAttribute("data-date");
        var c = getDayCheckins(date);
        var doneList = CHECK_ITEMS.filter(function (i) { return c[i.key]; });
        var box = document.getElementById("calDetail");
        if (!box) return;
        if (doneList.length === 0) {
          box.innerHTML = '<strong>' + date + "</strong> 这天还没有打卡记录";
        } else {
          box.innerHTML = '<strong>' + date + "</strong> 完成 " + doneList.length + " 项：" +
            doneList.map(function (i) { return '<span class="cal-tag">' + i.icon + " " + i.label + "</span>"; }).join("");
        }
        Array.prototype.forEach.call(cells, function (c2) { c2.classList.remove("selected"); });
        cell.classList.add("selected");
      });
    });

    drawTrend();
  }

  function rerender() {
    var content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = render();
    afterRender();
  }

  function drawTrend() {
    if (typeof MelodiCharts === "undefined") return;
    var keys = MelodiDB.getLastNKeys(30);
    var labels = keys.map(function (k) { return k.slice(5); });
    var values = keys.map(function (k) { return getDayScore(k).done; });
    MelodiCharts.lineChart("calTrendChart", labels, [
      { label: "当日完成项数", data: values },
    ]);
  }

  return {
    render: render,
    afterRender: afterRender,
    calcStreak: calcStreak,
    calcRates: calcRates,
    getDayCheckins: getDayCheckins,
    getDayScore: getDayScore,
    CHECK_ITEMS: CHECK_ITEMS,
  };
})();
