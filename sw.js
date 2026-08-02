/* 美乐蒂工作台 Service Worker - 离线缓存 */
const CACHE_NAME = "melodi-workbench-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./widget.html",
  "./manifest.json",
  "./css/theme.css",
  "./css/layout.css",
  "./css/components.css",
  "./js/db.js",
  "./js/charts.js",
  "./js/widget-data.js",
  "./js/sidebar.js",
  "./js/modules/daily.js",
  "./js/modules/growth.js",
  "./js/modules/body.js",
  "./js/app.js",
  "./js/calendar.js",
  "./js/food-vision.js",
  "./js/adhd.js",
  "./js/export.js",
  "./js/modules/study.js",
  "./js/modules/inspiration.js",
  "./js/modules/fortune.js",
  "./assets/icons/icon.svg",
  "./assets/icons/apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",
  "./js/vendor/supabase.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("[SW] 部分资源缓存失败:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 前端可发消息强制跳过等待（立即激活新版本，便于 iOS 点按更新）
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // HTML 导航：网络优先，保证 iOS 每次打开都能拿到最新页面（在线时）
  if (event.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // 静态资源：缓存优先，离线可用
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
