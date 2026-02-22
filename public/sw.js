const CACHE_NAME = 'juingobio-pwa-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = ['/', '/index.html', OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

try {
  importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: 'AIzaSyAoyt5CjOfLXiJWko4Y0gA735_EUEZHULo',
    authDomain: 'studio-2853082048-41992.firebaseapp.com',
    projectId: 'studio-2853082048-41992',
    storageBucket: 'studio-2853082048-41992.firebasestorage.app',
    messagingSenderId: '589474614344',
    appId: '1:589474614344:web:74c361b5df7ee49c3fdc7d'
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'JuingoBIO';
    const options = {
      body: payload.notification?.body || 'Nouvelle notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data || {}
    };
    self.registration.showNotification(title, options);
  });
} catch (error) {
  console.warn('Firebase messaging SW init skipped:', error);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
