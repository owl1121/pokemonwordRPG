/* Service worker：讓遊戲可以加到主畫面、離線也能開。
   程式檔（html/js）一律「先抓網路，失敗才用快取」，所以推新版玩家重新整理就會拿到，不會卡舊版。
   卡片底圖 art/ 是「有快取就用快取」（圖不太會改；真的改了圖要把 ART_CACHE 版本號加一）。 */
const CORE_CACHE = 'core-v1';
const ART_CACHE = 'art-v1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'data.js', 'moves-data.js', 'poke-data.js', 'mon-art.js', 'mon-colors.js',
  'battle.js', 'features.js', 'moves.js', 'abilities.js', 'gimmicks.js', 'growth.js', 'league.js',
  'extras.js', 'doubles.js', 'dex-text.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE_CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  const keep = [CORE_CACHE, ART_CACHE];
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('test-save.json')) return;            // 測試存檔不快取
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && /\/art\/.+\.webp$/.test(url.pathname)) {      // 底圖：快取優先
    e.respondWith(caches.open(ART_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  // 其他（程式、字型）：網路優先，離線時用快取
  e.respondWith(fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CORE_CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: sameOrigin && req.mode === 'navigate' })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
