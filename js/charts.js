/* ============================================
   美乐蒂工作台 - 图表工具
   基于 Chart.js 封装，统一美乐蒂粉色风格
   ============================================ */

const MelodiCharts = (function () {
  const instances = {};

  const colors = {
    primary: "#FF6B95",
    primaryLight: "#FFB3C9",
    primaryBg: "rgba(255, 107, 149, 0.12)",
    secondary: "#FF9BB5",
    green: "#7FD8A0",
    greenBg: "rgba(127, 216, 160, 0.12)",
    blue: "#7CC4E8",
    blueBg: "rgba(124, 196, 232, 0.12)",
    yellow: "#FFD93D",
    yellowBg: "rgba(255, 217, 61, 0.12)",
    purple: "#C8A2E8",
    purpleBg: "rgba(200, 162, 232, 0.12)",
    orange: "#FFB347",
    orangeBg: "rgba(255, 179, 71, 0.12)",
    teal: "#5EC8B8",
    tealBg: "rgba(94, 200, 184, 0.12)",
  };

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function destroyAll() {
    Object.keys(instances).forEach(function (id) {
      instances[id].destroy();
      delete instances[id];
    });
  }

  /* ===== 平滑折线图 ===== */
  function lineChart(canvasId, labels, datasets, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroy(canvasId);
    instances[canvasId] = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: labels,
        datasets: datasets.map(function (d) {
          return {
            label: d.label || "",
            data: d.data,
            borderColor: d.color || colors.primary,
            backgroundColor: d.fillColor || d.bgColor || colors.primaryBg,
            borderWidth: 2,
            tension: 0.4,
            fill: d.fill !== false,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: d.color || colors.primary,
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
            spanGaps: true,
          };
        }),
      },
      options: Object.assign(
        {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: datasets.length > 1,
              labels: { font: { size: 11 }, color: "#8B7765" },
            },
            tooltip: {
              backgroundColor: "rgba(255, 107, 149, 0.92)",
              titleColor: "#fff",
              bodyColor: "#fff",
              titleFont: { size: 12 },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 }, color: "#B0A0A0", maxRotation: 0 },
            },
            y: {
              grid: { color: "rgba(255, 179, 201, 0.12)" },
              ticks: { font: { size: 10 }, color: "#B0A0A0" },
              beginAtZero: true,
            },
          },
        },
        opts || {}
      ),
    });
  }

  /* ===== 柱状图 ===== */
  function barChart(canvasId, labels, datasets, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroy(canvasId);
    instances[canvasId] = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: datasets.map(function (d) {
          return {
            label: d.label || "",
            data: d.data,
            backgroundColor: d.color || colors.primary,
            borderColor: d.color || colors.primary,
            borderWidth: 0,
            borderRadius: 6,
            barThickness: "flex",
            maxBarThickness: 24,
          };
        }),
      },
      options: Object.assign(
        {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: datasets.length > 1,
              labels: { font: { size: 11 }, color: "#8B7765" },
            },
            tooltip: {
              backgroundColor: "rgba(255, 107, 149, 0.92)",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 }, color: "#B0A0A0", maxRotation: 0 },
            },
            y: {
              grid: { color: "rgba(255, 179, 201, 0.12)" },
              ticks: { font: { size: 10 }, color: "#B0A0A0" },
              beginAtZero: true,
            },
          },
        },
        opts || {}
      ),
    });
  }

  /* ===== 环形图 ===== */
  function doughnutChart(canvasId, labels, data, colorArr, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroy(canvasId);
    instances[canvasId] = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colorArr,
            borderWidth: 0,
            borderRadius: 6,
          },
        ],
      },
      options: Object.assign(
        {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { font: { size: 10 }, color: "#8B7765", padding: 8 },
            },
            tooltip: {
              backgroundColor: "rgba(255, 107, 149, 0.92)",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 10,
              cornerRadius: 8,
            },
          },
        },
        opts || {}
      ),
    });
  }

  /* ===== 获取最近N天的日期标签 ===== */
  function getLastNDayLabels(n) {
    var labels = [];
    var today = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push((d.getMonth() + 1) + "/" + d.getDate());
    }
    return labels;
  }

  /* ===== 获取本月日期标签 ===== */
  function getMonthDayLabels() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var labels = [];
    for (var i = 1; i <= daysInMonth; i++) {
      labels.push(month + 1 + "/" + i);
    }
    return labels;
  }

  return {
    lineChart: lineChart,
    barChart: barChart,
    doughnutChart: doughnutChart,
    destroy: destroy,
    destroyAll: destroyAll,
    colors: colors,
    getLastNDayLabels: getLastNDayLabels,
    getMonthDayLabels: getMonthDayLabels,
  };
})();
