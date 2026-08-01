/* ============================================
   美乐蒂工作台 - ADHD 专项支持模块
   5分钟启动 / 专注模式 / 任务倒计时 / 即时反馈奖励
   ============================================ */

const MelodiADHD = (function () {
  "use strict";

  /* ===== 内部状态 ===== */
  var focus = {
    active: false,
    taskName: "",
    totalSec: 0,
    leftSec: 0,
    timer: null,
    paused: false,
    onComplete: null,
    startedAt: null,
  };

  var audioCtx = null;
  var soundEnabled = true;
  var vibrateEnabled = true;

  /* ===== 音效：用 Web Audio 合成，无需外部音频文件 ===== */
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  /* 播放一串音符，营造"叮咚"完成感 */
  function playTone(notes) {
    if (!soundEnabled) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { } }
    var t0 = ctx.currentTime;
    notes.forEach(function (n, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      var start = t0 + (n.at || i * 0.12);
      var dur = n.dur || 0.22;
      // 柔和的淡入淡出，避免爆音
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(n.vol || 0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }

  var SOUNDS = {
    // 完成打卡：上行大三和弦，明亮愉悦
    complete: [{ freq: 523.25 }, { freq: 659.25 }, { freq: 783.99 }, { freq: 1046.5, dur: 0.4 }],
    // 轻量确认：单音点触
    tick: [{ freq: 880, dur: 0.1, vol: 0.12 }],
    // 专注结束：舒缓下行，提示可以休息了
    rest: [{ freq: 783.99 }, { freq: 659.25 }, { freq: 523.25, dur: 0.45 }],
    // 提醒：两声短促呼唤
    alert: [{ freq: 698.46, dur: 0.14 }, { freq: 880, at: 0.18, dur: 0.2 }],
  };

  function play(name) {
    if (SOUNDS[name]) playTone(SOUNDS[name]);
  }

  function buzz(pattern) {
    if (!vibrateEnabled) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern || [40, 60, 40]); } catch (e) { }
    }
  }

  /* ===== 即时反馈：完成任务的视觉奖励 ===== */
  var PRAISE = [
    "做到了！这一步很棒 ✨",
    "又推进了一点点，累积起来就是很多",
    "完成的感觉是不是很好？",
    "你比昨天的自己更进一步了",
    "小涵，这一项拿下 🎀",
    "坚持住，成长曲线在往上走",
    "干得漂亮，继续保持",
    "每一次完成都在为未来攒资本",
  ];

  /* 撒花动画：粉色系花瓣飘落 */
  function confetti(originEl) {
    var layer = document.getElementById("adhdConfetti");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "adhdConfetti";
      layer.className = "adhd-confetti-layer";
      document.body.appendChild(layer);
    }
    var colors = ["#FF6B95", "#FFB0C4", "#F7D6E1", "#FCEAF8", "#FFD8E2", "#FFE8EE"];
    var rect = originEl && originEl.getBoundingClientRect
      ? originEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 3, width: 0, height: 0 };
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    for (var i = 0; i < 18; i++) {
      var p = document.createElement("span");
      p.className = "adhd-confetti-piece";
      var angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      var dist = 60 + Math.random() * 110;
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", (Math.sin(angle) * dist + 120) + "px");
      p.style.animationDelay = (Math.random() * 0.12) + "s";
      if (i % 3 === 0) p.style.borderRadius = "50%";
      layer.appendChild(p);
      (function (el) {
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1400);
      })(p);
    }
  }

  /* 完成任务的完整反馈：音效 + 震动 + 撒花 + 鼓励语 */
  function celebrate(message, originEl) {
    play("complete");
    buzz([30, 50, 30, 50, 60]);
    confetti(originEl);
    var text = message || PRAISE[Math.floor(Math.random() * PRAISE.length)];
    toast(text, "success");
  }

  /* ===== 轻量 Toast 提示 ===== */
  function toast(text, type) {
    var box = document.getElementById("adhdToastBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "adhdToastBox";
      box.className = "adhd-toast-box";
      document.body.appendChild(box);
    }
    var el = document.createElement("div");
    el.className = "adhd-toast adhd-toast-" + (type || "info");
    el.textContent = text;
    box.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 2600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3100);
  }

  /* ===== 专注模式 =====
     全屏遮罩隔绝干扰，只留当前这一件事 + 倒计时 */
  function buildFocusOverlay() {
    var el = document.getElementById("focusOverlay");
    if (el) return el;
    el = document.createElement("div");
    el.id = "focusOverlay";
    el.className = "focus-overlay";
    el.innerHTML =
      '<div class="focus-inner">' +
      '  <div class="focus-breath"><div class="focus-breath-core"></div></div>' +
      '  <div class="focus-label">正在专注</div>' +
      '  <div class="focus-task" id="focusTaskName">任务</div>' +
      '  <div class="focus-countdown" id="focusCountdown">05:00</div>' +
      '  <div class="focus-progress"><div class="focus-progress-bar" id="focusProgressBar"></div></div>' +
      '  <div class="focus-hint" id="focusHint">屏蔽一切干扰，只做这一件事</div>' +
      '  <div class="focus-actions">' +
      '    <button class="btn btn-secondary btn-sm" id="focusPauseBtn">暂停</button>' +
      '    <button class="btn btn-primary btn-sm" id="focusDoneBtn">完成</button>' +
      '    <button class="btn btn-ghost btn-sm" id="focusExitBtn">退出</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(el);

    el.querySelector("#focusPauseBtn").addEventListener("click", togglePause);
    el.querySelector("#focusDoneBtn").addEventListener("click", function () { finishFocus(true); });
    el.querySelector("#focusExitBtn").addEventListener("click", function () { finishFocus(false); });
    return el;
  }

  function fmt(sec) {
    var m = Math.floor(Math.max(0, sec) / 60);
    var s = Math.max(0, sec) % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function renderFocus() {
    var cd = document.getElementById("focusCountdown");
    var bar = document.getElementById("focusProgressBar");
    if (cd) cd.textContent = fmt(focus.leftSec);
    if (bar && focus.totalSec > 0) {
      var pct = ((focus.totalSec - focus.leftSec) / focus.totalSec) * 100;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }
    // 最后一分钟变色提示，制造温和的紧迫感
    var overlay = document.getElementById("focusOverlay");
    if (overlay) {
      if (focus.leftSec <= 60 && focus.leftSec > 0) overlay.classList.add("urgent");
      else overlay.classList.remove("urgent");
    }
  }

  /* 启动专注：opts = { name, minutes, hint, onComplete } */
  function startFocus(opts) {
    opts = opts || {};
    if (focus.active) stopTimer();
    var overlay = buildFocusOverlay();
    focus.active = true;
    focus.paused = false;
    focus.taskName = opts.name || "专注中";
    focus.totalSec = Math.round((opts.minutes || 5) * 60);
    focus.leftSec = focus.totalSec;
    focus.onComplete = opts.onComplete || null;
    focus.startedAt = Date.now();

    var nameEl = document.getElementById("focusTaskName");
    if (nameEl) nameEl.textContent = focus.taskName;
    var hintEl = document.getElementById("focusHint");
    if (hintEl) hintEl.textContent = opts.hint || "屏蔽一切干扰，只做这一件事";
    var pauseBtn = document.getElementById("focusPauseBtn");
    if (pauseBtn) pauseBtn.textContent = "暂停";

    overlay.classList.add("show");
    document.body.classList.add("focus-locked");
    renderFocus();
    play("tick");
    buzz([25]);

    focus.timer = setInterval(function () {
      if (focus.paused) return;
      focus.leftSec--;
      renderFocus();
      if (focus.leftSec <= 0) finishFocus(true);
    }, 1000);
  }

  /* 5分钟启动：ADHD 抗拖延的核心 —— 只承诺 5 分钟，降低开始门槛 */
  function quickStart(taskName, onComplete) {
    startFocus({
      name: taskName || "先做 5 分钟",
      minutes: 5,
      hint: "只要 5 分钟就好，开始了往往就停不下来",
      onComplete: onComplete,
    });
  }

  function togglePause() {
    if (!focus.active) return;
    focus.paused = !focus.paused;
    var btn = document.getElementById("focusPauseBtn");
    if (btn) btn.textContent = focus.paused ? "继续" : "暂停";
    var overlay = document.getElementById("focusOverlay");
    if (overlay) overlay.classList.toggle("paused", focus.paused);
  }

  function stopTimer() {
    if (focus.timer) { clearInterval(focus.timer); focus.timer = null; }
  }

  function finishFocus(completed) {
    if (!focus.active) return;
    stopTimer();
    var elapsedMin = Math.round(((focus.totalSec - focus.leftSec) / 60) * 10) / 10;
    var overlay = document.getElementById("focusOverlay");
    if (overlay) { overlay.classList.remove("show", "urgent", "paused"); }
    document.body.classList.remove("focus-locked");
    focus.active = false;

    // 累计专注时长入库，供学习统计使用
    if (elapsedMin > 0 && window.MelodiDB) {
      var d = MelodiDB.getDayData("focus") || { total: 0, sessions: [] };
      d.total = Math.round(((d.total || 0) + elapsedMin) * 10) / 10;
      d.sessions = d.sessions || [];
      d.sessions.push({ name: focus.taskName, min: elapsedMin, at: new Date().toISOString(), done: !!completed });
      MelodiDB.setDayData("focus", d);
    }

    if (completed) {
      play("rest");
      buzz([60, 80, 60]);
      confetti(null);
      toast("专注完成：" + focus.taskName + "（" + elapsedMin + " 分钟）", "success");
    } else if (elapsedMin > 0) {
      toast("已记录 " + elapsedMin + " 分钟，中断也算数", "info");
    }

    if (typeof focus.onComplete === "function") {
      try { focus.onComplete(elapsedMin, !!completed); } catch (e) { console.warn(e); }
    }
    focus.onComplete = null;
  }

  function isFocusing() { return focus.active; }

  /* ===== 任务倒计时（非全屏，浮在角落） ===== */
  var chips = {};

  function startCountdown(id, name, minutes, onEnd) {
    stopCountdown(id);
    var box = document.getElementById("countdownBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "countdownBox";
      box.className = "countdown-box";
      document.body.appendChild(box);
    }
    var chip = document.createElement("div");
    chip.className = "countdown-chip";
    chip.innerHTML =
      '<div class="countdown-chip-name"></div>' +
      '<div class="countdown-chip-time">--:--</div>' +
      '<button class="countdown-chip-close" title="取消">×</button>';
    chip.querySelector(".countdown-chip-name").textContent = name;
    box.appendChild(chip);

    var state = { left: Math.round(minutes * 60), el: chip, timer: null };
    chips[id] = state;

    function tick() {
      var t = chip.querySelector(".countdown-chip-time");
      var m = Math.floor(state.left / 60), s = state.left % 60;
      if (t) t.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      if (state.left <= 60) chip.classList.add("urgent");
      if (state.left <= 0) {
        stopCountdown(id);
        play("alert");
        buzz([80, 100, 80]);
        toast("「" + name + "」时间到了", "warning");
        if (typeof onEnd === "function") onEnd();
        return;
      }
      state.left--;
    }
    tick();
    state.timer = setInterval(tick, 1000);
    chip.querySelector(".countdown-chip-close").addEventListener("click", function () {
      stopCountdown(id);
    });
    return state;
  }

  function stopCountdown(id) {
    var s = chips[id];
    if (!s) return;
    if (s.timer) clearInterval(s.timer);
    if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el);
    delete chips[id];
  }

  /* ===== 任务拆解：把大任务切成可执行小步 ===== */
  function suggestSteps(taskName) {
    var n = (taskName || "").trim();
    if (!n) return [];
    // 通用三段式拆解，降低启动门槛
    return [
      { text: "准备：把做「" + n + "」需要的东西摆好", min: 3 },
      { text: "启动：先做 5 分钟，不求做好", min: 5 },
      { text: "推进：继续 20 分钟，做到能停的地方", min: 20 },
    ];
  }

  /* ===== 偏好设置 ===== */
  function loadPrefs() {
    if (!window.MelodiDB) return;
    var s = MelodiDB.getSettings();
    soundEnabled = s.soundEnabled !== false;
    vibrateEnabled = s.vibrateEnabled !== false;
  }

  function setPrefs(p) {
    if (typeof p.sound === "boolean") soundEnabled = p.sound;
    if (typeof p.vibrate === "boolean") vibrateEnabled = p.vibrate;
    if (window.MelodiDB) {
      MelodiDB.setSettings({ soundEnabled: soundEnabled, vibrateEnabled: vibrateEnabled });
    }
  }

  function getPrefs() {
    return { sound: soundEnabled, vibrate: vibrateEnabled };
  }

  function init() {
    loadPrefs();
    // 首次用户交互时解锁音频上下文（浏览器自动播放策略要求）
    var unlock = function () {
      ensureAudio();
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
  }

  return {
    init: init,
    play: play,
    buzz: buzz,
    toast: toast,
    celebrate: celebrate,
    confetti: confetti,
    startFocus: startFocus,
    quickStart: quickStart,
    finishFocus: finishFocus,
    isFocusing: isFocusing,
    startCountdown: startCountdown,
    stopCountdown: stopCountdown,
    suggestSteps: suggestSteps,
    setPrefs: setPrefs,
    getPrefs: getPrefs,
  };
})();

// 挂到 window，供其它模块通过 window.MelodiADHD 访问（const 声明不会自动挂 window）
window.MelodiADHD = MelodiADHD;
