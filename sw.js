const CACHE_NAME = 'financas-v1.0.1'; // Incremente sempre que mudar
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './auth.js',
  './ui.js',
  './style.css',
  './icon.svg',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
    // REGRAS DE EXCLUSÃO (Essenciais para Firebase Auth)
    if (
        event.request.url.includes('google.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firebaseapp.com') ||
        event.request.method !== 'GET'
    ) {
        return; // Deixa o navegador resolver, não o cache
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});
