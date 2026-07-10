// Secure Diary — Service Worker
// Caches the app shell so it works offline after first load.

const CACHE = 'secure-diary-v16';

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
    caches.open(CACHE).then(c =>
      // addAll() fails the whole install if a single resource 404s or a CDN is
      // briefly unreachable — and a failed install means the SW never activates,
      // so the app never gets offline support at all. Cache each file individually
      // and don't let one bad fetch take down the rest of the shell.
      Promise.all(SHELL.map(url =>
        c.add(url).catch(err => console.warn('[sw] shell cache miss:', url, err))
      ))
    ).then(() => self.skipWaiting())
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

  // Navigations and the app HTML itself go network-first: if you ship a fix,
  // people online should actually get it instead of being stuck on whatever
  // was cached at first install. Offline (or a slow/broken network), fall
  // straight back to the cached shell so the app still opens.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(e.request).then(cached => cached || caches.match('/index.html'))
      )
    );
    return;
  }

  // Cache-first for everything else (fonts, MSAL lib, other static assets)
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
        // Network failed and nothing cached for this request. Returning
        // undefined here would make respondWith() throw ("no Response"),
        // which shows up as a console error and can break the calling code's
        // error handling. A real (if useless) Response is safer.
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});