// Secure Diary — Service Worker
// Caches the app shell so it works offline after first load.

const CACHE = 'secure-diary-v8';

// Files to cache on install (the app shell)
const SHELL = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.10.0/lib/msal-browser.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Let OneDrive / Microsoft Graph / MSAL requests go straight to network
  if (
    url.hostname.includes('microsoft') ||
    url.hostname.includes('microsoftonline') ||
    url.hostname.includes('graph.microsoft') ||
    url.hostname.includes('login.live') ||
    url.hostname.includes('live.com')
  ) {
    return; // bypass SW
  }

  // Cache-first for everything else (app shell, fonts, MSAL lib)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // If network fails and it's a navigation, serve index.html
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});