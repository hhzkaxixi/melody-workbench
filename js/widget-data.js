/* ============================================
   美乐蒂工作台 - 手机桌面小组件数据
   三分区：实时时间日期 · 当日打卡总览 · 中英励志短句
   ============================================ */

const WidgetData = (function () {
  var quotes = [
    { cn: "每一个微小的坚持，都是给未来自己的礼物。", en: "Every small persistence is a gift to your future self." },
    { cn: "不必着急，按照自己的节奏来。", en: "No need to rush, go at your own pace." },
    { cn: "今天的选择，决定明天的模样。", en: "Today's choices shape tomorrow's silhouette." },
    { cn: "温柔且有力量地活着。", en: "Live gently but with strength." },
    { cn: "小步前进，也是一种前进。", en: "Small steps forward are still steps forward." },
    { cn: "你值得拥有美好的一切。", en: "You deserve all the beautiful things." },
    { cn: "专注当下，未来自会明朗。", en: "Focus on the present, the future will become clear." },
    { cn: "做自己的太阳，无需借谁的光。", en: "Be your own sun, no need to borrow anyone's light." },
    { cn: "种一棵树最好的时间是十年前，其次是现在。", en: "The best time to plant a tree was 10 years ago, the second best is now." },
    { cn: "你不是在追赶谁，你是在成为自己。", en: "You're not chasing anyone, you're becoming yourself." },
    { cn: "慢慢来，比较快。", en: "Slow and steady wins the race." },
    { cn: "今天的努力，是明天的底气。", en: "Today's effort is tomorrow's confidence." },
    { cn: "自律的顶端是享受。", en: "The peak of self-discipline is enjoyment." },
    { cn: "把每一天都当作新的开始。", en: "Treat every day as a new beginning." },
    { cn: "你比你想象中更强大。", en: "You are stronger than you think." },
    { cn: "星光不问赶路人，时光不负有心人。", en: "Stars don't ask the traveler, time doesn't fail the dedicated." },
    { cn: "保持热爱，奔赴山海。", en: "Keep your passion, chase mountains and seas." },
    { cn: "所有的美好都在路上。", en: "All beautiful things are on the way." },
    { cn: "心有猛虎，细嗅蔷薇。", en: "In me the tiger sniffs the rose." },
    { cn: "愿你有前进的动力，也有回头的勇气。", en: "May you have the drive to move forward and the courage to look back." },
    { cn: "生活明朗，万物可爱。", en: "Life is bright, everything is lovely." },
    { cn: "向前走，别回头。", en: "Walk forward, don't look back." },
    { cn: "你只管努力，剩下的交给时间。", en: "Just work hard, leave the rest to time." },
    { cn: "温柔的一半是知识，另一半是格局。", en: "Half of gentleness is knowledge, the other half is vision." },
    { cn: "成为更好的自己，是一辈子的事。", en: "Becoming a better self is a lifelong journey." },
    { cn: "把热爱做到极致，便成了价值。", en: "When passion reaches its extreme, it becomes value." },
    { cn: "不慌不忙，来日方长。", en: "No rush, there's a long road ahead." },
    { cn: "每天进步一点点，就是最好的节奏。", en: "A little progress each day is the best rhythm." },
    { cn: "你现在的气质里，藏着你走过的路。", en: "Your current temperament hides the roads you've walked." },
    { cn: "愿所有的美好如期而至。", en: "May all good things arrive as expected." },
  ];

  /* 获取今日励志短句（基于日期种子，每日自动换新） */
  function getTodayQuote() {
    var today = MelodiDB.todayKey();
    var seed = 0;
    for (var i = 0; i < today.length; i++) {
      seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
    }
    seed = Math.abs(seed);
    return quotes[seed % quotes.length];
  }

  /* 获取当日打卡总览数据 */
  function getTodayCheckins() {
    var today = MelodiDB.todayKey();
    var allCheckins = [];

    // 睡眠
    var sleepData = MelodiDB.getDayData("sleep");
    if (sleepData) {
      allCheckins.push({
        label: "睡眠",
        done: sleepData.duration && sleepData.duration > 0,
        detail: sleepData.duration ? sleepData.duration.toFixed(1) + "h" : "未记录",
        target: "7.5h",
      });
    } else {
      allCheckins.push({ label: "睡眠", done: false, detail: "未记录", target: "7.5h" });
    }

    // 饮水
    var waterAmount = sleepData ? (sleepData.water || 0) : 0;
    allCheckins.push({
      label: "饮水",
      done: waterAmount >= 2000,
      detail: (waterAmount / 1000).toFixed(1) + "L",
      target: "2L",
    });

    // 饮食
    var dietData = MelodiDB.getDayData("diet");
    var mealCount = 0;
    if (dietData && dietData.meals) {
      ["breakfast", "lunch", "dinner"].forEach(function (k) {
        if (dietData.meals[k] && dietData.meals[k].text) mealCount++;
      });
    }
    allCheckins.push({
      label: "饮食",
      done: mealCount >= 3,
      detail: mealCount + "/3餐",
      target: "3餐",
    });

    // 运动
    var exerciseData = MelodiDB.getDayData("exercise");
    var exerciseDone = exerciseData && exerciseData.checkins && exerciseData.checkins.exercise;
    allCheckins.push({
      label: "运动",
      done: !!exerciseDone,
      detail: exerciseDone ? (exerciseData.exerciseMinutes || 0) + "min" : "未打卡",
      target: "30-60min",
    });

    // 护肤
    var skincareData = MelodiDB.getDayData("skincare");
    var skincareDone = skincareData && skincareData.checkins && skincareData.checkins.mask;
    allCheckins.push({
      label: "面膜",
      done: !!skincareDone,
      detail: skincareDone ? "已敷" : "未打卡",
      target: "隔天",
    });

    // 养生三项
    var wellnessData = MelodiDB.getDayData("wellness");
    var wellnessCount = 0;
    ["supplement", "ginseng", "footbath"].forEach(function (k) {
      if (wellnessData && wellnessData.checkins && wellnessData.checkins[k]) wellnessCount++;
    });
    allCheckins.push({
      label: "养生",
      done: wellnessCount >= 3,
      detail: wellnessCount + "/3项",
      target: "3项",
    });

    // 学习
    var growthData = MelodiDB.getDayData("growth");
    var studyMin = 0;
    if (growthData) {
      studyMin = (growthData.readingMinutes || 0) + (growthData.calligraphyMinutes || 0) + (growthData.wordsMinutes || 0);
    }
    allCheckins.push({
      label: "学习",
      done: studyMin >= 75,
      detail: studyMin + "min",
      target: "75min",
    });

    // 休闲
    var leisureData = MelodiDB.getDayData("leisure");
    var leisureDone = leisureData && leisureData.checkins && (leisureData.checkins.sub_podcast || leisureData.checkins.movie);
    allCheckins.push({
      label: "休闲",
      done: !!leisureDone,
      detail: leisureDone ? "已打卡" : "未打卡",
      target: "每日",
    });

    return allCheckins;
  }

  /* 获取打卡完成率 */
  function getCompletionRate() {
    var checkins = getTodayCheckins();
    var done = checkins.filter(function (c) { return c.done; }).length;
    return { done: done, total: checkins.length, percent: Math.round((done / checkins.length) * 100) };
  }

  /* 获取实时时间日期信息 */
  function getDateTimeInfo() {
    var now = new Date();
    var weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return {
      date: (now.getMonth() + 1) + "月" + now.getDate() + "日",
      weekday: "星期" + weekdays[now.getDay()],
      time: String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"),
      seconds: now.getSeconds(),
    };
  }

  /* 获取完整小组件数据（供外部读取） */
  function getWidgetData() {
    var dt = getDateTimeInfo();
    var quote = getTodayQuote();
    var checkins = getTodayCheckins();
    var completion = getCompletionRate();

    return {
      datetime: dt,
      quote: quote,
      checkins: checkins,
      completion: completion,
    };
  }

  /* 生成小组件页面（独立HTML片段，可嵌入iframe或PWA widget） */
  function renderWidgetHTML() {
    var data = getWidgetData();
    var html = '<div class="melodi-widget">';
    html += '<div class="widget-section widget-time">';
    html += '<div class="widget-time-main">' + data.datetime.time + "</div>";
    html += '<div class="widget-time-sub">' + data.datetime.date + " " + data.datetime.weekday + "</div>";
    html += "</div>";

    html += '<div class="widget-section widget-checkins">';
    html += '<div class="widget-checkin-header">今日打卡 <span class="widget-completion">' + data.completion.done + "/" + data.completion.total + "</span></div>";
    html += '<div class="widget-checkin-grid">';
    data.checkins.forEach(function (c) {
      html += '<div class="widget-checkin-item' + (c.done ? " done" : "") + '">';
      html += '<div class="widget-checkin-dot">' + (c.done ? "\u2713" : "\u25CB") + "</div>";
      html += '<div class="widget-checkin-label">' + c.label + "</div>";
      html += '<div class="widget-checkin-detail">' + c.detail + "</div>";
      html += "</div>";
    });
    html += "</div>";
    html += '<div class="widget-progress"><div class="widget-progress-fill" style="width:' + data.completion.percent + '%"></div></div>';
    html += '<div class="widget-progress-text">完成度 ' + data.completion.percent + "%</div>";
    html += "</div>";

    html += '<div class="widget-section widget-quote">';
    html += '<div class="widget-quote-cn">' + data.quote.cn + "</div>";
    html += '<div class="widget-quote-en">' + data.quote.en + "</div>";
    html += "</div>";
    html += "</div>";
    return html;
  }

  /* 小组件自动刷新（每秒更新时间） */
  var refreshInterval = null;
  function startAutoRefresh(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    function refresh() {
      container.innerHTML = renderWidgetHTML();
    }
    refresh();
    refreshInterval = setInterval(refresh, 1000);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  return {
    getWidgetData: getWidgetData,
    renderWidgetHTML: renderWidgetHTML,
    startAutoRefresh: startAutoRefresh,
    stopAutoRefresh: stopAutoRefresh,
    getTodayQuote: getTodayQuote,
    getTodayCheckins: getTodayCheckins,
    getCompletionRate: getCompletionRate,
  };
})();
