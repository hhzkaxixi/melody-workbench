/* ============================================
   美乐蒂工作台 - 历史数据管理
   关键词搜索 / 日期范围筛选 / CSV & PDF 导出
   ============================================ */

const MelodiExport = (function () {
  "use strict";

  /* 模块中文名映射，导出与搜索结果里显示得懂 */
  var MODULE_NAMES = {
    sleep: "作息睡眠",
    diet: "饮食记录",
    growth: "自我提升",
    exercise: "运动锻炼",
    skincare: "皮肤管理",
    wellness: "养生习惯",
    leisure: "休闲习惯",
    focus: "专注记录",
    finance: "理财学习",
    news: "时政热点",
    exam: "考公上岸",
    weight: "体重追踪",
    savings: "攒钱记录",
    invest: "定投计划",
    study: "学习计划",
  };

  var LIST_NAMES = {
    tasks: "任务清单",
    books: "书单",
    inspirations: "灵感收纳",
    movies: "观影记录",
    studyPlans: "学习计划",
    financeLinks: "理财资源",
    newsHighlights: "时政要点",
  };

  var FIELD_NAMES = {
    bedtime: "入睡时间", waketime: "起床时间", duration: "睡眠时长(h)",
    water: "饮水量(ml)", calories: "热量(kcal)",
    readingMinutes: "阅读(分钟)", calligraphyMinutes: "练字(分钟)", wordsMinutes: "背词(分钟)",
    minutes: "时长(分钟)", weight: "体重(斤)", note: "备注", content: "内容",
    total: "累计", amount: "金额", part: "训练部位", type: "类型",
  };

  function fieldName(k) { return FIELD_NAMES[k] || k; }
  function moduleName(m) { return MODULE_NAMES[m] || m; }

  /* ===== 把散落的数据拍平成统一记录行 ===== */
  function flattenAll(startDate, endDate) {
    var rows = [];
    var modules = MelodiDB.listModules();

    modules.forEach(function (mod) {
      var all = MelodiDB.get("daily:" + mod, {});
      Object.keys(all).forEach(function (dateKey) {
        if (startDate && dateKey < startDate) return;
        if (endDate && dateKey > endDate) return;
        var data = all[dateKey];
        if (!data || typeof data !== "object") return;

        Object.keys(data).forEach(function (field) {
          if (field === "_updatedAt") return;
          var val = data[field];

          // 打卡对象展开成一行行「已完成」
          if (field === "checkins" && val && typeof val === "object") {
            Object.keys(val).forEach(function (ck) {
              if (val[ck]) {
                rows.push({
                  date: dateKey, module: moduleName(mod), field: "打卡",
                  value: checkLabel(ck), raw: ck,
                });
              }
            });
            return;
          }

          // 数组型（如三餐、运动记录）逐条展开
          if (Array.isArray(val)) {
            val.forEach(function (item) {
              rows.push({
                date: dateKey, module: moduleName(mod), field: fieldName(field),
                value: typeof item === "object" ? summarize(item) : String(item),
                raw: item,
              });
            });
            return;
          }

          // 普通对象
          if (val && typeof val === "object") {
            rows.push({
              date: dateKey, module: moduleName(mod), field: fieldName(field),
              value: summarize(val), raw: val,
            });
            return;
          }

          // 标量：跳过空值与 false
          if (val === "" || val === null || val === undefined || val === false) return;
          rows.push({
            date: dateKey, module: moduleName(mod), field: fieldName(field),
            value: String(val), raw: val,
          });
        });
      });
    });

    // 列表型数据
    MelodiDB.listListKeys().forEach(function (lk) {
      var list = MelodiDB.getList(lk);
      if (!Array.isArray(list)) return;
      list.forEach(function (item) {
        var d = (item.date || item.createdAt || "").slice(0, 10);
        if (startDate && d && d < startDate) return;
        if (endDate && d && d > endDate) return;
        rows.push({
          date: d || "-",
          module: LIST_NAMES[lk] || lk,
          field: item.done ? "已完成" : (item.status || "记录"),
          value: item.text || item.title || item.name || item.content || summarize(item),
          raw: item,
        });
      });
    });

    rows.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return rows;
  }

  function checkLabel(key) {
    if (typeof MelodiCalendar !== "undefined") {
      var found = MelodiCalendar.CHECK_ITEMS.filter(function (i) { return i.key === key; })[0];
      if (found) return found.label;
    }
    return key;
  }

  /* 把对象压成一行可读文本 */
  function summarize(obj) {
    if (!obj || typeof obj !== "object") return String(obj);
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      if (k === "id" || k === "createdAt" || k === "updatedAt" || k === "_updatedAt") return;
      var v = obj[k];
      if (v === "" || v === null || v === undefined || v === false) return;
      // base64 照片不进导出，太长
      if (typeof v === "string" && v.indexOf("data:image") === 0) { parts.push(fieldName(k) + "=[照片]"); return; }
      if (typeof v === "object") return;
      parts.push(fieldName(k) + "=" + v);
    });
    return parts.join(" / ") || "-";
  }

  /* ===== 关键词搜索 ===== */
  function search(keyword, startDate, endDate) {
    var rows = flattenAll(startDate, endDate);
    if (!keyword || !keyword.trim()) return rows.slice(0, 300);
    var kw = keyword.trim().toLowerCase();
    return rows.filter(function (r) {
      return (r.value + " " + r.module + " " + r.field + " " + r.date).toLowerCase().indexOf(kw) >= 0;
    }).slice(0, 300);
  }

  /* ===== CSV 导出 ===== */
  function toCSV(rows) {
    var header = ["日期", "模块", "项目", "内容"];
    var lines = [header.join(",")];
    rows.forEach(function (r) {
      lines.push([r.date, r.module, r.field, r.value].map(csvCell).join(","));
    });
    // BOM 头，保证 Excel 打开中文不乱码
    return "\uFEFF" + lines.join("\r\n");
  }

  function csvCell(v) {
    var s = String(v === null || v === undefined ? "" : v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCSV(startDate, endDate) {
    var rows = flattenAll(startDate, endDate);
    if (rows.length === 0) {
      if (window.MelodiADHD) MelodiADHD.toast("所选范围内没有数据", "warning");
      return 0;
    }
    var blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, "美乐蒂工作台_数据备份_" + MelodiDB.todayKey() + ".csv");
    return rows.length;
  }

  /* ===== PDF 导出 =====
     不引第三方库，用打印窗口生成 PDF，浏览器原生「另存为 PDF」即可 */
  function exportPDF(startDate, endDate) {
    var rows = flattenAll(startDate, endDate);
    if (rows.length === 0) {
      if (window.MelodiADHD) MelodiADHD.toast("所选范围内没有数据", "warning");
      return 0;
    }

    // 按日期分组，打印出来更好读
    var groups = {};
    rows.forEach(function (r) {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    var dates = Object.keys(groups).sort().reverse();

    var streak = (typeof MelodiCalendar !== "undefined") ? MelodiCalendar.calcStreak() : null;

    var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">';
    html += "<title>美乐蒂工作台数据备份</title><style>";
    html += 'body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#4A2030;padding:28px 32px;background:#fff;}';
    html += "h1{font-size:22px;color:#C0335E;margin:0 0 4px;}";
    html += ".sub{font-size:12px;color:#8A5060;margin-bottom:18px;}";
    html += ".sum{background:#FCEAF8;border:1px solid #F7D6E1;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:12px;display:flex;gap:26px;}";
    html += ".sum b{color:#C0335E;font-size:17px;display:block;}";
    html += "h2{font-size:14px;color:#C0335E;margin:18px 0 7px;padding-bottom:5px;border-bottom:1.5px solid #F7D6E1;}";
    html += "table{width:100%;border-collapse:collapse;font-size:11.5px;}";
    html += "th{background:#F7D6E1;color:#7A1E3A;text-align:left;padding:6px 9px;font-weight:600;}";
    html += "td{padding:5px 9px;border-bottom:1px solid #FCEAF8;vertical-align:top;}";
    html += "td.m{color:#8A5060;width:110px;}td.f{color:#B88090;width:96px;}";
    html += "@media print{h2{page-break-after:avoid;}tr{page-break-inside:avoid;}}";
    html += "</style></head><body>";
    html += "<h1>美乐蒂工作台 · 数据备份</h1>";
    html += '<div class="sub">导出时间：' + new Date().toLocaleString("zh-CN") +
      "　范围：" + (startDate || "全部") + " 至 " + (endDate || "今天") +
      "　共 " + rows.length + " 条记录</div>";

    if (streak) {
      html += '<div class="sum">';
      html += "<div><b>" + streak.current + "</b>当前连续打卡</div>";
      html += "<div><b>" + streak.longest + "</b>最长连续</div>";
      html += "<div><b>" + streak.total + "</b>累计打卡天数</div>";
      html += "<div><b>" + dates.length + "</b>有记录天数</div>";
      html += "</div>";
    }

    dates.forEach(function (d) {
      html += "<h2>" + d + "</h2><table>";
      html += "<tr><th>模块</th><th>项目</th><th>内容</th></tr>";
      groups[d].forEach(function (r) {
        html += '<tr><td class="m">' + esc(r.module) + '</td><td class="f">' + esc(r.field) +
          "</td><td>" + esc(r.value) + "</td></tr>";
      });
      html += "</table>";
    });

    html += "</body></html>";

    var w = window.open("", "_blank");
    if (!w) {
      if (window.MelodiADHD) MelodiADHD.toast("请允许弹出窗口后重试", "warning");
      return 0;
    }
    w.document.write(html);
    w.document.close();
    // 等排版完成再唤起打印对话框
    setTimeout(function () { try { w.print(); } catch (e) { } }, 600);
    return rows.length;
  }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ===== JSON 全量备份 ===== */
  function downloadJSON() {
    var data = MelodiDB.exportAll();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    triggerDownload(blob, "美乐蒂工作台_完整备份_" + MelodiDB.todayKey() + ".json");
    return Object.keys(data).length;
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  /* ===== 历史数据页面 ===== */
  function render() {
    var today = MelodiDB.todayKey();
    var monthAgo = (function () {
      var d = new Date(); d.setMonth(d.getMonth() - 1);
      return MelodiDB.dateKey(d);
    })();

    var html = "";

    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">搜索历史记录</div></div>';
    html += '<div class="search-bar">';
    html += '<input type="text" class="form-input" id="histKeyword" placeholder="输入关键词，比如 阅读 / 面膜 / 单词">';
    html += '<button class="btn btn-primary btn-sm" id="histSearchBtn">搜索</button>';
    html += "</div>";
    html += '<div class="filter-row">';
    html += '<label class="filter-label">从</label><input type="date" class="form-input" id="histStart" value="' + monthAgo + '">';
    html += '<label class="filter-label">到</label><input type="date" class="form-input" id="histEnd" value="' + today + '">';
    html += '<button class="btn btn-secondary btn-sm" id="histResetBtn">重置</button>';
    html += "</div>";
    html += '<div class="hist-count" id="histCount"></div>';
    html += '<div class="hist-list" id="histList"></div>';
    html += "</div>";

    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">导出备份</div></div>';
    html += '<div class="muted" style="margin-bottom:12px;">导出范围跟随上方的日期筛选。CSV 可用 Excel 打开，PDF 会调起浏览器打印窗口（选择"另存为 PDF"）。</div>';
    html += '<div class="flex gap-sm" style="flex-wrap:wrap;">';
    html += '<button class="btn btn-primary btn-sm" id="expCsvBtn">导出 CSV</button>';
    html += '<button class="btn btn-primary btn-sm" id="expPdfBtn">导出 PDF</button>';
    html += '<button class="btn btn-secondary btn-sm" id="expJsonBtn">完整 JSON 备份</button>';
    html += "</div></div>";

    // 版本快照恢复
    html += '<div class="card">';
    html += '<div class="card-header"><div class="card-title">版本历史</div>';
    html += '<button class="btn btn-secondary btn-sm" id="snapNowBtn">立即保存版本</button></div>';
    html += '<div class="muted" style="margin-bottom:10px;">工作台每 30 秒自动保存一次版本，最多保留 10 个。误删数据可以从这里恢复。</div>';
    html += '<div id="snapList"></div>';
    html += "</div>";

    setTimeout(afterRender, 0);
    return html;
  }

  function afterRender() {
    var kw = document.getElementById("histKeyword");
    var start = document.getElementById("histStart");
    var end = document.getElementById("histEnd");

    function doSearch() {
      var rows = search(kw ? kw.value : "", start ? start.value : "", end ? end.value : "");
      var list = document.getElementById("histList");
      var count = document.getElementById("histCount");
      if (count) count.textContent = "找到 " + rows.length + " 条记录" + (rows.length >= 300 ? "（仅显示前 300 条）" : "");
      if (!list) return;
      if (rows.length === 0) {
        list.innerHTML = '<div class="empty-state">这个范围里还没有记录</div>';
        return;
      }
      // 按日期折叠归档
      var groups = {};
      rows.forEach(function (r) {
        if (!groups[r.date]) groups[r.date] = [];
        groups[r.date].push(r);
      });
      var dates = Object.keys(groups).sort().reverse();
      var h = "";
      dates.forEach(function (d, idx) {
        h += '<details class="hist-group"' + (idx < 2 ? " open" : "") + ">";
        h += "<summary>" + d + ' <span class="hist-badge">' + groups[d].length + "</span></summary>";
        h += '<div class="hist-items">';
        groups[d].forEach(function (r) {
          h += '<div class="hist-item"><span class="hist-mod">' + esc(r.module) + "</span>";
          h += '<span class="hist-field">' + esc(r.field) + "</span>";
          h += '<span class="hist-val">' + esc(r.value) + "</span></div>";
        });
        h += "</div></details>";
      });
      list.innerHTML = h;
    }

    var btn = document.getElementById("histSearchBtn");
    if (btn) btn.addEventListener("click", doSearch);
    if (kw) kw.addEventListener("keydown", function (e) { if (e.key === "Enter") doSearch(); });
    if (start) start.addEventListener("change", doSearch);
    if (end) end.addEventListener("change", doSearch);

    var reset = document.getElementById("histResetBtn");
    if (reset) reset.addEventListener("click", function () {
      if (kw) kw.value = "";
      if (start) start.value = "";
      if (end) end.value = "";
      doSearch();
    });

    var csvBtn = document.getElementById("expCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", function () {
      var n = downloadCSV(start ? start.value : "", end ? end.value : "");
      if (n > 0 && window.MelodiADHD) MelodiADHD.toast("已导出 " + n + " 条记录", "success");
    });

    var pdfBtn = document.getElementById("expPdfBtn");
    if (pdfBtn) pdfBtn.addEventListener("click", function () {
      exportPDF(start ? start.value : "", end ? end.value : "");
    });

    var jsonBtn = document.getElementById("expJsonBtn");
    if (jsonBtn) jsonBtn.addEventListener("click", function () {
      downloadJSON();
      if (window.MelodiADHD) MelodiADHD.toast("完整备份已下载", "success");
    });

    var snapBtn = document.getElementById("snapNowBtn");
    if (snapBtn) snapBtn.addEventListener("click", function () {
      MelodiDB.createSnapshot("手动保存");
      renderSnapshots();
      if (window.MelodiADHD) MelodiADHD.toast("已保存当前版本", "success");
    });

    renderSnapshots();
    doSearch();
  }

  function renderSnapshots() {
    var box = document.getElementById("snapList");
    if (!box) return;
    var snaps = MelodiDB.listSnapshots();
    if (snaps.length === 0) {
      box.innerHTML = '<div class="empty-state">还没有版本快照</div>';
      return;
    }
    var h = "";
    snaps.forEach(function (s) {
      var t = new Date(s.at);
      var label = t.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      h += '<div class="snap-row">';
      h += '<div><div class="snap-time">' + label + "</div>";
      h += '<div class="snap-meta">' + s.label + " · " + Math.round(s.size / 1024) + " KB</div></div>";
      h += '<button class="btn btn-secondary btn-sm" data-snap="' + s.id + '">恢复</button>';
      h += "</div>";
    });
    box.innerHTML = h;

    Array.prototype.forEach.call(box.querySelectorAll("[data-snap]"), function (b) {
      b.addEventListener("click", function () {
        if (!confirm("确定恢复到这个版本吗？当前数据会先自动备份一份。")) return;
        if (MelodiDB.restoreSnapshot(b.getAttribute("data-snap"))) {
          if (window.MelodiADHD) MelodiADHD.toast("已恢复，正在刷新…", "success");
          setTimeout(function () { location.reload(); }, 800);
        }
      });
    });
  }

  return {
    render: render,
    afterRender: afterRender,
    search: search,
    flattenAll: flattenAll,
    downloadCSV: downloadCSV,
    exportPDF: exportPDF,
    downloadJSON: downloadJSON,
  };
})();
