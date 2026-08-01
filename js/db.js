/* ============================================
   美乐蒂工作台 - 数据存储引擎
   本地 LocalStorage + Supabase 云端同步
   ============================================ */

const MelodiDB = (function () {
  const PREFIX = "melodi:";
  const SETTINGS_KEY = PREFIX + "settings";

  // Supabase 配置（批次4填充实际值）
  let supabaseClient = null;
  let supabaseConfig = {
    url: "",
    anonKey: "",
  };

  // 默认设置
  const defaultSettings = {
    birthday: "2000-10-22",
    sleepTarget: 7.5,
    waterTarget: 2000,
    sidebarOrder: [
      "growth", "exercise", "fortune", "finance",
      "savings", "english", "invest", "news",
      "exam", "weight", "language"
    ],
    customCategories: [],
    supabaseUrl: "",
    supabaseKey: "",
    pomodoroDuration: 25,
  };

  /* ===== 工具函数 ===== */
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function dateKey(date) {
    if (typeof date === "string") return date;
    const d = date instanceof Date ? date : new Date(date);
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function getMonthRange(date) {
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: dateKey(start), end: dateKey(end) };
  }

  function getLastNKeys(n) {
    const keys = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      keys.push(dateKey(d));
    }
    return keys;
  }

  /* ===== 通用读写 ===== */
  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[MelodiDB] 读取失败:", key, e);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      markDirty();
      return true;
    } catch (e) {
      console.error("[MelodiDB] 写入失败:", key, e);
      // 存储超限时自动清理最旧的版本快照后重试一次
      if (e && (e.name === "QuotaExceededError" || e.code === 22)) {
        pruneSnapshots(3);
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify(value));
          return true;
        } catch (e2) {
          emit("storage:full", { key: key });
        }
      }
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /* ===== 设置 ===== */
  function getSettings() {
    return Object.assign({}, defaultSettings, get("settings", {}));
  }

  function setSettings(partial) {
    const current = getSettings();
    const updated = Object.assign({}, current, partial);
    set("settings", updated);
    return updated;
  }

  /* ===== 按日期存储的数据 ===== */
  // 每个模块的每日数据存储格式: { "2026-08-01": {...}, "2026-08-02": {...} }

  function getDayData(module, date) {
    const key = date || todayKey();
    const all = get("daily:" + module, {});
    return all[key] || null;
  }

  function setDayData(module, data, date) {
    const key = date || todayKey();
    const all = get("daily:" + module, {});
    // 打上修改时间戳，云端冲突时以最后修改时间为准
    data._updatedAt = new Date().toISOString();
    all[key] = data;
    set("daily:" + module, all);
    markDirty();
    // 触发云端同步（如果配置了）
    scheduleCloudSync("daily:" + module, key, data);
    return data;
  }

  function updateDayData(module, partial, date) {
    const key = date || todayKey();
    const all = get("daily:" + module, {});
    const current = all[key] || {};
    all[key] = Object.assign({}, current, partial);
    all[key]._updatedAt = new Date().toISOString();
    set("daily:" + module, all);
    markDirty();
    scheduleCloudSync("daily:" + module, key, all[key]);
    return all[key];
  }

  function getMonthData(module, date) {
    const range = getMonthRange(date);
    const all = get("daily:" + module, {});
    const result = {};
    for (const key in all) {
      if (key >= range.start && key <= range.end) {
        result[key] = all[key];
      }
    }
    return result;
  }

  function getRangeData(module, startDate, endDate) {
    const all = get("daily:" + module, {});
    const result = {};
    for (const key in all) {
      if (key >= startDate && key <= endDate) {
        result[key] = all[key];
      }
    }
    return result;
  }

  function getLastNDays(module, n) {
    const keys = getLastNKeys(n);
    const all = get("daily:" + module, {});
    const result = {};
    keys.forEach(k => {
      if (all[k]) result[k] = all[k];
    });
    return result;
  }

  /* ===== 列表型数据（任务、灵感等） ===== */
  function getList(key) {
    return get("list:" + key, []);
  }

  function addToList(key, item) {
    const list = getList(key);
    item.id = item.id || Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    item.createdAt = item.createdAt || new Date().toISOString();
    list.unshift(item);
    set("list:" + key, list);
    scheduleCloudSync("list:" + key, null, list);
    return item;
  }

  function updateInList(key, id, partial) {
    const list = getList(key);
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], partial);
      list[idx].updatedAt = new Date().toISOString();
      set("list:" + key, list);
      scheduleCloudSync("list:" + key, null, list);
      return list[idx];
    }
    return null;
  }

  function removeFromList(key, id) {
    const list = getList(key);
    const filtered = list.filter(i => i.id !== id);
    set("list:" + key, filtered);
    scheduleCloudSync("list:" + key, null, filtered);
    return filtered;
  }

  function clearList(key) {
    set("list:" + key, []);
    scheduleCloudSync("list:" + key, null, []);
  }

  /* ===== 打卡快捷操作 ===== */
  function toggleCheckin(module, checkKey, date) {
    const key = date || todayKey();
    const all = get("daily:" + module, {});
    const current = all[key] || {};
    if (!current.checkins) current.checkins = {};
    current.checkins[checkKey] = !current.checkins[checkKey];
    current._updatedAt = new Date().toISOString();
    all[key] = current;
    set("daily:" + module, all);
    markDirty();
    scheduleCloudSync("daily:" + module, key, current);
    return current.checkins[checkKey];
  }

  function getCheckins(module, date) {
    const data = getDayData(module, date);
    return (data && data.checkins) || {};
  }

  /* ===== 云端同步（Supabase 双向同步） ===== */
  let syncTimer = null;
  let syncStatus = "local"; // local | online | offline | syncing
  let syncQueue = [];
  let lastFullSync = null;
  const TABLE_DAILY = "melodi_daily";
  const TABLE_LISTS = "melodi_lists";
  const TABLE_SETTINGS = "melodi_settings";
  const DEVICE_ID = (function () {
    let id = localStorage.getItem("melodi:deviceId");
    if (!id) {
      id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("melodi:deviceId", id);
    }
    return id;
  })();

  function initSupabase(url, key) {
    supabaseConfig.url = url;
    supabaseConfig.anonKey = key;
    if (url && key && typeof window.supabase !== "undefined") {
      try {
        supabaseClient = window.supabase.createClient(url, key, {
          auth: { persistSession: false },
        });
        syncStatus = "online";
        // 保存配置到设置
        setSettings({ supabaseUrl: url, supabaseKey: key });
        // 启动时拉取云端数据
        setTimeout(() => pullFromCloud(), 500);
        updateSyncIndicator();
        return true;
      } catch (e) {
        console.warn("[MelodiDB] Supabase 初始化失败:", e);
        syncStatus = "offline";
      }
    }
    return false;
  }

  /* 从设置中自动初始化 Supabase */
  function autoInitSupabase() {
    const settings = getSettings();
    if (settings.supabaseUrl && settings.supabaseKey) {
      return initSupabase(settings.supabaseUrl, settings.supabaseKey);
    }
    return false;
  }

  function disconnectSupabase() {
    supabaseClient = null;
    supabaseConfig.url = "";
    supabaseConfig.anonKey = "";
    setSettings({ supabaseUrl: "", supabaseKey: "" });
    syncStatus = "local";
    updateSyncIndicator();
  }

  function scheduleCloudSync(module, dateKey, data) {
    if (!supabaseClient) {
      syncStatus = "local";
      updateSyncIndicator();
      return;
    }
    // 加入同步队列
    syncQueue.push({ module, dateKey, data, timestamp: Date.now() });
    // 延迟同步，避免频繁写入
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      processSyncQueue();
    }, 2000);
  }

  /* 处理同步队列 - 将本地变更推送到云端 */
  async function processSyncQueue() {
    if (!supabaseClient || syncQueue.length === 0) return;
    syncStatus = "syncing";
    updateSyncIndicator();

    const batch = syncQueue.splice(0, syncQueue.length);
    const errors = [];

    for (const item of batch) {
      try {
        if (item.module.startsWith("list:")) {
          // 列表型数据同步
          const listKey = item.module.replace("list:", "");
          const { error } = await supabaseClient
            .from(TABLE_LISTS)
            .upsert({
              list_key: listKey,
              data: JSON.stringify(item.data),
              device_id: DEVICE_ID,
              updated_at: new Date().toISOString(),
            }, { onConflict: "list_key" });
          if (error) errors.push(error);
        } else if (item.module.startsWith("daily:")) {
          // 按日期型数据同步
          const moduleName = item.module.replace("daily:", "");
          const { error } = await supabaseClient
            .from(TABLE_DAILY)
            .upsert({
              module: moduleName,
              date_key: item.dateKey,
              data: JSON.stringify(item.data),
              device_id: DEVICE_ID,
              updated_at: new Date().toISOString(),
            }, { onConflict: "module,date_key" });
          if (error) errors.push(error);
        }
      } catch (e) {
        console.warn("[MelodiDB] 同步条目失败:", e);
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      console.warn("[MelodiDB] 同步完成，" + errors.length + " 个错误");
      syncStatus = "online"; // 部分成功仍标记在线
    } else {
      syncStatus = "online";
      lastFullSync = new Date().toISOString();
    }
    updateSyncIndicator();
  }

  /* 从云端拉取全部数据到本地 */
  async function pullFromCloud() {
    if (!supabaseClient) return false;
    syncStatus = "syncing";
    updateSyncIndicator();

    try {
      // 拉取每日数据
      const { data: dailyData, error: dailyErr } = await supabaseClient
        .from(TABLE_DAILY)
        .select("module, date_key, data, updated_at")
        .order("updated_at", { ascending: false });

      if (dailyErr) throw dailyErr;

      if (dailyData && dailyData.length > 0) {
        const merged = {};
        for (const row of dailyData) {
          const localKey = "melodi:daily:" + row.module;
          if (!merged[row.module]) merged[row.module] = JSON.parse(localStorage.getItem(localKey) || "{}");
          try {
            const parsed = JSON.parse(row.data);
            // 只在本地没有或云端更新时覆盖
            if (!merged[row.module][row.date_key] || 
                new Date(row.updated_at) > new Date(merged[row.module][row.date_key]._updatedAt || 0)) {
              merged[row.module][row.date_key] = parsed;
            }
          } catch (e) {}
        }
        for (const mod in merged) {
          localStorage.setItem("melodi:daily:" + mod, JSON.stringify(merged[mod]));
        }
      }

      // 拉取列表数据
      const { data: listData, error: listErr } = await supabaseClient
        .from(TABLE_LISTS)
        .select("list_key, data, updated_at")
        .order("updated_at", { ascending: false });

      if (listErr) throw listErr;

      if (listData && listData.length > 0) {
        for (const row of listData) {
          try {
            const parsed = JSON.parse(row.data);
            localStorage.setItem("melodi:list:" + row.list_key, JSON.stringify(parsed));
          } catch (e) {}
        }
      }

      syncStatus = "online";
      lastFullSync = new Date().toISOString();
      updateSyncIndicator();
      console.log("[MelodiDB] 云端数据拉取完成，共 " + (dailyData?.length || 0) + " 条每日数据，" + (listData?.length || 0) + " 条列表数据");
      return true;
    } catch (e) {
      console.warn("[MelodiDB] 云端拉取失败:", e);
      syncStatus = "offline";
      updateSyncIndicator();
      return false;
    }
  }

  /* 手动触发全量同步 */
  async function fullSync() {
    if (!supabaseClient) {
      return { success: false, message: "未连接云端" };
    }
    // 先拉取
    await pullFromCloud();
    // 再推送全部本地数据
    syncStatus = "syncing";
    updateSyncIndicator();

    try {
      // 推送所有每日数据
      const dailyKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("melodi:daily:")) dailyKeys.push(k);
      }
      for (const k of dailyKeys) {
        const moduleName = k.replace("melodi:daily:", "");
        const allData = JSON.parse(localStorage.getItem(k) || "{}");
        for (const dateKey in allData) {
          const { error } = await supabaseClient
            .from(TABLE_DAILY)
            .upsert({
              module: moduleName,
              date_key: dateKey,
              data: JSON.stringify(allData[dateKey]),
              device_id: DEVICE_ID,
              updated_at: new Date().toISOString(),
            }, { onConflict: "module,date_key" });
          if (error) console.warn("[MelodiDB] 推送失败:", moduleName, dateKey, error);
        }
      }

      // 推送所有列表数据
      const listKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("melodi:list:")) listKeys.push(k);
      }
      for (const k of listKeys) {
        const listKey = k.replace("melodi:list:", "");
        const data = localStorage.getItem(k) || "[]";
        const { error } = await supabaseClient
          .from(TABLE_LISTS)
          .upsert({
            list_key: listKey,
            data: data,
            device_id: DEVICE_ID,
            updated_at: new Date().toISOString(),
          }, { onConflict: "list_key" });
        if (error) console.warn("[MelodiDB] 推送列表失败:", listKey, error);
      }

      syncStatus = "online";
      lastFullSync = new Date().toISOString();
      updateSyncIndicator();
      return { success: true, message: "全量同步完成" };
    } catch (e) {
      console.warn("[MelodiDB] 全量同步失败:", e);
      syncStatus = "offline";
      updateSyncIndicator();
      return { success: false, message: "同步失败: " + e.message };
    }
  }

  function updateSyncIndicator() {
    const dot = document.getElementById("syncStatus");
    if (!dot) return;
    const dotEl = dot.querySelector(".sync-dot");
    const textEl = dot.querySelector(".sync-text");
    if (dotEl) {
      dotEl.className = "sync-dot " + syncStatus;
    }
    const labels = {
      local: "本地存储中",
      online: lastFullSync ? "云端已同步" : "云端已连接",
      offline: "离线模式",
      syncing: "同步中...",
    };
    if (textEl) textEl.textContent = labels[syncStatus] || "本地存储中";
  }

  function getSyncStatus() {
    return {
      status: syncStatus,
      lastSync: lastFullSync,
      deviceId: DEVICE_ID,
      connected: !!supabaseClient,
    };
  }

  function isSupabaseConnected() {
    return !!supabaseClient;
  }

  /* ===== 数据导出/导入 ===== */
  function exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) { }
      }
    }
    return data;
  }

  function importAll(data) {
    Object.keys(data).forEach(key => {
      if (key.startsWith(PREFIX)) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    });
  }

  /* ===== 清理旧数据（可选） ===== */
  function getStorageSize() {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        size += (localStorage.getItem(key) || "").length;
      }
    }
    return Math.round(size / 1024); // KB
  }

  /* ============================================
     自动保存 + 版本快照 + 草稿托管
     规范要求：每 30 秒自动保存一次，输入内容不丢失
     ============================================ */
  const SNAPSHOT_KEY = "melodi:snapshots";
  const SNAPSHOT_MAX = 10;          // 最多保留 10 个历史版本
  const AUTOSAVE_INTERVAL = 30000;  // 30 秒
  let dirty = false;                // 自上次快照后是否有变更
  let autoSaveTimer = null;
  let lastAutoSaveAt = null;
  const draftRegistry = {};         // 输入框草稿：key -> 读取函数

  function markDirty() {
    dirty = true;
  }

  /* 读取快照列表（不走 set，避免递归标脏） */
  function readSnapshots() {
    try {
      return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeSnapshots(list) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      // 快照写不下就砍掉一半再试
      if (list.length > 2) return writeSnapshots(list.slice(0, Math.floor(list.length / 2)));
      return false;
    }
  }

  function pruneSnapshots(keep) {
    const list = readSnapshots();
    writeSnapshots(list.slice(0, keep || 3));
  }

  /* 生成一份当前全量数据的版本快照 */
  function createSnapshot(label) {
    const payload = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // 快照本身与设备 ID 不入快照，避免体积翻倍
      if (!key || !key.startsWith(PREFIX)) continue;
      if (key === SNAPSHOT_KEY || key === "melodi:deviceId") continue;
      payload[key] = localStorage.getItem(key);
    }
    const snap = {
      id: "snap_" + Date.now(),
      at: new Date().toISOString(),
      label: label || "自动保存",
      size: JSON.stringify(payload).length,
      payload: payload,
    };
    const list = readSnapshots();
    list.unshift(snap);
    writeSnapshots(list.slice(0, SNAPSHOT_MAX));
    lastAutoSaveAt = snap.at;
    return snap;
  }

  function listSnapshots() {
    return readSnapshots().map(s => ({
      id: s.id, at: s.at, label: s.label, size: s.size,
    }));
  }

  /* 回滚到指定历史版本 */
  function restoreSnapshot(id) {
    const list = readSnapshots();
    const snap = list.find(s => s.id === id);
    if (!snap) return false;
    // 回滚前先给当前状态留一份，防止误操作
    createSnapshot("回滚前自动备份");
    Object.keys(snap.payload).forEach(key => {
      localStorage.setItem(key, snap.payload[key]);
    });
    emit("snapshot:restored", snap);
    return true;
  }

  /* 输入框草稿托管：注册后由自动保存统一落盘 */
  function registerDraft(key, readFn) {
    draftRegistry[key] = readFn;
  }

  function unregisterDraft(key) {
    delete draftRegistry[key];
  }

  function getDraft(key, fallback) {
    return get("draft:" + key, fallback);
  }

  function saveDraft(key, value) {
    set("draft:" + key, value);
  }

  function clearDraft(key) {
    remove("draft:" + key);
  }

  /* 把所有已注册的输入框草稿刷一遍盘 */
  function flushDrafts() {
    let count = 0;
    Object.keys(draftRegistry).forEach(key => {
      try {
        const val = draftRegistry[key]();
        if (val !== undefined && val !== null && val !== "") {
          set("draft:" + key, val);
          count++;
        }
      } catch (e) { /* 元素已卸载，忽略 */ }
    });
    return count;
  }

  function autoSaveTick() {
    flushDrafts();
    if (!dirty) return;
    createSnapshot("自动保存");
    dirty = false;
    emit("autosave", { at: lastAutoSaveAt });
  }

  function startAutoSave() {
    if (autoSaveTimer) return;
    autoSaveTimer = setInterval(autoSaveTick, AUTOSAVE_INTERVAL);
    // 关闭/切后台时立刻抢存一次，防止拔电丢数据
    window.addEventListener("beforeunload", function () {
      flushDrafts();
      if (dirty) { createSnapshot("退出前保存"); dirty = false; }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        flushDrafts();
        if (dirty) { createSnapshot("切换后台保存"); dirty = false; }
      }
    });
  }

  function getAutoSaveInfo() {
    return { lastAutoSaveAt: lastAutoSaveAt, dirty: dirty, count: readSnapshots().length };
  }

  /* ===== 事件系统 ===== */
  const listeners = {};
  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }
  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(data));
    }
  }

  /* ===== 公开 API ===== */
  return {
    // 工具
    todayKey,
    dateKey,
    getMonthRange,
    getLastNKeys,
    // 通用
    get,
    set,
    remove,
    // 设置
    getSettings,
    setSettings,
    // 按日期数据
    getDayData,
    setDayData,
    updateDayData,
    getMonthData,
    getRangeData,
    getLastNDays,
    // 列表数据
    getList,
    addToList,
    updateInList,
    removeFromList,
    clearList,
    // 打卡
    toggleCheckin,
    getCheckins,
    // 云端
    initSupabase,
    autoInitSupabase,
    disconnectSupabase,
    fullSync,
    pullFromCloud,
    getSyncStatus,
    isSupabaseConnected,
    updateSyncIndicator,
    // 导入导出
    exportAll,
    importAll,
    getStorageSize,
    // 自动保存 / 版本快照
    startAutoSave,
    createSnapshot,
    listSnapshots,
    restoreSnapshot,
    getAutoSaveInfo,
    flushDrafts,
    registerDraft,
    unregisterDraft,
    getDraft,
    saveDraft,
    clearDraft,
    // 全量枚举（供搜索/导出使用）
    listModules,
    listListKeys,
    // 事件
    on,
    emit,
  };

  /* 枚举本地所有「按日期」模块名 */
  function listModules() {
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("melodi:daily:")) names.push(k.replace("melodi:daily:", ""));
    }
    return names;
  }

  /* 枚举本地所有列表键名 */
  function listListKeys() {
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("melodi:list:")) names.push(k.replace("melodi:list:", ""));
    }
    return names;
  }
})();

// 挂到 window，供其它模块通过 window.MelodiDB 访问（const 声明不会自动挂 window）
window.MelodiDB = MelodiDB;
