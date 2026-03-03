const CACHE_NAME = 'financas-v0.0.6';
const ASSETS = [
  './',
  './index.html',
  './script.js',
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
  const url = new URL(event.request.url);

  // ESTRATÉGIA: Bypass de Autenticação
  // Ignora qualquer requisição para domínios de login ou scripts do Google
  if (
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.pathname.includes('/__/auth/') ||
      event.request.method !== 'GET'
  ) {
      return; // Deixa o navegador lidar com a rede diretamente
  }

  event.respondWith(
      caches.match(event.request).then((response) => {
          return response || fetch(event.request).catch(() => {
              // Fallback caso esteja offline e não tenha no cache
              console.log("Falha ao buscar recurso offline: " + event.request.url);
          });
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