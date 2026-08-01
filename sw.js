/* 美乐蒂工作台 Service Worker - 离线缓存 */
const CACHE_NAME = "melodi-workbench-v7";
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
  "./assets/icons/icon.svg",
  "./assets/icons/apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",
  "https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.45.4/umd/supabase.min.js"
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        });
    })
  );
});
