// Secure Diary — Service Worker
// Caches the app shell so it works offline after first load.

const CACHE = 'secure-diary-v22';

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

  // Navigations and the app HTML itself: previously network-first, meaning every
  // single load — including unlock — sat there waiting on the network even when a
  // perfectly good cached shell was sitting right there. That's the main cause of
  // slow unlock/load. Now: race the network against a short timeout. If the cache
  // already has a copy and the network hasn't answered within that window, serve
  // the cached shell immediately so the app opens right away, then keep the network
  // fetch running in the background to refresh the cache for next time (so people
  // online still get shipped fixes, just without blocking this load on them).
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        }).catch(() => null);

        if (!cached) {
          // Nothing cached yet (first ever load) — have to wait on the network.
          return networkFetch.then(r => r || caches.match('/index.html'));
        }

        // Have a cached copy: give the network a brief window to beat it, but
        // don't block the whole load on a slow/flaky connection.
        return Promise.race([
          networkFetch.then(r => r || cached),
          new Promise(resolve => setTimeout(() => resolve(cached), 800))
        ]);
      })
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