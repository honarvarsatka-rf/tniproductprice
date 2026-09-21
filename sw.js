// Service Worker — فقط برای نصب‌پذیری و سریع‌تر شدن بارگذاری.
// داده‌های Supabase هرگز کش نمی‌شوند (همیشه از شبکه).
const VERSION = 'v1';
const SHELL = `tni-shell-${VERSION}`;
const LIBS  = `tni-libs-${VERSION}`;
const SHELL_FILES = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, LIBS].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase و هر API دیگر: مستقیم از شبکه
  if(url.hostname.endsWith('supabase.co')) return;

  // کتابخانه‌ها و فونت‌ها: کش‌اول (نسخه‌ها ثابت‌اند)
  if(LIB_HOSTS.includes(url.hostname)){
    e.respondWith(
      caches.open(LIBS).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // فایل‌های خود سایت: شبکه‌اول (تا بعد از هر آپدیت در گیت‌هاب نسخهٔ جدید بیاید)، بدون اینترنت از کش
  if(url.origin === location.origin){
    e.respondWith(
      fetch(req).then(res => {
        if(res && res.ok){ const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
  }
});
