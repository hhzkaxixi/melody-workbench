/* ============================================
   美乐蒂工作台 - 今日运势（玄学显化版）
   八字 · 占星 · 塔罗 · 今日提示 · 每日励志
   所有内容以「日期种子」派生，每天自动更新
   ============================================ */

const FortuneModule = (function () {
  /* ---------- 天干地支 / 五行 ---------- */
  var GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var GAN_WX = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var ZHI_WX = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
  var WX_COLOR = { 木: "#7cc47f", 火: "#ff8a8a", 土: "#d9b06a", 金: "#cfd6e4", 水: "#7fb4e6" };
  var SHENG = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }; // 我生
  var KE = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };    // 我克

  /* 计算某公历日期的干支序号（0=甲子） */
  function jdn(y, m, d) {
    if (m < 3) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524);
  }
  function ganzhiOf(dateStr) {
    var p = (dateStr || "2000-01-01").split("-");
    var J = jdn(parseInt(p[0], 10), parseInt(p[1], 10), parseInt(p[2], 10));
    var n = (((J + 49) % 60) + 60) % 60;
    return { gan: GAN[n % 10], zhi: ZHI[n % 12], n: n };
  }

  /* 日主关系（以用户八字日柱天干为基准） */
  function dayMaster(settings) {
    var bazi = (settings.bazi || "庚辰 丙戌 甲寅 甲子").trim().split(/\s+/);
    var day = bazi[2] || "甲寅";
    return day.charAt(0);
  }
  function relationToMaster(dm, other) {
    var dmWx = GAN_WX[dm], wx = GAN_WX[other];
    if (wx === dmWx) return { key: "比劫", label: "同气帮身", desc: "今日天干与你日主同属" + wx + "，易被支持与陪伴，适合表达自我、与人协作。" };
    if (SHENG[dmWx] === wx) return { key: "食伤", label: "我生泄秀", desc: "今日天干被你生发，灵感流动、利于创作表达，注意精力别过度外放。" };
    if (KE[dmWx] === wx) return { key: "财", label: "我克求财", desc: "今日天干为你的财星，利于行动、规划与收获，是把想法落地的好日子。" };
    if (SHENG[wx] === dmWx) return { key: "印", label: "生我滋养", desc: "今日天干生扶你的日主，得直觉/贵人的滋养，适合学习、内省与休息。" };
    if (KE[wx] === dmWx) return { key: "官杀", label: "克我磨炼", desc: "今日天干克制你的日主，略有压力与挑战，恰是打磨边界、建立秩序的时机。" };
    return { key: "中和", label: "平和", desc: "今日能量平和，按自己的节奏就好。" };
  }

  /* ---------- 占星 ---------- */
  var ZODIAC = [
    { name: "白羊座", start: [3, 21], end: [4, 19], el: "火", ruler: "火星", key: "行动与勇气" },
    { name: "金牛座", start: [4, 20], end: [5, 20], el: "土", ruler: "金星", key: "稳定与感官" },
    { name: "双子座", start: [5, 21], end: [6, 21], el: "风", ruler: "水星", key: "沟通与好奇" },
    { name: "巨蟹座", start: [6, 22], end: [7, 22], el: "水", ruler: "月亮", key: "情感与守护" },
    { name: "狮子座", start: [7, 23], end: [8, 22], el: "火", ruler: "太阳", key: "光芒与创造" },
    { name: "处女座", start: [8, 23], end: [9, 22], el: "土", ruler: "水星", key: "秩序与精进" },
    { name: "天秤座", start: [9, 23], end: [10, 23], el: "风", ruler: "金星", key: "平衡与美感" },
    { name: "天蝎座", start: [10, 24], end: [11, 22], el: "水", ruler: "冥王星", key: "深度与转化" },
    { name: "射手座", start: [11, 23], end: [12, 21], el: "火", ruler: "木星", key: "探索与信念" },
    { name: "摩羯座", start: [12, 22], end: [1, 19], el: "土", ruler: "土星", key: "结构与目标" },
    { name: "水瓶座", start: [1, 20], end: [2, 18], el: "风", ruler: "天王星", key: "独立与革新" },
    { name: "双鱼座", start: [2, 19], end: [3, 20], el: "水", ruler: "海王星", key: "灵感与慈悲" },
  ];
  function sunSign(birthday) {
    var p = (birthday || "2000-10-22").split("-");
    var m = parseInt(p[1], 10), d = parseInt(p[2], 10);
    for (var i = 0; i < ZODIAC.length; i++) {
      var z = ZODIAC[i];
      var a = z.start[0] * 100 + z.start[1], b = z.end[0] * 100 + z.end[1], cur = m * 100 + d;
      if (a <= b) { if (cur >= a && cur <= b) return z; }
      else { if (cur >= a || cur <= b) return z; } // 跨年（摩羯）
    }
    return ZODIAC[6];
  }
  var ZODIAC_ADVICE = {
    火: ["行动力在线，把念头落地成第一步。", "别太急，给热情找个健康的出口。", "今天适合挑战一件有点难度的事。"],
    土: ["稳扎稳打，结构化推进最顺。", "照顾好身体与环境的秩序感。", "把长期目标拆成今天能做的一小步。"],
    风: ["今天适合梳理关系，把天平调回平衡。", "用沟通化解误解，你的话语有分量。", "给生活留一点留白与美感。"],
    水: ["跟随直觉，情绪是今天的指南针。", "适合独处充电，或深度连接一个人。", "用温柔的方式处理敏感话题。"],
  };

  /* ---------- 塔罗（大阿尔克纳 22 张）---------- */
  var TAROT = [
    { n: 0, name: "愚者", kw: "新的开始 · 无限可能", up: "带着纯真出发，未知本身就是礼物。", man: "写下一件你想「重新开始」的小事，今天迈出第一步。" },
    { n: 1, name: "魔术师", kw: "创造 · 显化力", up: "你已拥有把意念化为现实的材料。", man: "对镜说：「我有能力创造我想要的。」连说三遍。" },
    { n: 2, name: "女祭司", kw: "直觉 · 内在智慧", up: "答案不在外面，而在你的安静里。", man: "闭眼深呼吸三次，问自己一个问题，记下浮现的第一个词。" },
    { n: 3, name: "皇后", kw: "丰盛 · 滋养", up: "允许自己被爱、被滋养、被看见。", man: "今天做一件让自己舒服的小确幸（一杯好茶/一段散步）。" },
    { n: 4, name: "皇帝", kw: "秩序 · 掌控", up: "用结构把混乱理顺，你说了算。", man: "列一张「今天必须完成的 3 件事」，做完就奖励自己。" },
    { n: 5, name: "教皇", kw: "传承 · 信念", up: "向有经验的人学习，少走弯路。", man: "今天向一位你信任的人请教一个小问题。" },
    { n: 6, name: "恋人", kw: "选择 · 关系", up: "遵从内心做选择，关系会回应你。", man: "对在乎的人说一句真心话。" },
    { n: 7, name: "战车", kw: "意志 · 前进", up: "锁定目标，用意志力穿越阻碍。", man: "把手机放到一边，专注做 25 分钟要紧的事。" },
    { n: 8, name: "力量", kw: "温柔 · 勇气", up: "真正的力量是温柔地驾驭情绪。", man: "当想发火时，先深呼吸，用一句话表达需求。" },
    { n: 9, name: "隐者", kw: "内省 · 独处", up: "暂时退后一步，光会自己亮起。", man: "给自己 10 分钟不被打扰的安静时间。" },
    { n: 10, name: "命运之轮", kw: "转机 · 流动", up: "变化正在发生，顺势而为最好。", man: "对一件不如意的事，试着说「也许另有安排」。" },
    { n: 11, name: "正义", kw: "平衡 · 因果", up: "公平会回来，对人对己都诚实。", man: "今天记账或复盘一笔开支，让收支清明。" },
    { n: 12, name: "倒吊人", kw: "视角 · 暂停", up: "换个角度看，卡点就成了礼物。", man: "遇到难题时，假想是朋友的问题，你会怎么劝？" },
    { n: 13, name: "死神", kw: "结束 · 重生", up: "放下旧的，新的才有空间进来。", man: "清理一个抽屉/相册，象征性地告别一段旧念。" },
    { n: 14, name: "节制", kw: "调和 · 中庸", up: "在两端之间找到属于你的节奏。", man: "工作与休息各留一点，不偏不倚地过今天。" },
    { n: 15, name: "魔鬼", kw: "束缚 · 执着", up: "看清锁链，其实钥匙在你手里。", man: "写下一样让你内耗的事，问自己：我能放下它吗？" },
    { n: 16, name: "高塔", kw: "突变 · 清醒", up: "崩塌的只是不该留的，重建更真。", man: "允许一个计划失败，留意它腾出的新可能。" },
    { n: 17, name: "星星", kw: "希望 · 疗愈", up: "黑夜之后，你仍是被祝福的。", man: "睡前写一句对明天的温柔期待。" },
    { n: 18, name: "月亮", kw: "潜意识 · 迷雾", up: "恐惧多是幻象，慢一点看清它。", man: "把盘旋的焦虑写下来，往往写完就轻了。" },
    { n: 19, name: "太阳", kw: "喜悦 · 明朗", up: "光照亮一切，今天值得开心。", man: "做一件纯粹让你笑出来的小事。" },
    { n: 20, name: "审判", kw: "觉醒 · 召唤", up: "听见内心的召唤，是时候行动。", man: "问自己：如果我不再害怕，我会去做什么？" },
    { n: 21, name: "世界", kw: "圆满 · 整合", up: "一个循环完成，你已比昨天更完整。", man: "回顾本周完成的一件事，给自己一句肯定。" },
  ];

  /* ---------- 通用池 ---------- */
  var LUCKY_COLORS = ["粉色", "白色", "浅蓝", "薄荷绿", "鹅黄", "薰衣草紫", "珊瑚橙", "奶杏色"];
  var LUCKY_DIRS = ["东方", "南方", "西方", "北方", "东南", "西南", "西北", "东北"];
  var YI_POOL = ["祈福许愿", "学习新知", "整理收纳", "主动沟通", "运动拉伸", "创作表达", "规划复盘", "社交联结", "独处充电", "理财记账", "早睡养神", "记录灵感", "表白心意", "开启新计划"];
  var JI_POOL = ["冲动决策", "过度消费", "熬夜损耗", "内耗纠结", "拖延回避", "与人争执", "暴饮暴食", "言多必失", "苛责自己"];
  var TIPS = [
    "今天适合整理收纳，清理掉不必要的物品和思绪，轻装上阵。",
    "保持节奏，不必追求完美，完成比完美更重要。",
    "多喝水、多走动，身体舒服了，心情自然好。",
    "可以尝试一件小事，哪怕只做 5 分钟也好。",
    "给自己一个拥抱，你已经做得很好了。",
    "适合安静阅读，减少社交媒体的时间。",
    "主动跟朋友聊聊天，能量会在交流中流动。",
    "适合运动，哪怕是拉伸 10 分钟也好。",
    "把今天的小确幸记下来，未来你会感谢现在的自己。",
    "允许自己慢一点，休息也是生产力。",
  ];
  var QUOTES = [
    { cn: "每一个微小的坚持，都是给未来自己的礼物。", en: "Every small persistence is a gift to your future self." },
    { cn: "不必着急，按照自己的节奏来。", en: "No need to rush, go at your own pace." },
    { cn: "今天的选择，决定明天的模样。", en: "Today's choices shape tomorrow's silhouette." },
    { cn: "温柔且有力量地活着。", en: "Live gently but with strength." },
    { cn: "小步前进，也是一种前进。", en: "Small steps forward are still steps forward." },
    { cn: "你值得拥有美好的一切。", en: "You deserve all the beautiful things." },
    { cn: "专注当下，未来自会明朗。", en: "Focus on the present, the future will become clear." },
    { cn: "你比想象中更靠近想要的生活。", en: "You are closer to the life you want than you think." },
    { cn: "显化从相信自己值得开始。", en: "Manifestation begins with believing you are worthy." },
    { cn: "把愿望说出口，宇宙才开始帮你。", en: "Say your wish aloud, and the universe starts helping." },
    { cn: "今天的你，正在成为曾经向往的大人。", en: "Today you are becoming the grown-up you once admired." },
  ];
  var MANIFEST = [
    "我允许好事发生，也允许自己接住它。",
    "我值得被爱、被支持、被温柔以待。",
    "我释放焦虑，把能量留给热爱的事。",
    "我每一步都在靠近理想的生活。",
    "我对自己说的每一句好话，都在改变我的现实。",
    "我既是扎根的大树，也是自由的风。",
  ];

  /* ---------- 工具 ---------- */
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
  function pick(arr, seed) { return arr[seed % arr.length]; }
  /* 以「今日日期」为前缀派生独立种子：日期放在最前，才能产生充分雪崩，
     保证每一项的每一天都被彻底重新洗牌（不会连续多日不变）。salt 让各分项互独立。 */
  function daySeed(salt) {
    var t = MelodiDB.todayKey();
    var s = MelodiDB.getSettings();
    var birthday = s.birthday || "2000-10-22";
    return hashStr(t + "|" + salt + "|" + birthday);
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function wxDots(wx) {
    var map = { 木: "🌳", 火: "🔥", 土: "🪨", 金: "⚙️", 水: "💧" };
    return '<span style="color:' + WX_COLOR[wx] + ';font-weight:600;">' + wx + "</span> " + (map[wx] || "");
  }

  /* ---------- 主渲染 ---------- */
  function render() {
    var settings = MelodiDB.getSettings();
    var birthday = settings.birthday || "2000-10-22";
    var bazi = (settings.bazi || "庚辰 丙戌 甲寅 甲子").trim();
    var today = MelodiDB.todayKey();
    var todayGZ = ganzhiOf(today);
    var dm = dayMaster(settings);
    var rel = relationToMaster(dm, todayGZ.gan);
    var zodiac = sunSign(birthday);

    var score = 60 + (daySeed("score") % 40);
    if (rel.key === "印" || rel.key === "比劫") score = Math.min(98, score + 6);
    if (rel.key === "官杀") score = Math.max(55, score - 6);

    var html = "";

    /* 头部 */
    html += '<div class="card" style="background:linear-gradient(135deg,var(--melodi-pink-100),var(--melodi-pink-50));border:none;">';
    html += '<div style="text-align:center;padding:8px 0;">';
    html += '<div style="font-size:var(--font-size-xl);font-weight:600;color:var(--melodi-pink-700);">今日运势 · 玄学显化</div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:4px;">生日 ' + escapeHtml(birthday) +
      " · 八字 " + escapeHtml(bazi) + " · 今日干支 " + todayGZ.gan + todayGZ.zhi + "（" + today + "）· 每日更新</div>";
    html += "</div></div>";

    /* 综合数据 */
    html += '<div class="stat-grid">';
    html += statCard(score + "/100", "综合运势");
    html += statCard(pick(LUCKY_COLORS, daySeed("color")), "幸运颜色");
    html += statCard((1 + (daySeed("num") % 9)), "幸运数字");
    html += statCard(pick(LUCKY_DIRS, daySeed("dir")), "幸运方位");
    html += "</div>";

    /* 八字 · 命盘 */
    var pillars = bazi.split(/\s+/);
    html += '<div class="card"><div class="card-header"><div class="card-title">八字 · 命盘</div></div>';
    html += '<div style="display:flex;gap:8px;justify-content:space-between;margin-bottom:12px;">';
    var pNames = ["年柱", "月柱", "日柱", "时柱"];
    for (var i = 0; i < 4; i++) {
      var pz = pillars[i] || "——";
      var pg = pz.charAt(0), pz2 = pz.charAt(1);
      html += '<div style="flex:1;text-align:center;padding:10px 4px;background:var(--bg-secondary);border-radius:var(--radius-md);">';
      html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">' + pNames[i] + "</div>";
      html += '<div style="font-size:var(--font-size-lg);font-weight:600;color:var(--text-primary);margin:4px 0;">' + escapeHtml(pz) + "</div>";
      html += '<div style="font-size:var(--font-size-xs);">' + wxDots(GAN_WX[pg] || "") + " · " + wxDots(ZHI_WX[pz2] || "") + "</div>";
      html += "</div>";
    }
    html += "</div>";
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.8;">';
    html += "日主 <b style=\"color:var(--melodi-pink-600);\">" + dm + "（" + GAN_WX[dm] + "）</b>：" +
      "如参天大树，仁厚向上、直率有主见，自带生长力。";
    html += "<br>今日天干 <b>" + todayGZ.gan + "</b> 与日主成 <b style=\"color:var(--melodi-pink-600);\">" + rel.label + "</b> 之象——" + rel.desc;
    html += "</div>";
    html += '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">';
    html += '<div style="flex:1;min-width:140px;padding:10px;background:rgba(124,196,127,.12);border-radius:var(--radius-md);"><div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">今日宜</div><div style="font-size:var(--font-size-sm);color:var(--text-primary);font-weight:500;margin-top:4px;">' + pick(YI_POOL, daySeed("yi1")) + " · " + pick(YI_POOL, daySeed("yi2")) + "</div></div>";
    html += '<div style="flex:1;min-width:140px;padding:10px;background:rgba(255,138,138,.12);border-radius:var(--radius-md);"><div style="font-size:var(--font-size-xs);color:var(--text-tertiary);">今日忌</div><div style="font-size:var(--font-size-sm);color:var(--text-primary);font-weight:500;margin-top:4px;">' + pick(JI_POOL, daySeed("ji1")) + " · " + pick(JI_POOL, daySeed("ji2")) + "</div></div>";
    html += "</div></div>";

    /* 占星 */
    html += '<div class="card"><div class="card-header"><div class="card-title">占星 · 太阳星座</div></div>';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">';
    html += '<div style="font-size:var(--font-size-lg);font-weight:600;color:var(--melodi-pink-600);">' + zodiac.name + "</div>";
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);">元素 ' + zodiac.el + " · 守护星 " + zodiac.ruler + " · 主题 「" + zodiac.key + "」</div>";
    html += "</div>";
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.8;">';
    html += "今日 " + zodiac.name + " 的能量提示：" + pick(ZODIAC_ADVICE[zodiac.el], daySeed("astro"));
    html += "<br>幸运星：<b>" + zodiac.ruler + "</b>，可朝向 <b>" + pick(LUCKY_DIRS, daySeed("dir-astro")) + "</b> 给自己一点小仪式感。";
    html += "</div></div>";

    /* 塔罗 · 显化阵 */
    html += '<div class="card"><div class="card-header"><div class="card-title">塔罗 · 今日显化阵</div></div>';
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:10px;">三张牌，对应你今天的能量流动</div>';
    var spread = [
      { tag: "过去能量", k: "past" },
      { tag: "当下指引", k: "now" },
      { tag: "未来显化", k: "future" },
    ];
    html += '<div style="display:flex;gap:8px;">';
    for (var s = 0; s < spread.length; s++) {
      var card = TAROT[daySeed("tarot-" + spread[s].k) % TAROT.length];
      html += '<div style="flex:1;padding:10px;background:linear-gradient(160deg,var(--melodi-pink-50),#fff);border:1px solid var(--melodi-pink-100);border-radius:var(--radius-md);">';
      html += '<div style="font-size:var(--font-size-xs);color:var(--melodi-pink-500);">' + spread[s].tag + "</div>";
      html += '<div style="font-size:var(--font-size-md);font-weight:600;color:var(--text-primary);margin:4px 0;">' + card.name + "</div>";
      html += '<div style="font-size:var(--font-size-xs);color:var(--melodi-pink-600);">' + card.kw + "</div>";
      html += '<div style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:6px;line-height:1.6;">' + card.up + "</div>";
      html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-top:6px;line-height:1.6;font-style:italic;">✨ 显化：' + card.man + "</div>";
      html += "</div>";
    }
    html += "</div></div>";

    /* 今日提示 */
    html += '<div class="card"><div class="card-header"><div class="card-title">今日提示</div></div>';
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.8;">' + pick(TIPS, daySeed("tip")) + "</div></div>";

    /* 每日励志 */
    var q = pick(QUOTES, daySeed("quote"));
    html += '<div class="card"><div class="card-header"><div class="card-title">每日励志</div></div>';
    html += '<div style="font-size:var(--font-size-md);color:var(--melodi-pink-600);font-weight:500;">' + escapeHtml(q.cn) + "</div>";
    html += '<div style="font-size:var(--font-size-sm);color:var(--text-tertiary);margin-top:8px;font-style:italic;">' + escapeHtml(q.en) + "</div></div>";

    /* 今日显化誓约 */
    html += '<div class="card" style="background:linear-gradient(135deg,#fff,var(--melodi-pink-50));border:1px solid var(--melodi-pink-100);">';
    html += '<div class="card-header"><div class="card-title">今日显化誓约</div></div>';
    html += '<div style="font-size:var(--font-size-md);color:var(--melodi-pink-700);font-weight:500;text-align:center;line-height:1.8;">「 ' + pick(MANIFEST, daySeed("manifest")) + " 」</div>";
    html += '<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);text-align:center;margin-top:8px;">每天默念一遍，让信念成为现实的形状。</div>';
    html += "</div>";

    return html;
  }

  function statCard(value, label) {
    return '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + "</div></div>";
  }

  return { render: render };
})();
window.FortuneModule = FortuneModule;
