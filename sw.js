const CACHE = 'agenda-pokemon-v4';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Push do servidor
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '🎴 Agenda Pokémon', {
      body:               data.body || 'Você tem um leilão em breve!',
      icon:               '/icon-192.png',
      badge:              '/icon-192.png',
      tag:                data.tag || 'agenda-pokemon',
      requireInteraction: true,
      data:               { auctionId: data.auctionId, url: data.url || '/' }
    })
  );
});

// Clique na notificação
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const auctionId = e.notification.data && e.notification.data.auctionId;
  const url = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se app já está aberto — manda mensagem para abrir o leilão direto
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          if (auctionId) {
            client.postMessage({ type: 'OPEN_AUCTION', auctionId });
          }
          return client.focus();
        }
      }
      // App fechado — abre com deep link na URL
      const openUrl = auctionId ? `/?leilao=${auctionId}` : url;
      if (clients.openWindow) return clients.openWindow(openUrl);
    })
  );
});
