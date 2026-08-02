/* ============================================
   美乐蒂工作台 - 食物热量识别
   本地食物库智能匹配 + 拍照估算 + 可选 AI 视觉接口
   ============================================ */

const MelodiFood = (function () {
  "use strict";

  /* 食物营养库
     n=名称 c=每100g热量(kcal) p=蛋白(g) f=脂肪(g) h=碳水(g) u=常见份量(g) t=分类 */
  var FOODS = [
    // 主食
    { n: "米饭", c: 116, p: 2.6, f: 0.3, h: 25.9, u: 200, t: "主食" },
    { n: "糙米饭", c: 111, p: 2.6, f: 0.9, h: 23, u: 200, t: "主食" },
    { n: "白粥", c: 46, p: 1.1, f: 0.2, h: 9.9, u: 300, t: "主食" },
    { n: "小米粥", c: 46, p: 1.4, f: 0.7, h: 8.4, u: 300, t: "主食" },
    { n: "馒头", c: 223, p: 7, f: 1.1, h: 47, u: 100, t: "主食" },
    { n: "包子", c: 227, p: 7.5, f: 6.6, h: 34, u: 100, t: "主食" },
    { n: "花卷", c: 217, p: 6.4, f: 1, h: 45.6, u: 100, t: "主食" },
    { n: "面条", c: 137, p: 4.6, f: 0.5, h: 28, u: 250, t: "主食" },
    { n: "拉面", c: 148, p: 5, f: 2.4, h: 26, u: 350, t: "主食" },
    { n: "米线", c: 99, p: 1.5, f: 0.2, h: 23, u: 300, t: "主食" },
    { n: "米粉", c: 99, p: 1.5, f: 0.2, h: 23, u: 300, t: "主食" },
    { n: "饺子", c: 240, p: 9, f: 8, h: 33, u: 200, t: "主食" },
    { n: "馄饨", c: 190, p: 8, f: 6, h: 26, u: 250, t: "主食" },
    { n: "红薯", c: 86, p: 1.6, f: 0.1, h: 20, u: 150, t: "主食" },
    { n: "紫薯", c: 82, p: 1.3, f: 0.2, h: 19, u: 150, t: "主食" },
    { n: "土豆", c: 77, p: 2, f: 0.1, h: 17, u: 150, t: "主食" },
    { n: "玉米", c: 106, p: 4, f: 1.2, h: 22.8, u: 200, t: "主食" },
    { n: "南瓜", c: 26, p: 0.7, f: 0.1, h: 5.3, u: 200, t: "主食" },
    { n: "燕麦片", c: 377, p: 15, f: 6.7, h: 61, u: 40, t: "主食" },
    { n: "全麦面包", c: 246, p: 9, f: 3.5, h: 45, u: 60, t: "主食" },
    { n: "吐司", c: 280, p: 8.7, f: 4.5, h: 51, u: 50, t: "主食" },
    { n: "炒饭", c: 180, p: 5, f: 7, h: 24, u: 300, t: "主食" },
    { n: "炒面", c: 200, p: 6, f: 8, h: 26, u: 300, t: "主食" },
    { n: "过桥米线", c: 120, p: 5, f: 3, h: 20, u: 500, t: "主食" },
    { n: "饵块", c: 130, p: 2.5, f: 0.4, h: 29, u: 200, t: "主食" },
    { n: "豌豆粉", c: 60, p: 2, f: 0.3, h: 12, u: 250, t: "主食" },

    // 肉蛋
    { n: "鸡胸肉", c: 133, p: 24, f: 3.6, h: 0, u: 150, t: "肉蛋" },
    { n: "鸡腿", c: 181, p: 16, f: 13, h: 0, u: 120, t: "肉蛋" },
    { n: "鸡翅", c: 194, p: 17, f: 14, h: 0, u: 100, t: "肉蛋" },
    { n: "牛肉", c: 125, p: 20, f: 4.2, h: 2, u: 150, t: "肉蛋" },
    { n: "牛排", c: 250, p: 26, f: 16, h: 0, u: 200, t: "肉蛋" },
    { n: "猪瘦肉", c: 143, p: 20, f: 6.2, h: 1.5, u: 150, t: "肉蛋" },
    { n: "五花肉", c: 395, p: 13, f: 37, h: 0, u: 100, t: "肉蛋" },
    { n: "排骨", c: 278, p: 18, f: 23, h: 0, u: 150, t: "肉蛋" },
    { n: "羊肉", c: 203, p: 19, f: 14, h: 0, u: 150, t: "肉蛋" },
    { n: "鸡蛋", c: 144, p: 13.3, f: 8.8, h: 2.8, u: 55, t: "肉蛋" },
    { n: "水煮蛋", c: 144, p: 13.3, f: 8.8, h: 2.8, u: 55, t: "肉蛋" },
    { n: "煎蛋", c: 200, p: 13, f: 15, h: 1, u: 60, t: "肉蛋" },
    { n: "鸡蛋羹", c: 78, p: 7, f: 5, h: 1.5, u: 150, t: "肉蛋" },
    { n: "火腿肠", c: 212, p: 14, f: 10, h: 16, u: 50, t: "肉蛋" },
    { n: "培根", c: 181, p: 23, f: 9, h: 0, u: 30, t: "肉蛋" },
    { n: "鸭肉", c: 240, p: 15.5, f: 19.7, h: 0.2, u: 150, t: "肉蛋" },

    // 水产
    { n: "鱼肉", c: 104, p: 18, f: 3.5, h: 0, u: 150, t: "水产" },
    { n: "三文鱼", c: 139, p: 17, f: 7.8, h: 0, u: 120, t: "水产" },
    { n: "带鱼", c: 127, p: 17.7, f: 4.9, h: 3.1, u: 150, t: "水产" },
    { n: "虾", c: 93, p: 18.6, f: 0.8, h: 2.8, u: 100, t: "水产" },
    { n: "虾仁", c: 48, p: 10.6, f: 0.3, h: 0.9, u: 100, t: "水产" },
    { n: "蟹", c: 103, p: 17.5, f: 2.6, h: 2.3, u: 150, t: "水产" },
    { n: "鱿鱼", c: 84, p: 17, f: 1.4, h: 0, u: 100, t: "水产" },

    // 豆制品
    { n: "豆腐", c: 82, p: 8.1, f: 3.7, h: 4.2, u: 200, t: "豆制品" },
    { n: "豆浆", c: 31, p: 3, f: 1.6, h: 1.2, u: 300, t: "豆制品" },
    { n: "豆干", c: 140, p: 16, f: 7, h: 4, u: 80, t: "豆制品" },
    { n: "腐竹", c: 459, p: 44, f: 21, h: 22, u: 40, t: "豆制品" },
    { n: "毛豆", c: 131, p: 13, f: 5, h: 10.5, u: 100, t: "豆制品" },

    // 蔬菜
    { n: "西兰花", c: 36, p: 4.1, f: 0.6, h: 4.3, u: 150, t: "蔬菜" },
    { n: "生菜", c: 15, p: 1.3, f: 0.3, h: 2, u: 100, t: "蔬菜" },
    { n: "白菜", c: 17, p: 1.5, f: 0.1, h: 3.2, u: 200, t: "蔬菜" },
    { n: "菠菜", c: 24, p: 2.6, f: 0.3, h: 4.5, u: 150, t: "蔬菜" },
    { n: "青菜", c: 15, p: 1.5, f: 0.3, h: 2.4, u: 200, t: "蔬菜" },
    { n: "空心菜", c: 20, p: 2.2, f: 0.3, h: 3.6, u: 150, t: "蔬菜" },
    { n: "黄瓜", c: 16, p: 0.8, f: 0.2, h: 2.9, u: 200, t: "蔬菜" },
    { n: "番茄", c: 20, p: 0.9, f: 0.2, h: 4, u: 150, t: "蔬菜" },
    { n: "西红柿", c: 20, p: 0.9, f: 0.2, h: 4, u: 150, t: "蔬菜" },
    { n: "胡萝卜", c: 39, p: 1, f: 0.2, h: 8.8, u: 100, t: "蔬菜" },
    { n: "茄子", c: 23, p: 1.1, f: 0.2, h: 4.9, u: 200, t: "蔬菜" },
    { n: "青椒", c: 22, p: 1.4, f: 0.3, h: 5.4, u: 100, t: "蔬菜" },
    { n: "蘑菇", c: 20, p: 2.7, f: 0.1, h: 4.1, u: 100, t: "蔬菜" },
    { n: "香菇", c: 26, p: 2.2, f: 0.3, h: 5.2, u: 100, t: "蔬菜" },
    { n: "木耳", c: 21, p: 1.5, f: 0.2, h: 6, u: 100, t: "蔬菜" },
    { n: "豆芽", c: 18, p: 2.1, f: 0.1, h: 2.9, u: 150, t: "蔬菜" },
    { n: "海带", c: 13, p: 1.2, f: 0.1, h: 2.1, u: 100, t: "蔬菜" },
    { n: "冬瓜", c: 12, p: 0.4, f: 0.2, h: 2.6, u: 200, t: "蔬菜" },
    { n: "苦瓜", c: 22, p: 1, f: 0.1, h: 4.9, u: 150, t: "蔬菜" },
    { n: "沙拉", c: 60, p: 2, f: 3.5, h: 6, u: 250, t: "蔬菜" },
    { n: "凉拌菜", c: 55, p: 1.8, f: 3.5, h: 5, u: 150, t: "蔬菜" },

    // 水果
    { n: "苹果", c: 53, p: 0.2, f: 0.2, h: 13.5, u: 200, t: "水果" },
    { n: "香蕉", c: 93, p: 1.4, f: 0.2, h: 22, u: 120, t: "水果" },
    { n: "橙子", c: 48, p: 0.8, f: 0.2, h: 11.1, u: 200, t: "水果" },
    { n: "葡萄", c: 45, p: 0.4, f: 0.2, h: 10.3, u: 150, t: "水果" },
    { n: "西瓜", c: 31, p: 0.5, f: 0.3, h: 6.8, u: 300, t: "水果" },
    { n: "草莓", c: 32, p: 1, f: 0.2, h: 7.1, u: 150, t: "水果" },
    { n: "蓝莓", c: 57, p: 0.7, f: 0.3, h: 14.5, u: 100, t: "水果" },
    { n: "猕猴桃", c: 61, p: 0.8, f: 0.6, h: 14.5, u: 100, t: "水果" },
    { n: "芒果", c: 60, p: 0.6, f: 0.4, h: 15, u: 200, t: "水果" },
    { n: "圣女果", c: 22, p: 0.9, f: 0.2, h: 4.4, u: 150, t: "水果" },
    { n: "牛油果", c: 160, p: 2, f: 15, h: 8.5, u: 150, t: "水果" },
    { n: "梨", c: 51, p: 0.4, f: 0.2, h: 13.3, u: 200, t: "水果" },
    { n: "桃子", c: 48, p: 0.9, f: 0.1, h: 12.2, u: 180, t: "水果" },
    { n: "菠萝", c: 44, p: 0.5, f: 0.1, h: 10.8, u: 200, t: "水果" },
    { n: "火龙果", c: 55, p: 1.1, f: 0.2, h: 13.3, u: 250, t: "水果" },
    { n: "柚子", c: 42, p: 0.8, f: 0.2, h: 9.5, u: 200, t: "水果" },

    // 奶类
    { n: "牛奶", c: 54, p: 3, f: 3.2, h: 3.4, u: 250, t: "奶类" },
    { n: "脱脂牛奶", c: 33, p: 3.4, f: 0.1, h: 5, u: 250, t: "奶类" },
    { n: "酸奶", c: 72, p: 2.5, f: 2.7, h: 9.3, u: 150, t: "奶类" },
    { n: "无糖酸奶", c: 56, p: 3.5, f: 3, h: 4, u: 150, t: "奶类" },
    { n: "希腊酸奶", c: 97, p: 9, f: 5, h: 4, u: 150, t: "奶类" },
    { n: "奶酪", c: 328, p: 25, f: 24, h: 3.5, u: 20, t: "奶类" },

    // 坚果
    { n: "核桃", c: 646, p: 15, f: 59, h: 19, u: 20, t: "坚果" },
    { n: "杏仁", c: 578, p: 21, f: 50, h: 22, u: 20, t: "坚果" },
    { n: "腰果", c: 559, p: 17, f: 44, h: 30, u: 20, t: "坚果" },
    { n: "花生", c: 567, p: 26, f: 49, h: 16, u: 20, t: "坚果" },
    { n: "开心果", c: 562, p: 20, f: 45, h: 28, u: 20, t: "坚果" },
    { n: "瓜子", c: 606, p: 19, f: 53, h: 20, u: 20, t: "坚果" },

    // 饮品
    { n: "咖啡", c: 1, p: 0.1, f: 0, h: 0, u: 250, t: "饮品" },
    { n: "拿铁", c: 55, p: 3, f: 3, h: 5, u: 350, t: "饮品" },
    { n: "美式", c: 2, p: 0.1, f: 0, h: 0.3, u: 350, t: "饮品" },
    { n: "奶茶", c: 90, p: 1.5, f: 3.5, h: 13, u: 500, t: "饮品" },
    { n: "可乐", c: 43, p: 0, f: 0, h: 10.8, u: 330, t: "饮品" },
    { n: "果汁", c: 45, p: 0.3, f: 0.1, h: 11, u: 250, t: "饮品" },
    { n: "豆奶", c: 40, p: 2.4, f: 1.5, h: 4.5, u: 250, t: "饮品" },
    { n: "普洱茶", c: 1, p: 0, f: 0, h: 0.2, u: 250, t: "饮品" },

    // 零食
    { n: "薯片", c: 536, p: 6.6, f: 35, h: 50, u: 50, t: "零食" },
    { n: "饼干", c: 435, p: 7, f: 17, h: 65, u: 30, t: "零食" },
    { n: "巧克力", c: 546, p: 5, f: 31, h: 61, u: 25, t: "零食" },
    { n: "蛋糕", c: 347, p: 5, f: 15, h: 48, u: 100, t: "零食" },
    { n: "面包", c: 312, p: 8, f: 5, h: 58, u: 80, t: "零食" },
    { n: "冰淇淋", c: 207, p: 3.5, f: 11, h: 24, u: 100, t: "零食" },
    { n: "月饼", c: 400, p: 6, f: 15, h: 60, u: 80, t: "零食" },
    { n: "泡面", c: 470, p: 9, f: 21, h: 60, u: 100, t: "零食" },
    { n: "关东煮", c: 100, p: 6, f: 4, h: 10, u: 200, t: "零食" },
    { n: "烤肠", c: 250, p: 12, f: 20, h: 6, u: 60, t: "零食" },
    { n: "鸡蛋仔", c: 320, p: 6, f: 12, h: 47, u: 100, t: "零食" },
    { n: "布丁", c: 130, p: 3, f: 4, h: 20, u: 100, t: "零食" },

    // 常见菜品（整份估算）
    { n: "番茄炒蛋", c: 105, p: 6, f: 7, h: 4, u: 250, t: "菜品" },
    { n: "宫保鸡丁", c: 180, p: 13, f: 11, h: 8, u: 250, t: "菜品" },
    { n: "红烧肉", c: 460, p: 12, f: 43, h: 5, u: 200, t: "菜品" },
    { n: "麻婆豆腐", c: 130, p: 8, f: 9, h: 5, u: 250, t: "菜品" },
    { n: "鱼香肉丝", c: 160, p: 10, f: 10, h: 8, u: 250, t: "菜品" },
    { n: "青椒肉丝", c: 145, p: 11, f: 9, h: 5, u: 250, t: "菜品" },
    { n: "水煮鱼", c: 200, p: 16, f: 14, h: 3, u: 350, t: "菜品" },
    { n: "小炒肉", c: 210, p: 12, f: 16, h: 5, u: 250, t: "菜品" },
    { n: "酸辣土豆丝", c: 90, p: 2, f: 5, h: 11, u: 200, t: "菜品" },
    { n: "干锅花菜", c: 120, p: 4, f: 8, h: 8, u: 250, t: "菜品" },
    { n: "汽锅鸡", c: 150, p: 18, f: 8, h: 1, u: 300, t: "菜品" },
    { n: "火锅", c: 200, p: 12, f: 14, h: 8, u: 400, t: "菜品" },
    { n: "烧烤", c: 280, p: 18, f: 20, h: 6, u: 200, t: "菜品" },
    { n: "汉堡", c: 260, p: 13, f: 12, h: 26, u: 200, t: "菜品" },
    { n: "披萨", c: 270, p: 11, f: 10, h: 33, u: 200, t: "菜品" },
    { n: "炸鸡", c: 279, p: 20, f: 18, h: 9, u: 150, t: "菜品" },
    { n: "薯条", c: 312, p: 3.4, f: 15, h: 41, u: 100, t: "菜品" },
    { n: "寿司", c: 143, p: 5, f: 1.5, h: 28, u: 200, t: "菜品" }
  ];

  /* ===== 模糊匹配：输入名字自动带出营养数据 ===== */
  function match(input) {
    if (!input) return [];
    var q = String(input).trim().toLowerCase();
    if (!q) return [];
    var exact = [], starts = [], contains = [];
    FOODS.forEach(function (f) {
      var n = f.n.toLowerCase();
      if (n === q) exact.push(f);
      else if (n.indexOf(q) === 0) starts.push(f);
      else if (n.indexOf(q) >= 0 || q.indexOf(n) >= 0) contains.push(f);
    });
    return exact.concat(starts, contains).slice(0, 8);
  }

  /* 按份量算营养：grams 不传则用常见份量 */
  function calc(food, grams) {
    var g = grams || food.u;
    var k = g / 100;
    return {
      name: food.n,
      grams: g,
      calories: Math.round(food.c * k),
      protein: Math.round(food.p * k * 10) / 10,
      fat: Math.round(food.f * k * 10) / 10,
      carbs: Math.round(food.h * k * 10) / 10,
      type: food.t,
    };
  }

  /* 解析一整句描述：「米饭一碗 番茄炒蛋 苹果」→ 逐项估算并汇总 */
  function parseText(text) {
    if (!text) return { items: [], total: emptyNutrition() };
    var parts = String(text).split(/[,，、\s\+和]+/).filter(Boolean);
    var items = [];
    parts.forEach(function (p) {
      // 提取份量：支持「米饭200g」「鸡蛋2个」「牛奶1杯」
      var gramMatch = p.match(/(\d+(?:\.\d+)?)\s*(g|克|ml|毫升)/i);
      var countMatch = p.match(/(\d+(?:\.\d+)?)\s*(个|只|杯|碗|片|块|根|份|袋|盒)/);
      var name = p.replace(/(\d+(?:\.\d+)?)\s*(g|克|ml|毫升|个|只|杯|碗|片|块|根|份|袋|盒)/gi, "").trim();
      if (!name) return;
      var hits = match(name);
      if (hits.length === 0) return;
      var food = hits[0];
      var grams = food.u;
      if (gramMatch) grams = parseFloat(gramMatch[1]);
      else if (countMatch) grams = food.u * parseFloat(countMatch[1]);
      items.push(calc(food, grams));
    });
    return { items: items, total: sum(items) };
  }

  function emptyNutrition() {
    return { calories: 0, protein: 0, fat: 0, carbs: 0 };
  }

  function sum(items) {
    var t = emptyNutrition();
    items.forEach(function (i) {
      t.calories += i.calories;
      t.protein += i.protein;
      t.fat += i.fat;
      t.carbs += i.carbs;
    });
    t.protein = Math.round(t.protein * 10) / 10;
    t.fat = Math.round(t.fat * 10) / 10;
    t.carbs = Math.round(t.carbs * 10) / 10;
    return t;
  }

  /* ===== 拍照分析 =====
     配置了 AI 视觉接口就走真识别，否则用图像特征给出候选推荐 */
  function analyzePhoto(base64, callback) {
    var settings = MelodiDB.getSettings();
    if (settings.visionApiUrl && settings.visionApiKey) {
      aiRecognize(base64, settings, function (err, result) {
        if (err || !result) {
          callback(null, localGuess(base64));
        } else {
          callback(null, result);
        }
      });
    } else {
      // 本地估算需要图片加载完成，异步返回
      localGuessAsync(base64, function (guess) { callback(null, guess); });
    }
  }

  /* 调用视觉大模型识别（OpenAI 兼容格式，如通义千问VL / 智谱GLM-4V） */
  function aiRecognize(base64, settings, callback) {
    var prompt = "识别这张图片里的食物，返回严格的 JSON，不要任何多余文字，格式：" +
      '{"foods":[{"name":"食物名","grams":估计克重数字,"calories":热量数字,"protein":蛋白数字,"fat":脂肪数字,"carbs":碳水数字}]}';

    fetch(settings.visionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + settings.visionApiKey,
      },
      body: JSON.stringify({
        model: settings.visionModel || "qwen-vl-plus",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64 } },
          ],
        }],
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var txt = data && data.choices && data.choices[0] &&
          data.choices[0].message && data.choices[0].message.content;
        if (!txt) return callback("空响应");
        var m = txt.match(/\{[\s\S]*\}/);
        if (!m) return callback("解析失败");
        var parsed = JSON.parse(m[0]);
        var items = (parsed.foods || []).map(function (f) {
          return {
            name: f.name,
            grams: f.grams || 100,
            calories: Math.round(f.calories || 0),
            protein: f.protein || 0,
            fat: f.fat || 0,
            carbs: f.carbs || 0,
            type: "AI识别",
          };
        });
        callback(null, { source: "ai", items: items, total: sum(items), candidates: [] });
      })
      .catch(function (e) { callback(e); });
  }

  /* 本地图像特征估算：按主色调推测食物类别，给出候选让用户一键确认 */
  function localGuessAsync(base64, callback) {
    var img = new Image();
    img.onload = function () {
      try {
        var canvas = document.createElement("canvas");
        var size = 40;
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        var d = ctx.getImageData(0, 0, size, size).data;
        var r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        r = r / n; g = g / n; b = b / n;
        callback(guessByColor(r, g, b));
      } catch (e) {
        callback(guessByColor(180, 160, 140));
      }
    };
    img.onerror = function () { callback(guessByColor(180, 160, 140)); };
    img.src = base64;
  }

  function localGuess(base64) {
    return guessByColor(180, 160, 140);
  }

  /* 主色 → 食物类别倾向。粗略但能大幅缩短选择路径 */
  function guessByColor(r, g, b) {
    var cats, hint;
    var bright = (r + g + b) / 3;

    if (g > r && g > b + 12) {
      cats = ["蔬菜"]; hint = "看起来是蔬菜类，绿色占主导";
    } else if (r > 150 && g < 120 && b < 110) {
      cats = ["菜品", "肉蛋"]; hint = "偏红棕色，可能是肉类或红烧类菜品";
    } else if (bright > 195) {
      cats = ["主食", "奶类"]; hint = "颜色偏白亮，可能是米饭、面食或乳制品";
    } else if (r > 180 && g > 140 && b < 120) {
      cats = ["主食", "菜品"]; hint = "偏金黄色，可能是煎炸类或蛋类";
    } else {
      cats = ["菜品", "主食"]; hint = "颜色不好判断，从下面挑一个最接近的";
    }

    var candidates = FOODS.filter(function (f) { return cats.indexOf(f.t) >= 0; }).slice(0, 12);
    return { source: "local", items: [], total: emptyNutrition(), candidates: candidates, hint: hint };
  }

  /* ===== 每日营养汇总 ===== */
  function getDayNutrition(dateStr) {
    var diet = MelodiDB.getDayData("diet", dateStr) || {};
    var meals = diet.meals || {};
    var total = emptyNutrition();
    Object.keys(meals).forEach(function (k) {
      var m = meals[k];
      if (!m) return;
      // 兼容：单条对象 或 多条数组
      var list = Array.isArray(m) ? m : [m];
      list.forEach(function (it) {
        if (!it) return;
        total.calories += parseInt(it.calories) || 0;
        total.protein += parseFloat(it.protein) || 0;
        total.fat += parseFloat(it.fat) || 0;
        total.carbs += parseFloat(it.carbs) || 0;
      });
    });
    total.protein = Math.round(total.protein * 10) / 10;
    total.fat = Math.round(total.fat * 10) / 10;
    total.carbs = Math.round(total.carbs * 10) / 10;
    return total;
  }

  return {
    FOODS: FOODS,
    match: match,
    calc: calc,
    parseText: parseText,
    analyzePhoto: analyzePhoto,
    getDayNutrition: getDayNutrition,
    sum: sum,
  };
})();
